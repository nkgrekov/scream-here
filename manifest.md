# Scream Here Manifest

## Product

Scream Here is a public web app where visitors can hold a microphone button, scream into the browser, get a live transcription, and receive a short rude/funny response.

## Core Requirements

- First screen is the usable scream interface, not a marketing landing page.
- Browser microphone access with live sound meter and speech-to-text where the browser supports Web Speech API.
- Russian response language for Russian IPs, English response language for other countries.
- SEO/GEO focus around "хочу кричать", "хочешь кричать? кричи здесь", "scream here", "want to scream".
- Supabase-backed scream event storage.
- Railway-ready deployment.
- Public GitHub repository.

## Current Stack

- Next.js App Router
- React
- TypeScript
- Supabase JS service client on server routes
- Geo inference through deployment country headers, short IP lookup fallback, and `Accept-Language`
- Railway Nixpacks deployment

## Current Supabase Target

- Project ref: `phoxorscorapbzhhpijl`
- Table: `public.screams`
- Note: creating a brand-new Supabase project was blocked by the account's active free-project limit, so the app currently uses an existing active Supabase project with a dedicated `public.screams` table.
