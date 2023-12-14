// without a definde matcher, applied to all routes
// export { default } from "next-auth/middleware";

//https://next-auth.js.org/configuration/nextjs#advanced-usage
import { NextRequestWithAuth, withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  // 'withAuth' augments 'Request' with the user\s token.
  function middleware(request: NextRequestWithAuth) {
    console.log("middleware() nextUrl: " + JSON.stringify(request.nextUrl));
    console.log("middleware() nextauth: " + JSON.stringify(request.nextauth));

    if (
      request.nextUrl.pathname.startsWith("/requests") &&
      request.nextauth.token?.role !== "admin"
    ) {
      return NextResponse.rewrite(new URL("/denied", request.url));
    }
  },
  {
    //middleware will only execute when 'authorized' returns true
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    //   authorized: ({ token }) => {
    //     console.log("callback(jwt) token: " + JSON.stringify(token))
    //    return token?.role === "admin"
    // },
  }
);
// More on how NextAuth.js middleware works: https://next-auth.js.org/configuration/nextjs#middleware
// export default withAuth({
//   callbacks: {
//     authorized({ req, token }) {
//       console.log("withAuth(req,token): " + JSON.stringify(req)+", " + JSON.stringify(token));
//       // `/admin` requires admin role
//       if (req.nextUrl.pathname === "/admin") {
//         return token?.userRole === "admin";
//       }
//       // `/me` only requires the user to be logged in
//       return !!token;
//     },
//   },
// });

export const config = { matcher: ["/requests", "/me"] };
