import { NextRequest } from "next/server";

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const cfIp = request.headers.get("cf-connecting-ip")?.trim();
  return cfIp ?? forwarded ?? realIp ?? "";
}

function isPublicIp(ip: string) {
  return (
    Boolean(ip) &&
    !ip.startsWith("127.") &&
    !ip.startsWith("10.") &&
    !ip.startsWith("192.168.") &&
    !ip.startsWith("172.16.") &&
    !ip.startsWith("::1") &&
    ip !== "localhost"
  );
}

function countryFromAcceptLanguage(request: NextRequest) {
  const acceptLanguage = request.headers.get("accept-language")?.toLowerCase() ?? "";
  return acceptLanguage.includes("ru") ? "RU" : "US";
}

async function lookupCountryByIp(ip: string) {
  if (!isPublicIp(ip)) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 900);

  try {
    const result = await fetch(`https://ipapi.co/${ip}/country/`, {
      signal: controller.signal,
      cache: "no-store"
    });
    if (!result.ok) {
      return null;
    }
    const country = (await result.text()).trim().toUpperCase();
    return /^[A-Z]{2}$/.test(country) ? country : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request: NextRequest) {
  const headerCountry =
    request.headers.get("cf-ipcountry") ??
    request.headers.get("x-vercel-ip-country") ??
    request.headers.get("x-country-code");

  const ip = getClientIp(request);
  const country = (headerCountry || (await lookupCountryByIp(ip)) || countryFromAcceptLanguage(request)).toUpperCase();
  const language = country === "RU" ? "ru" : "en";

  return Response.json({ country, language });
}
