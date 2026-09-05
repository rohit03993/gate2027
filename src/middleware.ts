import { NextRequest, NextResponse } from "next/server";

const PUBLIC = ["/login", "/manifest.webmanifest", "/sw.js"];

function isPublic(pathname: string) {
  if (PUBLIC.some((path) => pathname === path || pathname.startsWith(`${path}/`))) return true;
  if (pathname.startsWith("/icon") || pathname.startsWith("/apple-icon")) return true;
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) return NextResponse.next();

  const ok = request.cookies.get("gate_auth")?.value === "1";
  if (ok) return NextResponse.next();

  const login = new URL("/login", request.url);
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
