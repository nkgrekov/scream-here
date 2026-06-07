# Architecture

## Application

The app is a Next.js App Router project. The main UI lives in `app/page.tsx`, global styling is in `app/globals.css`, and server endpoints live under `app/api`.

## Runtime Flow

1. Client loads `/` and calls `/api/geo`.
2. `/api/geo` reads country headers (`cf-ipcountry`, `x-vercel-ip-country`, `x-country-code`). If absent, it tries a short `ipapi.co` IP lookup, then falls back to `Accept-Language`. `RU` selects Russian UI responses; everything else selects English.
3. Client asks for microphone access when the user presses the central scream button.
4. Browser audio analyser drives the visible sound meter.
5. Web Speech API captures interim/final transcription when supported. The client keeps final and interim recognition refs so delayed browser results can still be used after stop, but browser Web Speech errors are not shown as technical UI copy.
6. The client also records the microphone stream with `MediaRecorder`. On stop, if Web Speech did not produce text, the recorded audio is decoded in the browser and transcribed locally with the open-source `@xenova/transformers` automatic-speech-recognition pipeline using multilingual `Xenova/whisper-tiny`. Transformers.js is loaded as a browser-only CDN module so the Next/Railway build does not bundle the full inference runtime.
7. On stop, the client chooses a response phrase and posts event metadata to `/api/screams`. If neither recognizer returns text, the UI shows an unclear-speech state and the event is stored with `transcript = NULL` instead of a fake scream string.
8. `/api/screams` stores the event in Supabase when `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are configured.

## Database

The Supabase table is `public.screams`, defined in `supabase/schema.sql` and applied to project `phoxorscorapbzhhpijl`.

RLS is enabled. Public browser clients do not write directly to Supabase; writes happen through the server route with the service role key. Anonymous read policy allows recent public scream rows if the table is exposed through the Supabase Data API, but the app currently reads recent rows through the server route as well.

Creating a brand-new Supabase project was attempted on 2026-06-07 but blocked by the account's active free-project limit. The current deployment uses an existing active Supabase project with a dedicated `public.screams` table. If a separate project slot becomes available, the same SQL schema can be applied there and Railway only needs `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` updated.

## Deployment

Railway builds with Nixpacks and runs `npm start`. `railway.json` defines `/api/health` as the health check. Required production variables:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Production Railway currently has the Supabase URL and service-role key configured for project `phoxorscorapbzhhpijl`.
