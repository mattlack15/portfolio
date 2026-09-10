# Private movie streaming

The VPS relays a single file from the Mac over a loopback-only reverse SSH
forward. Video is never added to Git or uploaded in full to the VPS. The existing
portfolio Java backend is not involved.

## Start on the Mac

```sh
node scripts/stream-movie.mjs "$HOME/Documents/avatar.mp4"
```

Keep this running, or use a launchctl job. SSH reconnects after interruptions.
The process runs `caffeinate -i` while streaming. Keep the Mac connected to power
and the internet, with the lid open. H.264/AAC MP4 is supported by normal browsers.

The link is `https://watch.mattlack.com/watch/#TOKEN`, with TOKEN read from
`~/.local/state/portfolio-stream/token`. Treat this link as a password.
The fragment is exchanged for a secure HttpOnly cookie and removed from the
address bar. Page and media responses are not cached. No directory is exposed.

For the job created during setup:

```sh
launchctl remove com.mattlack.portfolio-stream
```

To restart in the background (absolute paths are intentional):

```sh
launchctl submit -l com.mattlack.portfolio-stream \
  -o "$HOME/.local/state/portfolio-stream/stream.log" \
  -e "$HOME/.local/state/portfolio-stream/stream-error.log" -- \
  /opt/homebrew/bin/node "$HOME/IdeaProjects/portfolio/scripts/stream-movie.mjs" \
  "$HOME/Documents/avatar.mp4"
```

To revoke existing links and cookies, stop the job, remove
`~/.local/state/portfolio-stream/token`, and restart. Restarting without removing
the token preserves the link. The launchctl job is not installed for future logins.

## VPS

Add a DNS-only A record `watch` pointing to the VPS. Keep the portfolio domain's
Cloudflare proxy unchanged. Issue a Let's Encrypt certificate using a port 80
webroot challenge, then install `deploy/watch.nginx.conf` in Nginx sites-enabled.
Validate with `sudo nginx -t` before reloading.

The main portfolio virtual host can redirect `/watch` and `/watch/` to
`https://watch.mattlack.com/watch/`. Browsers retain sharing-link fragments across
this redirect. The dedicated virtual host is required so movie traffic goes
directly to the VPS rather than through Cloudflare's website proxy.

Server port 18765 must remain loopback-only. The local server validates the
sharing token for both media GET and HEAD requests and supports single byte
ranges, including suffix and open-ended ranges, for seeking.
