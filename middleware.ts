import { type NextRequest, NextResponse } from "next/server";

const AUTH_PAGES = new Set([
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
]);

function hasSupabaseSessionCookie(request: NextRequest) {
  return request.cookies
    .getAll()
    .some((cookie) => cookie.name.includes("-auth-token") && cookie.value);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthPage = AUTH_PAGES.has(pathname);
  const hasSession = hasSupabaseSessionCookie(request);

  if (pathname === "/reset-password" && !hasSession) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  if (!hasSession && !isAuthPage) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(signInUrl);
  }

  if (
    hasSession &&
    (pathname === "/sign-in" ||
      pathname === "/sign-up" ||
      pathname === "/forgot-password")
  ) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|favicon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
