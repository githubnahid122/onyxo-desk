import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";

/**
 * Gate the admin dashboard behind NextAuth.
 *
 * Note: as of Next.js 16 the `middleware.ts` convention is deprecated in
 * favor of `proxy.ts` (same behavior, renamed file/export) — see
 * node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md.
 *
 * Proxy is a defense-in-depth layer, not the only check: the dashboard
 * page and any server actions/route handlers it calls re-verify `auth()`
 * themselves, since a matcher change here would otherwise silently open
 * a hole.
 */
export async function proxy(request: NextRequest) {
  const session = await auth();

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
