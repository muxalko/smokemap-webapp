// without a definde matcher, applied to all routes
// export { default } from "next-auth/middleware";

//https://next-auth.js.org/configuration/nextjs#advanced-usage
import { NextRequestWithAuth, withAuth } from "next-auth/middleware";
import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import clogger from "./lib/clogger";

const protectedRoutesMiddleware = withAuth(
  // 'withAuth' augments 'Request' with the user\s token.
  function middleware(request: NextRequestWithAuth) {
    clogger.debug(
      { pathname: request.nextUrl.pathname },
      "withAuth middleware"
    );

    if (
      request.nextUrl.pathname.startsWith("/requests") &&
      !["moderator", "administrator"].includes(
        request.nextauth.token?.role ?? ""
      )
    ) {
      return NextResponse.rewrite(new URL("/denied", request.url));
    }
  },
  {
    //middleware will only execute when 'authorized' returns true
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export default function middleware(
  request: NextRequest,
  event: NextFetchEvent
) {
  if (request.nextUrl.pathname.startsWith("/api/auth")) {
    const requestHeaders = new Headers(request.headers);

    if (!requestHeaders.has("x-forwarded-proto")) {
      requestHeaders.set(
        "x-forwarded-proto",
        request.nextUrl.protocol.replace(":", "")
      );
    }

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  return protectedRoutesMiddleware(request as NextRequestWithAuth, event);
}

// More on how NextAuth.js middleware works: https://next-auth.js.org/configuration/nextjs#middleware
export const config = { matcher: ["/api/auth/:path*", "/requests", "/me"] };
