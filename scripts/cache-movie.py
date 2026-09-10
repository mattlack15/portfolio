#!/usr/bin/env python3
"""Persistent, resumable single-movie cache. No eviction or automatic deletion."""
import hashlib
import hmac
import json
import os
from pathlib import Path
import re
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.request import Request, urlopen


class MovieCache:
    def __init__(self, directory, size, digest, token, upstream, chunk_size=2*1024*1024):
        self.directory = Path(directory)
        self.directory.mkdir(parents=True, exist_ok=True, mode=0o700)
        self.size, self.digest, self.token = size, digest, token
        self.upstream, self.chunk_size = upstream, chunk_size
        identity = {'size': size, 'sha256': digest, 'chunk_size': chunk_size}
        manifest = self.directory / 'identity.json'
        if manifest.exists() and json.loads(manifest.read_text()) != identity:
            raise ValueError('Cache belongs to a different movie; use a new directory')
        manifest.write_text(json.dumps(identity))
        self.fd = os.open(self.directory / 'avatar.mp4', os.O_RDWR | os.O_CREAT, 0o600)
        self.count = (size + chunk_size - 1) // chunk_size
        self.ready = set()
        # Verify committed chunks after restart; never trust a sparse file's length.
        for i in range(self.count):
            marker = self.directory / f'{i}.sha256'
            if marker.exists():
                data = os.pread(self.fd, self.length(i), i * chunk_size)
                if len(data) == self.length(i) and hashlib.sha256(data).hexdigest() == marker.read_text():
                    self.ready.add(i)
        self.lock = threading.Lock()
        self.waiters = 0
        self.complete = False
        self.error = None

    def length(self, i):
        return min(self.chunk_size, self.size - i * self.chunk_size)

    def ensure(self, i, foreground=True):
        if i in self.ready:
            return
        if foreground:
            self.waiters += 1
        try:
            with self.lock:
                if i in self.ready:
                    return
                start = i * self.chunk_size
                end = start + self.length(i) - 1
                req = Request(self.upstream, headers={
                    'Cookie': 'watch_session=' + self.token,
                    'Range': f'bytes={start}-{end}',
                })
                with urlopen(req, timeout=30) as response:
                    if response.status != 206 or response.headers.get('Content-Range') != f'bytes {start}-{end}/{self.size}':
                        raise ValueError('Source range or size changed')
                    data = response.read(self.length(i) + 1)
                if len(data) != self.length(i):
                    raise ValueError('Incomplete source chunk')
                written = 0
                while written < len(data):
                    n = os.pwrite(self.fd, data[written:], start + written)
                    if n <= 0:
                        raise OSError('Could not write movie data')
                    written += n
                os.fsync(self.fd)
                marker = self.directory / f'{i}.sha256'
                temporary = marker.with_suffix('.pending')
                with temporary.open('w') as out:
                    out.write(hashlib.sha256(data).hexdigest())
                    out.flush()
                    os.fsync(out.fileno())
                os.replace(temporary, marker)
                self.ready.add(i)
                self.error = None
        finally:
            if foreground:
                self.waiters -= 1

    def download(self):
        while not self.complete:
            try:
                for i in range(self.count):
                    if i in self.ready:
                        continue
                    while self.waiters:
                        time.sleep(0.05)
                    self.ensure(i, foreground=False)
                    time.sleep(0.02)
                digest = hashlib.sha256()
                for i in range(self.count):
                    digest.update(os.pread(self.fd, self.length(i), i * self.chunk_size))
                if digest.hexdigest() != self.digest:
                    self.error = 'Source checksum mismatch; operator attention required'
                    return
                self.complete = True
                (self.directory / 'complete.json').write_text(json.dumps({'sha256': self.digest, 'size': self.size}))
                print('Download complete; full SHA-256 verified. Mac no longer needed.', flush=True)
            except Exception as error:
                self.error = str(error)
                time.sleep(5)

    def status(self):
        downloaded = sum(self.length(i) for i in self.ready.copy())
        return {'downloaded': downloaded, 'size': self.size, 'complete': self.complete,
                'percent': round(downloaded * 100 / self.size, 1),
                'state': 'complete' if self.complete else ('waiting' if self.error else 'downloading')}


