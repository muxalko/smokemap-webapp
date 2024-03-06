"use client";
// ^ this file needs the "use client" pragma

import { ApolloLink, HttpLink } from "@apollo/client";
// import createUploadLink from "apollo-upload-client/createUploadLink.mjs";
import {
  ApolloNextAppProvider,
  NextSSRApolloClient,
  NextSSRInMemoryCache,
  SSRMultipartLink,
} from "@apollo/experimental-nextjs-app-support/ssr";
import { setContext } from "@apollo/client/link/context";
import clogger from "./clogger";

// have a function to create a client for you
function makeClient() {
  const httpLink = new HttpLink({
    // const httpLink = createUploadLink({
    // this needs to be an absolute url, as relative urls cannot be used in SSR
    //uri: "http://localhost:3000/api",
    uri: process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT,
    credentials: "include",
    // you can disable result caching here if you want to
    // (this does not work if you are rendering your page with `export const dynamic = "force-static"`)
    // fetchOptions: {
    // cache: "no-store",
    //mode: "no-cors", // no-cors, *cors, same-origin
    // },
  });

  const authLink = setContext((_, { headers }) => {
    // trying to read CSRF cookie
    // in case Django session authentication is in place and login successfully sent cookie
    // session cookie should be sent automatically by the browser
    const cookie_name = new RegExp("csrftoken=([^;]*)(;|$)");
    const cookie_data = document.cookie?.match(cookie_name);
    if (cookie_data && cookie_data.length > 0) {
      const cookie_value: string = cookie_data[0];
      const csrftoken = cookie_value.substring(10);
      clogger.trace({ csrftoken: csrftoken }, "Read CSRF Cookie value");
      // const token = localStorage.getItem("token") || null;
      return {
        headers: {
          ...(headers as string[]),
          "X-CSRFToken": csrftoken,
          // Authorization: token ? `JWT ${token}` : "",
          // cookie should be ent by the browser automatically
          // "Cookie:": `csrftoken=${csrftoken}`,
        },
      };
    }

    // no cookie exists
    return {
      headers: {
        ...(headers as string[]),
      },
    };
  });

  return new NextSSRApolloClient({
    // use the `NextSSRInMemoryCache`, not the normal `InMemoryCache`
    cache: new NextSSRInMemoryCache(),
    link:
      typeof window === "undefined"
        ? ApolloLink.from([
            // in a SSR environment, if you use multipart features like
            // @defer, you need to decide how to handle these.
            // This strips all interfaces with a `@defer` directive from your queries.
            new SSRMultipartLink({
              stripDefer: true,
            }),
            authLink.concat(httpLink),
          ])
        : authLink.concat(httpLink),
  });
}

// also have a function to create a suspense cache
// function makeSuspenseCache() {
//   return new SuspenseCache();
// }

// you need to create a component to wrap your app in
export function ApolloWrapper({ children }: React.PropsWithChildren) {
  return (
    <ApolloNextAppProvider
      makeClient={makeClient}
      // makeSuspenseCache={makeSuspenseCache}
    >
      {children}
    </ApolloNextAppProvider>
  );
}
