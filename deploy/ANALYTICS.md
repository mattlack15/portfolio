Analytics is at `/analytics`, behind the existing editor passkey. Use Edit in the footer to sign in, then select Analytics in the header.

The dashboard records new browser activity after deployment. Visits use a browser-generated session ID renewed after 30 minutes of inactivity. Visitors use a random ID saved in localStorage, so different browsers or cleared storage count separately. Date ranges follow the dashboard viewer's timezone. Daily visit counts count sessions active on that date; a session spanning midnight can appear on both days, while the period total counts it once.

Page views include initial loads and Vue route changes. Clicks include links, buttons, and project image/title/description navigation. Dashboard and signed-in editor activity are excluded, as are browsers with Do Not Track or Global Privacy Control enabled and obvious bots. JavaScript blockers can prevent collection.

IP lookup uses a local DB-IP Lite city database. IPs are used in memory for lookup and a one-minute rate limit; analytics stores the approximate city, region, and country, not the IP. Existing nginx access logging is independent. Location data can be wrong, particularly for VPNs and mobile networks. Referrers retain only hostnames; tracked URLs omit queries. MongoDB expires events after 90 days. The selected range is shown with calendar dates and remembered on this browser.

From `api/`, run `bash ../scripts/update-analytics-geo.sh` to download the current monthly database, then restart `portfolio-api`. The optional argument is a release month such as `2026-10`. The data is licensed CC BY 4.0 and the dashboard links to https://db-ip.com as required. The API also accepts `ANALYTICS_GEO_DB` for a custom database path through Spring's relaxed environment binding.

Build with `npm run build` and `cd api && ./gradlew test bootJar`. On a machine with local MongoDB, run `ANALYTICS_TEST_MONGO=true ./gradlew test --rerun-tasks`; the integration test creates and drops a uniquely named test database. The browser check uses the preview build on port 4173 and Playwright: `node scripts/test-analytics-browser.cjs`. Set `PLAYWRIGHT_MODULE` and `CHROMIUM_PATH` if using a bundled browser runtime. All dashboard fixtures and test credentials remain confined to intercepted local test requests.

The API runs with `deploy/portfolio-api.service`, listening only on loopback port 8081. Nginx overwrites X-Real-IP, and the API trusts that header only from loopback. Summary responses require a valid passkey session and use Cache-Control: no-store. Public collection requires an allowed Origin, bounded fields, UUID identifiers, and a rate limit of 120 events per IP per minute. The MongoDB event ID makes retransmission idempotent. Existing sessions are in memory and expire on API restart.

Production builds use `.env.production` to override the developer's localhost API URL with same-origin requests. Nginx includes `portfolio-cloudflare-real-ip.conf` only in the mattlack.com HTTPS server block, restoring CF-Connecting-IP only for Cloudflare's published proxy ranges. Refresh those ranges if Cloudflare changes them, then validate with `nginx -t` and reload nginx.


Activity is read separately from `/api/analytics/activity`. It supports `days`,
`timezone`, `q` (literal, case-insensitive text, including project titles), `type` (`pageview` or `click`),
`country`, exact `path` and `referrer`, `order` (`newest` or `oldest`), and `limit`
(1 to 100, default 50). Blank filters include all entries; `__unknown__` selects
unknown countries and `__direct__` selects direct referrers. A response includes
`items`, `total`, `nextCursor`, `asOf`, and `timezone`. Pass `nextCursor` back as
`cursor` until it is null. The cursor anchors the time window to the first page
and uses the event timestamp plus ID to avoid losing equal-time events. Refresh
starts a new snapshot so newly arrived events appear.

The activity list loads another page near the bottom, with a Load more button as
a keyboard and browser fallback. Search and filters apply to activity, while the
overview always describes the selected date range. Clicking a summary table row
filters the activity list. Changing the date range keeps the current activity
filters. Summary responses include the full list of countries in the range.

Click tracking uses stable `data-analytics-label` and `data-analytics-target`
attributes for public controls, so browser translation does not change these
labels. Known older English and Chinese filter targets are normalized when read
and when collected. The stored historical records are left intact; other
non-English text is preserved. Location country is not used to classify bots.

Run `scripts/test-analytics-activity.mjs` against the preview build on port 4173
for paging, filters, search cancellation, loading failures, mobile rendering, date
preference, and expired-session checks. All API requests in that check are mocked.
`scripts/test-analytics-browser.cjs` additionally checks that translating a filter's
visible text does not translate the recorded label. Both accept
`PORTFOLIO_REVIEW_URL` for a different base URL.

Changes to the analytics API require replacing its built JAR and restarting
`portfolio-api`, which invalidates the in-memory editor sessions. Keep a backup
of the running JAR and deploy the API before the frontend. Do not overwrite the
server's source checkout or its configuration. Frontend publishing is described
in `FRONTEND.md`.
