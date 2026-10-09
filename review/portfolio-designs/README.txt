PORTFOLIO DESIGN REVIEW

Open review.html for the portable comparison, screenshots, research notes, and videos.

For the interactive Vue previews:
  npm run dev
  Open http://localhost:5173/designs

For the production preview:
  npm run build
  npm run preview -- --host 127.0.0.1 --port 4173
  Open http://127.0.0.1:4173/designs

Routes:
  /designs/editorial  Field Notes
  /designs/workbench  Workbench
  /designs/gallery    Gallery
  /designs/index      Personal Index
  /designs/:direction/project/:id  Project writeups

Content:
  src/designs/projects.json is the read-only backend snapshot.
  src/designs/content.js contains the revised names, summaries, and design notes.
  public/design-assets/images contains all cached project images.
  public/design-assets/demos contains captioned H.264 MP4s and WebVTT tracks.

The original website, editor, authentication, and analytics remain at their existing routes.
The previews use static local content and do not edit the production backend.

Reproducing the checks and videos requires Playwright, an available Chromium browser,
ffmpeg, ffprobe, and Python with Pillow. For external browser tooling, set
PLAYWRIGHT_MODULE to its module path and PORTFOLIO_BROWSER to its browser executable.
PORTFOLIO_REVIEW_URL optionally selects a preview URL; it defaults to port 4173.

Commands:
  node scripts/design-review/verify.mjs
  node scripts/design-review/record.mjs
  node scripts/design-review/make-review.mjs

Build again after generating screenshots or videos so Vite copies them into dist.
The portable HTML also reads the files directly from public/design-assets.

Existing work was committed first as c1e04e1.
