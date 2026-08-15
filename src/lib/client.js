import logger from '@/lib/logger'
import { HttpLink } from '@apollo/client';
import { registerApolloClient } from '@apollo/experimental-nextjs-app-support/rsc';
import {
    NextSSRApolloClient,
    NextSSRInMemoryCache,
} from '@apollo/experimental-nextjs-app-support/ssr';
import { setContext } from "@apollo/client/link/context";
import { options } from "@/app/api/auth/[...nextauth]/config";
import { getServerSession } from "next-auth";

export const { getClient } = registerApolloClient((user) => {
    logger.debug("registerApolloClient() fired")
    const httpLink = new HttpLink({
        uri: process.env.GRAPHQL_INTERNAL_ENDPOINT ?? process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT,
        credentials: "include"
    });
    const authLink = setContext(async (_, { headers }) => {
        logger.debug("registerApolloClient().setContext() fired")
        // tryto detect existing session
        const session = await getServerSession(options);

        // Authenticate backend GraphQL calls with Django's configured JWT scheme.
        if (session?.user?.access) {
            logger.debug("Authenticated server GraphQL request")
            const jwt_token = session?.user.access

            return {
                headers: {
                    ...headers,
                    Authorization: `Bearer ${jwt_token}`,
                }
            };
        } else {
            logger.debug("Anonymous user access")
            return {
                headers: {
                    ...headers,
                }
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
