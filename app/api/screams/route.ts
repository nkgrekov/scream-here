import { NextRequest } from "next/server";
import { createHash } from "crypto";
import { createClient } from "@supabase/supabase-js";

type ScreamInsert = {
  country_code: string | null;
  language: "ru" | "en";
  transcript: string | null;
  response: string;
  peak_volume: number | null;
  duration_ms: number | null;
  user_agent: string | null;
  ip_hash: string | null;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabase() {
  if (!supabaseUrl || !serviceKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false }
  });
}

function getClientIp(request: NextRequest) {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    ""
  );
}

function hashIp(ip: string) {
  if (!ip) {
    return null;
  }
  return createHash("sha256").update(ip).digest("hex");
}

export async function GET() {
  const supabase = getSupabase();
  if (!supabase) {
    return Response.json({ screams: [] });
  }

  const { data, error } = await supabase
    .from("screams")
    .select("id, created_at, country_code, language, transcript, response, peak_volume")
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) {
    return Response.json({ screams: [], error: error.message }, { status: 500 });
  }

  return Response.json({ screams: data ?? [] });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | {
        transcript?: string;
        response?: string;
        language?: "ru" | "en";
        countryCode?: string;
        peakVolume?: number;
        durationMs?: number | null;
      }
    | null;

  if (!body?.response || !body.language) {
    return Response.json({ ok: false, error: "Invalid scream payload" }, { status: 400 });
  }

  const row: ScreamInsert = {
    country_code: body.countryCode?.slice(0, 8).toUpperCase() ?? null,
    language: body.language === "ru" ? "ru" : "en",
    transcript: body.transcript?.slice(0, 500) ?? null,
    response: body.response.slice(0, 280),
    peak_volume: typeof body.peakVolume === "number" ? body.peakVolume : null,
    duration_ms: typeof body.durationMs === "number" ? Math.min(body.durationMs, 120000) : null,
    user_agent: request.headers.get("user-agent"),
    ip_hash: hashIp(getClientIp(request))
  };

  const supabase = getSupabase();
  if (!supabase) {
    return Response.json({ ok: true, stored: false });
  }

  const { error } = await supabase.from("screams").insert(row);
  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true, stored: true });
}
