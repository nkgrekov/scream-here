# Progress

## 2026-06-06

- Initialized an empty repository as a Next.js App Router project.
- Added Railway deployment configuration.
- Added Supabase schema plan for `public.screams`.
- Built the first version of the scream interface with microphone capture, sound meter, Web Speech API transcription, geo language detection, SEO metadata, sitemap, robots, and server event logging.
- Verified production build with `npm run build`.
- Verified local production UI on Chrome at desktop and mobile widths; fixed hydration mismatch, mobile mic-button text fit, and favicon 404.
- Created public GitHub repository: `https://github.com/nkgrekov/scream-here`.
- Created Railway project/service `scream-here` and deployed production site: `https://scream-here-production.up.railway.app`.
- Fixed Railway standalone startup by binding to `0.0.0.0` and copying `.next/static` into the standalone runtime before launch.
- Verified external production site: home page 200, `/api/health` ok, `robots.txt` and `sitemap.xml` use the Railway domain, no home-page 404/console errors, no desktop/mobile horizontal overflow.

## Open Items

- Create and connect the actual Supabase project once Supabase credentials/tools are available; the Supabase MCP tools and CLI credentials were not available in this workspace.
- Add Yandex Metrica, Google Analytics, and GSC verification tags later.
