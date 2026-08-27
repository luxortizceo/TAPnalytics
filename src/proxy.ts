import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/onboarding", "/app", "/admin"];

const PUBLIC_HIGH_TRAFFIC_PREFIXES = ["/t/", "/r/"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  // The NFC tap and survey landing are anonymous and performance-critical —
  // skip the Supabase session refresh entirely rather than pay an auth
  // round-trip on every physical tap.
  if (PUBLIC_HIGH_TRAFFIC_PREFIXES.some((p) => request.nextUrl.pathname.startsWith(p))) {
    return response;
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
      return NextResponse.redirect(redirectUrl);
    }
    return response;
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
          response = NextResponse.next({ request });
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
    return NextResponse.redirect(redirectUrl);
  }

  return response;
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
