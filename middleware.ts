import { type NextRequest, NextResponse } from "next/server";
import {
  getMiddlewareSupabaseConfig,
  updateSession,
} from "./lib/supabase/middleware";

function configurationErrorResponse() {
  return new NextResponse(
    [
      "<!doctype html>",
      "<html><head><title>Configuration required</title></head>",
      "<body style=\"font-family:sans-serif;max-width:40rem;margin:2rem auto;line-height:1.5\">",
      "<h1>Server configuration required</h1>",
      "<p>Add these environment variables in Vercel → Project → Settings → Environment Variables, then redeploy:</p>",
      "<ul>",
      "<li><code>NEXT_PUBLIC_SUPABASE_URL</code></li>",
      "<li><code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code></li>",
      "<li><code>SUPABASE_SERVICE_ROLE_KEY</code></li>",
      "</ul>",
      "</body></html>",
    ].join(""),
    {
      status: 503,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    },
  );
}

export async function middleware(request: NextRequest) {
  if (!getMiddlewareSupabaseConfig()) {
    return configurationErrorResponse();
  }

  try {
    const { supabaseResponse, user } = await updateSession(request);

    const { pathname } = request.nextUrl;
    const isAuthPage =
      pathname === "/sign-in" ||
      pathname === "/sign-up" ||
      pathname === "/forgot-password";

    if (pathname === "/reset-password" && !user) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    if (!user && !isAuthPage) {
      const signInUrl = new URL("/sign-in", request.url);
      signInUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(signInUrl);
    }

    if (user && isAuthPage) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return supabaseResponse;
  } catch (error) {
    if (error instanceof Error && error.message === "MISSING_SUPABASE_ENV") {
      return configurationErrorResponse();
    }

    console.error("Middleware error:", error);
    return configurationErrorResponse();
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