def make_handler(cache, page):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_):
            pass

        def reply(self, code, body=b'', headers=None):
            self.send_response(code)
            for k, v in {'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
                         'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow',
                         'Content-Length': str(len(body)), **(headers or {})}.items():
                self.send_header(k, v)
            self.end_headers()
            if self.command != 'HEAD':
                self.wfile.write(body)

        def authorized(self):
            cookie = next((c.strip()[14:] for c in self.headers.get('Cookie', '').split(';')
                           if c.strip().startswith('watch_session=')), '')
            return hmac.compare_digest(cookie.encode(), cache.token.encode())

        def do_POST(self):
            if self.path != '/watch/session':
                return self.reply(404)
            if self.headers.get('Origin') != 'https://watch.mattlack.com':
                return self.reply(403)
            try:
                length = int(self.headers.get('Content-Length', '-1'))
            except ValueError:
                return self.reply(400)
            if not 0 <= length <= 256:
                return self.reply(413)
            self.connection.settimeout(10)
            if not hmac.compare_digest(self.rfile.read(length), cache.token.encode()):
                return self.reply(401)
            self.reply(204, headers={'Set-Cookie': f'watch_session={cache.token}; HttpOnly; Secure; SameSite=Strict; Path=/watch/; Max-Age=43200'})

        def do_HEAD(self):
            self.do_GET()

        def do_GET(self):
            if self.path == '/watch/':
                return self.reply(200, page, {'Content-Type': 'text/html; charset=utf-8',
                    'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; media-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"})
            if not self.authorized():
                return self.reply(401)
            if self.path == '/watch/status':
                return self.reply(200, json.dumps(cache.status()).encode(), {'Content-Type': 'application/json'})
            if self.path != '/watch/movie.mp4':
                return self.reply(404)
            start, end, code = 0, cache.size - 1, 200
            value = self.headers.get('Range')
            if value:
                match = re.fullmatch(r'bytes=(\d*)-(\d*)', value)
                try:
                    if not match or not any(match.groups()):
                        raise ValueError()
                    a, b = match.groups()
                    if a:
                        start = int(a)
                        end = min(int(b), end) if b else end
                    else:
                        if int(b) <= 0:
                            raise ValueError()
                        start = max(0, cache.size - int(b))
                    if start > end or start >= cache.size:
                        raise ValueError()
                except ValueError:
                    return self.reply(416, headers={'Content-Range': f'bytes */{cache.size}'})
                code = 206
            headers = {'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes', 'Content-Length': str(end-start+1)}
            if code == 206:
                headers['Content-Range'] = f'bytes {start}-{end}/{cache.size}'
            if self.command == 'HEAD':
                return self.reply(code, headers=headers)
            try:
                cache.ensure(start // cache.chunk_size)
            except Exception:
                return self.reply(503, b'This portion is not saved yet. Waiting for the Mac.', {'Retry-After': '5'})
            self.send_response(code)
            for k, v in {**headers, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff'}.items():
                self.send_header(k, v)
            self.end_headers()
            try:
                while start <= end:
                    i = start // cache.chunk_size
                    cache.ensure(i)
                    length = min(end-start+1, (i+1)*cache.chunk_size-start)
                    data = os.pread(cache.fd, length, start)
                    if len(data) != length:
                        raise OSError('Short cache read')
                    self.wfile.write(data)
                    start += length
            except Exception:
                self.close_connection = True
    return Handler


if __name__ == '__main__':
    os.umask(0o077)
    config = json.loads(Path(os.environ['MOVIE_CACHE_CONFIG']).read_text())
    cache = MovieCache(config['directory'], config['size'], config['sha256'], config['token'],
                       config.get('upstream', 'http://127.0.0.1:18765/watch/movie.mp4'))
    page = (Path(__file__).resolve().parent.parent / 'public/watch/index.html').read_bytes()
    threading.Thread(target=cache.download, daemon=True).start()
    server = ThreadingHTTPServer(('127.0.0.1', config.get('port', 18766)), make_handler(cache, page))
    server.daemon_threads = True
    server.serve_forever()
