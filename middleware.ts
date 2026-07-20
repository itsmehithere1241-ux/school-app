import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

function hasSupabaseEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

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

async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        supabaseResponse = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabaseResponse, user };
}

export async function middleware(request: NextRequest) {
  if (!hasSupabaseEnv()) {
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
    console.error("Middleware error:", error);
    return configurationErrorResponse();
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
