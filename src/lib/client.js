import logger from "@/lib/logger";
import { HttpLink } from "@apollo/client";
import { registerApolloClient } from "@apollo/experimental-nextjs-app-support/rsc";
import {
  NextSSRApolloClient,
  NextSSRInMemoryCache,
} from "@apollo/experimental-nextjs-app-support/ssr";
import { setContext } from "@apollo/client/link/context";
import { getBackendAccessToken } from "@/lib/auth/get-backend-auth";

export const { getClient } = registerApolloClient((user) => {
  logger.debug("registerApolloClient() fired");
  const httpLink = new HttpLink({
    uri:
      process.env.GRAPHQL_INTERNAL_ENDPOINT ??
      `${process.env.BACKEND_INTERNAL_URL ?? "http://localhost:8000"}/graphql/`,
    credentials: "include",
  });
  const authLink = setContext(async (_, { headers }) => {
    logger.debug("registerApolloClient().setContext() fired");
    const jwt_token = await getBackendAccessToken();

    // Authenticate backend GraphQL calls with Django's configured JWT scheme.
    if (jwt_token) {
      logger.debug("Authenticated server GraphQL request");
      return {
        headers: {
          ...headers,
          Authorization: `Bearer ${jwt_token}`,
        },
      };
    } else {
      logger.debug("Anonymous user access");
      return {
        headers: {
          ...headers,
        },
      };
    }
  });
  return new NextSSRApolloClient({
    // connectToDevTools: process.browser,
    // ssrMode: !process.browser, // Disables forceFetch on the server (so queries are only run once)
    cache: new NextSSRInMemoryCache(),
    link: authLink.concat(httpLink),
    // cache: new InMemoryCache().restore(initialState || {})
  });
});
