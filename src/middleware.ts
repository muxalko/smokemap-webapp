// without a definde matcher, applied to all routes
// export { default } from "next-auth/middleware";

//https://next-auth.js.org/configuration/nextjs#advanced-usage
import { NextRequestWithAuth, withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import clogger from './lib/clogger';

export default withAuth(
    // 'withAuth' augments 'Request' with the user\s token.
    function middleware(request: NextRequestWithAuth) {
        clogger.debug(
            { pathname: request.nextUrl.pathname },
            "withAuth middleware",
        );

        if (
            request.nextUrl.pathname.startsWith('/requests') &&
            request.nextauth.token?.role !== 'admin'
        ) {
            return NextResponse.rewrite(new URL('/denied', request.url));
        }
    },
    {
        //middleware will only execute when 'authorized' returns true
        callbacks: {
            authorized: ({ token }) => !!token,
        },
    },
);
// More on how NextAuth.js middleware works: https://next-auth.js.org/configuration/nextjs#middleware
export const config = { matcher: ['/requests', '/me'] };
