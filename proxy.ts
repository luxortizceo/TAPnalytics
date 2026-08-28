import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/onboarding", "/app", "/admin"];

const PUBLIC_HIGH_TRAFFIC_PREFIXES = ["/t/", "/r/"];

// Content-Security-Policy, generated per-request with a fresh nonce (the
// official Next.js pattern: https://nextjs.org/docs/app/guides/content-security-policy).
// This has to live here rather than in next.config.ts's static `headers()`
// because the nonce must be different on every request. Applied to every
// response path below, including the perf-sensitive /t/ and /r/ routes and
// the "Supabase isn't configured yet" fallback — security headers aren't
// worth skipping for either of those.
function buildCsp(nonce: string) {
  const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
    : "";
  // React/Next.js dev mode uses eval() for HMR and dev-only debugging
  // features (stack trace reconstruction) — never in production, where
  // this stays strict. See https://react.dev/link/react-devtools.
  const scriptSrc =
    process.env.NODE_ENV === "production"
      ? `'self' 'nonce-${nonce}' 'strict-dynamic'`
      : `'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval'`;
  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    // Tailwind covers almost all styling, but a few components set a
    // computed inline `style="width: N%"` (progress bars, chart bars — see
    // app/app/dashboard/page.tsx, components/ui/primitives.tsx,
    // components/marketing/hero.tsx). CSP nonces don't cover inline style
    // attributes (only <style> elements), so 'unsafe-inline' here is a
    // deliberate, narrow trade-off — script-src stays strict, which is
    // where the real XSS risk is.
    "style-src 'self' 'unsafe-inline'",
    // Businesses supply an arbitrary logo URL (card.logoUrl, rendered as a
    // plain <img> on the public survey — see app/r/[code]/survey-flow.tsx),
    // so img-src can't be scoped to a fixed set of hosts.
    "img-src 'self' https: data: blob:",
    "font-src 'self'",
    `connect-src 'self'${supabaseOrigin ? ` ${supabaseOrigin}` : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

function withCsp(response: NextResponse, nonce: string) {
  response.headers.set("Content-Security-Policy", buildCsp(nonce));
  return response;
}

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", buildCsp(nonce));

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  // The NFC tap and survey landing are anonymous and performance-critical —
  // skip the Supabase session refresh entirely rather than pay an auth
  // round-trip on every physical tap.
  if (PUBLIC_HIGH_TRAFFIC_PREFIXES.some((p) => request.nextUrl.pathname.startsWith(p))) {
    return withCsp(response, nonce);
  }

  // Supabase isn't configured yet (e.g. local preview before .env.local is
  // filled in) — let public/marketing routes render instead of hard
  // crashing; protected routes still redirect since there's no session to
  // check against.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const pathname = request.nextUrl.pathname;
    const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
    if (isProtected) {
      const redirectUrl = new URL("/login", request.url);
      redirectUrl.searchParams.set("next", pathname);
      return withCsp(NextResponse.redirect(redirectUrl), nonce);
    }
    return withCsp(response, nonce);
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refreshing the session (never trust a stale/expired cookie) — required
  // any time Server Components need auth state without hitting the network.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

  if (isProtected && !user) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("next", pathname);
    return withCsp(NextResponse.redirect(redirectUrl), nonce);
  }

  return withCsp(response, nonce);
}

export const config = {
  matcher: [
    /*
     * Skip static assets and image optimization files so Proxy only runs
     * where auth state actually matters.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
