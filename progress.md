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

- Optional: move `public.screams` to a brand-new Supabase project after freeing/upgrading an active project slot. Creation was attempted on 2026-06-07 and blocked by the account active free-project limit.
- Add Yandex Metrica, Google Analytics, and GSC verification tags later.

## 2026-06-07

- Installed and authenticated Supabase CLI profile `scream-here`.
- Attempted to create a separate Supabase project `scream-here`; Supabase rejected it because the account/organizations are at the active free-project limit.
- Linked the workspace to existing active Supabase project `phoxorscorapbzhhpijl` in `DL Poly`.
- Applied `supabase/schema.sql` to create `public.screams` with RLS enabled.
- Set Railway production variables `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
- Verified production `/api/screams` writes to Supabase with `stored:true`, verified the row via SQL, then removed the test row from `public.screams`.
