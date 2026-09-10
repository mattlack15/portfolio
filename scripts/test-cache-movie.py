import hashlib
import importlib.util
import os
from pathlib import Path
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.request import Request, urlopen
from urllib.error import HTTPError

spec = importlib.util.spec_from_file_location('cache', Path(__file__).with_name('cache-movie.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class CacheTest(unittest.TestCase):
    def test_resume_offline_and_http_ranges(self):
        data = bytes(range(256)) * 41
        calls = []
        fail = {1}
        class Source(BaseHTTPRequestHandler):
            def log_message(self, *_): pass
            def do_GET(self):
                start, end = map(int, self.headers['Range'][6:].split('-'))
                calls.append((start, end))
                self.send_response(206)
                self.send_header('Content-Range', f'bytes {start}-{end}/{len(data)}')
                self.end_headers()
                self.wfile.write(data[start:start+10] if start // 1024 in fail else data[start:end+1])
        source = ThreadingHTTPServer(('127.0.0.1', 0), Source)
        threading.Thread(target=source.serve_forever, daemon=True).start()
        with tempfile.TemporaryDirectory() as directory:
            args = (directory, len(data), hashlib.sha256(data).hexdigest(), 'secret',
                    f'http://127.0.0.1:{source.server_port}/movie', 1024)
            cache = module.MovieCache(*args)
            cache.ensure(0)
            with self.assertRaises(ValueError):
                cache.ensure(1)
            self.assertNotIn(1, cache.ready)
            self.assertFalse((Path(directory)/'1.sha256').exists())
            fail.clear()
            cache.ensure(5)
            cache.ensure(5)
            self.assertEqual(len(calls), 3)
            os.close(cache.fd)
            cache = module.MovieCache(*args)
            self.assertEqual(cache.ready, {0, 5})
            cache.download()
            self.assertTrue(cache.complete)
            self.assertEqual(len(calls), cache.count + 1)
            self.assertEqual((Path(directory)/'avatar.mp4').read_bytes(), data)
            source.shutdown()
            source.server_close()
            os.close(cache.fd)
            cache = module.MovieCache(*args)
            cache.download()  # Must finish without any source connection.
            self.assertTrue(cache.complete)
            server = ThreadingHTTPServer(('127.0.0.1', 0), module.make_handler(cache, b'Watch'))
            threading.Thread(target=server.serve_forever, daemon=True).start()
            base = f'http://127.0.0.1:{server.server_port}'
            def request(path, headers=None, method='GET', body=None):
                try:
                    r = urlopen(Request(base+path, headers=headers or {}, method=method, data=body))
                except HTTPError as e:
                    r = e
                return r.status, r.headers, r.read()
            self.assertEqual(request('/watch/movie.mp4')[0], 401)
            auth = {'Cookie': 'watch_session=secret'}
            self.assertEqual(request('/watch/movie.mp4', auth)[2], data)
            for value, expected in [('bytes=1010-2050', data[1010:2051]), ('bytes=-20', data[-20:]), ('bytes=10000-', data[10000:])]:
                code, headers, body = request('/watch/movie.mp4', {**auth, 'Range': value})
                self.assertEqual(code, 206)
                self.assertEqual(body, expected)
            for value in ['bytes=-0', 'bytes=999999-', 'bytes=2-1', 'bytes=0-1,3-4']:
                self.assertEqual(request('/watch/movie.mp4', {**auth, 'Range': value})[0], 416)
            self.assertEqual(request('/watch/movie.mp4', auth, 'HEAD')[1]['Content-Length'], str(len(data)))
            self.assertEqual(request('/watch/session', {'Origin': 'https://watch.mattlack.com'}, 'POST', b'secret')[0], 204)
            self.assertEqual(request('/watch/session', {'Origin': 'https://bad.example'}, 'POST', b'secret')[0], 403)
            self.assertEqual(request('/watch/status')[0], 401)
            self.assertEqual(request('/watch/../identity.json', auth)[0], 404)
            server.shutdown()
            server.server_close()
            os.close(cache.fd)
            # A damaged committed chunk must not be considered ready on restart.
            with (Path(directory)/'avatar.mp4').open('r+b') as out:
                out.write(b'broken')
            cache = module.MovieCache(*args)
            self.assertNotIn(0, cache.ready)
            os.close(cache.fd)


if __name__ == '__main__':
    unittest.main()
