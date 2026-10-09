#!/usr/bin/env python3
"""Save one movie on the VPS while letting a browser watch it immediately.

Data path:
    Mac MP4 -> SSH tunnel (VPS port 18765) -> this service -> Nginx -> browser
                                           |
                                           +-> avatar.mp4 on the VPS

Two kinds of work share MovieCache:
* A background thread downloads all missing 2 MiB pieces ("chunks").
* Browser request threads read saved pieces, fetching missing ones as needed.

Each completed chunk gets a checksum marker. After a restart we check those
markers against the file, so interrupted writes are never mistaken for saved
video. Once every chunk is saved, we verify the whole movie against the original
SHA-256 fingerprint. Nothing here expires or automatically deletes the movie.
"""
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
    # Owns the on-disk movie and the shared download bookkeeping.
    def __init__(self, directory, size, digest, token, upstream, chunk_size=2*1024*1024):
        self.directory = Path(directory)
        self.directory.mkdir(parents=True, exist_ok=True, mode=0o700)
        self.size, self.digest, self.token = size, digest, token
        self.upstream, self.chunk_size = upstream, chunk_size
        # Refuse to mix pieces from different movies in the same directory.
        identity = {'size': size, 'sha256': digest, 'chunk_size': chunk_size}
        manifest = self.directory / 'identity.json'
        if manifest.exists() and json.loads(manifest.read_text()) != identity:
            raise ValueError('Cache belongs to a different movie; use a new directory')
        manifest.write_text(json.dumps(identity))
        # Open without truncating: keep existing data when the service restarts.
        # fd is a file descriptor used for reads/writes at explicit byte offsets.
        self.fd = os.open(self.directory / 'avatar.mp4', os.O_RDWR | os.O_CREAT, 0o600)
        self.count = (size + chunk_size - 1) // chunk_size
        self.ready = set()
        # Seeking ahead can write the end before the middle, leaving holes in the
        # file. Its apparent size therefore does NOT tell us how much is saved.
        # Only chunks whose bytes match their saved checksum enter `ready`.
        for i in range(self.count):
            marker = self.directory / f'{i}.sha256'
            if marker.exists():
                data = os.pread(self.fd, self.length(i), i * chunk_size)
                if len(data) == self.length(i) and hashlib.sha256(data).hexdigest() == marker.read_text():
                    self.ready.add(i)
        # Serialize downloads so simultaneous viewers do not fetch a chunk twice.
        self.lock = threading.Lock()
        # Browser requests waiting for data take priority over background work.
        self.waiters = 0
        self.complete = False
        self.error = None

    def length(self, i):
        # Chunk indexes start at zero; the last chunk may be smaller than 2 MiB.
        return min(self.chunk_size, self.size - i * self.chunk_size)

    def ensure(self, i, foreground=True):
        """Return only when chunk i is saved, or raise if fetching/saving fails."""
        if i in self.ready:
            return
        if foreground:
            self.waiters += 1
        try:
            with self.lock:
                # Another request may have saved this chunk while we waited.
                if i in self.ready:
                    return
                start = i * self.chunk_size
                end = start + self.length(i) - 1
                # Ask the Mac for just this byte interval, through the SSH tunnel.
                # The source uses the same private token as the watch page.
                req = Request(self.upstream, headers={
                    'Cookie': 'watch_session=' + self.token,
                    'Range': f'bytes={start}-{end}',
                })
                # HTTP 206 means partial content. Check the exact interval and
                # total size before accepting bytes into our permanent copy.
                with urlopen(req, timeout=30) as response:
                    if response.status != 206 or response.headers.get('Content-Range') != f'bytes {start}-{end}/{self.size}':
                        raise ValueError('Source range or size changed')
                    # One extra byte detects a source sending more than requested.
                    data = response.read(self.length(i) + 1)
                if len(data) != self.length(i):
                    raise ValueError('Incomplete source chunk')
                # pwrite writes at an explicit offset without moving a shared file
                # cursor, so viewers can read other saved chunks concurrently.
                # A write may be short; keep writing until the whole chunk is saved.
                written = 0
                while written < len(data):
                    n = os.pwrite(self.fd, data[written:], start + written)
                    if n <= 0:
                        raise OSError('Could not write movie data')
                    written += n
                # Flush movie bytes before publishing a checksum marker. A crash
                # before that marker exists simply makes us download this chunk again.
                os.fsync(self.fd)
                marker = self.directory / f'{i}.sha256'
                temporary = marker.with_suffix('.pending')
                with temporary.open('w') as out:
                    out.write(hashlib.sha256(data).hexdigest())
                    out.flush()
                    os.fsync(out.fileno())
                # Atomic rename prevents startup from seeing a half-written marker.
                os.replace(temporary, marker)
                self.ready.add(i)
                self.error = None
        finally:
            if foreground:
                self.waiters -= 1

    def download(self):
        """Fill in missing chunks, retrying after source/network interruptions."""
        while not self.complete:
            try:
                for i in range(self.count):
                    if i in self.ready:
                        continue
                    # Yield between chunks when a viewer needs an uncached portion.
                    # An already-running chunk download is allowed to finish.
                    while self.waiters:
                        time.sleep(0.05)
                    self.ensure(i, foreground=False)
                    time.sleep(0.02)
                # Chunk checksums protect saved pieces across restarts. This final
                # fingerprint also checks that the entire copy matches the original.
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
                # Keep everything already saved; retry missing pieces in five seconds.
                self.error = str(error)
                time.sleep(5)

    def status(self):
        # Count verified pieces, not the file size (which may include empty holes).
        # Copy the set because other threads may add newly saved pieces.
        downloaded = sum(self.length(i) for i in self.ready.copy())
        return {'downloaded': downloaded, 'size': self.size, 'complete': self.complete,
                'percent': round(downloaded * 100 / self.size, 1),
                'state': 'complete' if self.complete else ('waiting' if self.error else 'downloading')}


