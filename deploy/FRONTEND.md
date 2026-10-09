# Portfolio frontend

The public homepage uses the approved portfolio design, with project pages at
`/project/:id`. These pages fetch the current projects from `/api/projects/list`.
The bundled snapshot lets the page render while that request is in progress and
provides a fallback if the API is unavailable. Edited titles, summaries, images,
and writeups take precedence over the snapshot.

The editing tools are at `/editor` and `/editor/project/:id`, using the existing
passkey login. Analytics remain at `/analytics`. Editor routes are excluded from
visitor analytics.

The theme switch follows the system preference until the visitor chooses a mode.
That choice is saved under `portfolio-theme` in local storage, applies to project
pages, and stays in sync between tabs.

## Build and check

Run `npm run build`, then serve the build on port 4173 with `npm run preview`.
`scripts/test-portfolio-browser.mjs` checks both themes at four widths, navigation,
project updates, editor access, and preference persistence. It uses the browser
configuration in `scripts/design-review/browser.mjs`. Set `PLAYWRIGHT_MODULE` and
`PORTFOLIO_BROWSER` when the browser dependencies are outside this repository.

Run `scripts/test-analytics-browser.cjs` against the development server on port
5173 for the existing analytics checks.

## Deployment

The SSH host is `events`. Nginx serves `/home/ubuntu/portfolio/dist` for
`https://mattlack.com` and proxies `/api/` to the existing service on port 8081.
This frontend deployment does not require changing or restarting that service.

Upload the completed build into `/home/ubuntu/portfolio/releases/<commit>`.
Before publishing, copy the current `dist` directory into
`/home/ubuntu/portfolio/releases/<commit>-previous`.

Copy the new release files into `dist`, excluding `index.html`, and retain old
hashed assets. Publish `index.html` last with an atomic rename. This keeps the
current frontend usable during the upload and leaves assets available to visitors
with an older page open. Do not replace the server's Git checkout, which contains
local backend work.

To roll back, copy the previous release's assets into `dist`, then atomically
replace `dist/index.html` with its saved copy. Nginx does not need a reload for
either operation.

After publishing, run `scripts/test-portfolio-browser.mjs --live` with
`PORTFOLIO_REVIEW_URL=https://mattlack.com`, and check that the public HTML matches
the deployed build. The live browser check reads project data and tests navigation
without writing project data or signing in.
