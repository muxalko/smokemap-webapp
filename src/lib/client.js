import logger from '@/lib/logger'
import { HttpLink } from '@apollo/client';
import { registerApolloClient } from '@apollo/experimental-nextjs-app-support/rsc';
import {
    NextSSRApolloClient,
    NextSSRInMemoryCache,
} from '@apollo/experimental-nextjs-app-support/ssr';
import { cookies } from "next/headers";
import { setContext } from "@apollo/client/link/context";
import { options } from "@/app/api/auth/[...nextauth]/config";
import { getServerSession } from "next-auth";

export const { getClient } = registerApolloClient((user) => {
    logger.debug("registerApolloClient() fired")
    const httpLink = new HttpLink({
        uri: process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT,
        credentials: "include"
    });
    const authLink = setContext(async (_, { headers }) => {
        logger.debug("registerApolloClient().setContext() fired")
        // tryto detect existing session
        const session = await getServerSession(options);
        logger.debug({ session: session }, "session")
        // const cookiesStore = cookies()
        // if (!cookiesStore) {
        //     logger.error("Cannot read request cookies")
        //     return
        // }

        // logger.debug({ cookies: cookiesStore }, "cookiesStore")

        // let csrf = cookies().get("csrftoken");
        // let jwt = cookies().get("JWT");
        // let jwt_rt = cookies().get("JWT-refresh-token");

        // case when there is an existing session with Django backend, form previous login
        // if (sessionid && csrftoken) {
        if (session?.user && session?.user.access && session.user.refresh) {
            logger.debug({ session: session }, "Already logged in")
            // const csrf_token = csrf.value;
            const jwt_token = session?.user.access
            const jwt_refresh_token = session.user.refresh
            // sessionid = sessionid.value;
            // logger.debug({ csrf_token: csrf_token }, "Got CSRF cookie")
            // logger.debug({ jwt_token: jwt_token }, "Got JWT cookie")
            // logger.debug({ jwt_refresh_token: jwt_refresh_token }, "JWT-refresh-token")

            return {
                headers: {
                    ...headers,
                    // Cookie: `csrftoken=${context.req.cookies.csrftoken};sessionid=${context.req.cookies.sessionid}`,
                    Cookie: `JWT=${jwt_token};JWT-refresh-token=${jwt_refresh_token}`,
                    // Cookie: `csrftoken=${csrf_token};JWT=${jwt_token};JWT-refresh-token=${jwt_refresh_token}`,
                    // Cookie: `csrftoken=${csrftoken};sessionid=${sessionid}`,
                    // "Cookie": `csrftoken=${csrf}`,
                    // "X-CSRFToken": csrf,
                    // Authorization: jwt_token ? `JWT ${jwt_token}` : "",
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
