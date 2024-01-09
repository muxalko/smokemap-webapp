import { HttpLink } from '@apollo/client';
import { registerApolloClient } from '@apollo/experimental-nextjs-app-support/rsc';
import {
    NextSSRApolloClient,
    NextSSRInMemoryCache,
} from '@apollo/experimental-nextjs-app-support/ssr';

// export const { getClient } = registerApolloClient(() => {
//   return new ApolloClient({
//     cache: new InMemoryCache(),
//     link: new HttpLink({
//       // https://studio.apollographql.com/public/spacex-l4uc6p/
//       //uri: "https://main--spacex-l4uc6p.apollographos.net/graphql",
//       uri: process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT,
//       // you can disable result caching here if you want to
//       // (this does not work if you are rendering your page with `export const dynamic = "force-static"`)
//       // fetchOptions: { cache: "no-store" },
//     }),
//   });
// });

export const { getClient } = registerApolloClient(() => {
    return new NextSSRApolloClient({
        cache: new NextSSRInMemoryCache(),
        link: new HttpLink({
            uri: process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT,
            fetchOptions: { cache: "no-store" }
        }),
    });
});

// export const { getClient } = registerApolloClient(() => {
//   return new ApolloClient({
//     cache: new InMemoryCache(),
//     link: new HttpLink({
//       uri: process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT,
//       // you can disable result caching here if you want to
//       // (this does not work if you are rendering your page with `export const dynamic = "force-static"`)
//       // fetchOptions: { cache: "no-store" },
//     }),
//   });
// });