def make_handler(cache, page):
    # This factory lets every HTTP request handler share one cache and page.
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_):
            # Disable the standard per-request access log.
            pass

        def reply(self, code, body=b'', headers=None):
            # Common responses and privacy headers. `no-store` applies to HTTP
            # clients/proxies; it does not prevent our own permanent disk copy.
            self.send_response(code)
            for k, v in {'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
                         'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow',
                         'Content-Length': str(len(body)), **(headers or {})}.items():
                self.send_header(k, v)
            self.end_headers()
            if self.command != 'HEAD':
                self.wfile.write(body)

        def authorized(self):
            # Read the cookie installed by /watch/session. Constant-time comparison
            # avoids leaking how many characters of a guessed token matched.
            cookie = next((c.strip()[14:] for c in self.headers.get('Cookie', '').split(';')
                           if c.strip().startswith('watch_session=')), '')
            return hmac.compare_digest(cookie.encode(), cache.token.encode())

        def do_POST(self):
            # The page reads the secret from the sharing URL fragment (#...), then
            # POSTs it here. URL fragments are not sent in normal HTTP requests.
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
            # HttpOnly hides the cookie from JavaScript; Secure requires HTTPS.
            # The 12-hour cookie lifetime affects access, not movie retention.
            self.reply(204, headers={'Set-Cookie': f'watch_session={cache.token}; HttpOnly; Secure; SameSite=Strict; Path=/watch/; Max-Age=43200'})

        def do_HEAD(self):
            # HEAD returns the same metadata as GET, but no video bytes.
            self.do_GET()

        def do_GET(self):
            if self.path == '/watch/':
                return self.reply(200, page, {'Content-Type': 'text/html; charset=utf-8',
                    'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; media-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"})
            # The page shell is public; movie data and download status require access.
            if not self.authorized():
                return self.reply(401)
            if self.path == '/watch/status':
                return self.reply(200, json.dumps(cache.status()).encode(), {'Content-Type': 'application/json'})
            if self.path != '/watch/movie.mp4':
                return self.reply(404)
            # Browsers seek by requesting byte ranges rather than timestamps.
            # Support bytes=100-200, bytes=100- (to EOF), and bytes=-100 (last 100).
            # Both interval endpoints are inclusive. Multiple ranges are rejected.
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
            # Fetch the first required chunk before sending success headers, so
            # we can still return a useful 503 if that portion is unavailable.
            try:
                cache.ensure(start // cache.chunk_size)
            except Exception:
                return self.reply(503, b'This portion is not saved yet. Waiting for the Mac.', {'Retry-After': '5'})
            self.send_response(code)
            for k, v in {**headers, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff'}.items():
                self.send_header(k, v)
            self.end_headers()
            try:
                # Send only committed data, one chunk at a time. This also bounds
                # memory use instead of reading the whole movie into RAM.
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
                # Headers are already sent, so we cannot change the HTTP status.
                # Close the incomplete response; the player can retry the request.
                self.close_connection = True
    return Handler


if __name__ == '__main__':
    # systemd supplies MOVIE_CACHE_CONFIG; secrets and movie data stay outside Git.
    os.umask(0o077)
    config = json.loads(Path(os.environ['MOVIE_CACHE_CONFIG']).read_text())
    cache = MovieCache(config['directory'], config['size'], config['sha256'], config['token'],
                       config.get('upstream', 'http://127.0.0.1:18765/watch/movie.mp4'))
    page = (Path(__file__).resolve().parent.parent / 'public/watch/index.html').read_bytes()
    # Keep downloading even if nobody is watching. Daemon threads end when this
    # process exits; saved chunks allow the next process to resume the work.
    threading.Thread(target=cache.download, daemon=True).start()
    # Listen only on loopback. Nginx handles public HTTPS and forwards here;
    # each incoming request gets its own thread so viewers can read concurrently.
    server = ThreadingHTTPServer(('127.0.0.1', config.get('port', 18766)), make_handler(cache, page))
    server.daemon_threads = True
    server.serve_forever()
