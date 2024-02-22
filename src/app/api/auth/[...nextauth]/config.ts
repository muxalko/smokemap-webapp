import { NextAuthOptions, User } from 'next-auth';
// import GithubProvider from 'next-auth/providers/github';
// import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
// import { GithubProfile } from 'next-auth/providers/github';
import logger from '@/lib/logger';
import { LOGIN } from '@/graphql/queries/gql';
import { getClient } from '@/lib/client';
import { LoginMutation } from '@/graphql/__generated__/types';
import { getServerSession } from "next-auth";
import { JWT } from 'next-auth/jwt';
// import { setCookie } from "nookies";

/**
 * Takes a token, and returns a new token with updated
 * `accessToken` and `accessTokenExpires`. If an error occurs,
 * returns the old token and an error property
 */
async function refreshAccessTokenWithDRF(token: JWT) {
  try {
    
    logger.debug({token: token}, "refreshAccessToken() fired");
    
    // getClient is calling for session and causes loop with jwt callback ;(
    // const refresh_token_result = await getClient().mutate<SilentTokenRefreshMutation>({
                //     fetchPolicy: 'no-cache',
                //     mutation: SILENT_REFRESH_TOKEN
                // });
    // const jwt_token = token?.access
    const jwt_refresh_token = token.refresh
    //login using DRF JWT auth 
    const response = await fetch(process.env.NEXT_PUBLIC_BACKEND+"/dj-rest-auth/token/refresh/",{
        method: "POST",
        headers: {
        "Content-Type": "application/json",
        },
        body: JSON.stringify({
            refresh: jwt_refresh_token
        }),
    })
    logger.debug({data: response}, "response")
    const refresh_token_result = await response.json()
    logger.debug({data: refresh_token_result}, "refresh_token_result")
    if (response.status != 200) {
      throw refresh_token_result.detail
    }
    
    return {
      ...token,
      access: refresh_token_result.access,
      accessExpiresIn: refresh_token_result.access_expiration,
    //   refresh: refresh_token_result.refresh,
    //   refreshExpiresIn: refresh_token_result.refresh_expiration,
    //   access: refresh_token_result.data?.refreshToken?.token,
    //   accessExpiresIn: refresh_token_result.data?.refreshToken?.payload?.exp,
    //   refresh: refresh_token_result.data?.refreshToken?.refreshToken,
    //   refreshExpiresIn: refresh_token_result.data?.refreshToken?.refreshExpiresIn
    }
  } catch (error) {
    logger.error(error)

    return {
      ...token,
      error: "RefreshAccessTokenError",
    }
  }
}

/**
 * Takes a token, and returns a new token with updated
 * `accessToken` and `accessTokenExpires`. If an error occurs,
 * returns the old token and an error property
 */
async function refreshAccessTokenWithGraphene(token: JWT) {
  try {
    
    logger.debug({token: token}, "refreshAccessToken() fired");
    
    // getClient is calling for session and causes loop with jwt callback ;(
    // const refresh_token_result = await getClient().mutate<SilentTokenRefreshMutation>({
                //     fetchPolicy: 'no-cache',
                //     mutation: SILENT_REFRESH_TOKEN
                // });
    // const jwt_token = token?.access
    const jwt_refresh_token = token.refresh
    const response = await fetch(process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT as string, {
        method: 'POST',
        headers: {
            "Content-Type": "application/json",
            Cookie: `JWT-refresh-token=${jwt_refresh_token}`,
        },
        
        body: JSON.stringify({
            query: "mutation SilentTokenRefresh { refreshToken { payload  token  refreshExpiresIn refreshToken }}"
            })
        })
        // .then(res => res.json())
        // .then((data) => { logger.debug(data, "refresh data"); return data.data})
    logger.debug({data: response}, "response")
    const refresh_token_result = await response.json()
    logger.debug({data: refresh_token_result}, "refresh_token_result")
    if (refresh_token_result.errors) {
      throw refresh_token_result.errors
    }

    return {
      ...token,
      access: refresh_token_result.data?.refreshToken?.token,
      accessExpiresIn: refresh_token_result.data?.refreshToken?.payload?.exp,
      refresh: refresh_token_result.data?.refreshToken?.refreshToken,
      refreshExpiresIn: refresh_token_result.data?.refreshToken?.refreshExpiresIn
    }
  } catch (error) {
    logger.error(error)

    return {
      ...token,
      error: "RefreshAccessTokenError",
    }
  }
}

export const options: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            // The name to display on the sign in form (e.g. "Sign in with...")
            name: 'Credentials',
            // `credentials` is used to generate a form on the sign in page.
            // You can specify which fields should be submitted, by adding keys to the `credentials` object.
            // e.g. domain, username, password, 2FA token, etc.
            // You can pass any HTML attribute to the <input> tag through the object.
            credentials: {
                email: {
                    label: 'Email',
                    type: 'email',
                    placeholder: 'jsmith@example.com',
                },
                password: { label: 'Password', type: 'password' },
            },
            // eslint-disable-next-line @typescript-eslint/require-await
            async authorize(credentials, req) {
                const session = await getServerSession(options);
                logger.debug(req,"authorize() request");
                // logger.debug('authorize() credentials: ' + JSON.stringify(credentials));
                // Add logic here to look up the user from the credentials supplied
                // const user = {
                //     id: '1',
                //     name: 'J Smith',
                //     email: 'jsmith@example.com',
                //     password: '12345678',
                //     image: '/smokemap.svg',
                //     role: 'admin',
                // };

                //login using DRF JWT auth 
                // const login_result = await fetch(process.env.NEXT_PUBLIC_BACKEND+"/dj-rest-auth/login/",{
                //     method: "POST",
                //     headers: {
                //     "Content-Type": "application/json",
                //     },
                //     body: JSON.stringify({
                //         email: credentials?.email,
                //         password: credentials?.password
                //     }),
                // })

                // login using Graphene JWT auth
                const login_result = await getClient().mutate<LoginMutation>({
                    fetchPolicy: 'no-cache',
                    mutation: LOGIN,
                    variables: {
                        email: credentials?.email,
                        password: credentials?.password
                    },
                });

                logger.debug( login_result, "login_result");
                
                if (
                    // credentials?.username === user.email &&
                    // credentials?.password === user.password
                    // login_result.status == 200
                    !login_result.errors

                ) {
                    
                  
                    // const response = await login_result.json();
                    // const user = response.user;
                    // const access = response.access;
                    // const accessExpiresIn = response.access_expiration
                    // const refresh = response.refresh;
                    // const refreshExpiresIn = response.refresh_expiration
                                        
                    const access = login_result.data?.tokenAuth?.token
                    const accessExpiresIn = login_result.data?.tokenAuth?.payload?.exp
                    const refresh = login_result.data?.tokenAuth?.refreshToken
                    const refreshExpiresIn = login_result.data?.tokenAuth?.refreshExpiresIn
                    const user = login_result.data?.tokenAuth?.user as User
                    
                    
                    user.access = access ?? ''
                    user.accessExpiresIn = accessExpiresIn ?? 0
                    user.refresh = refresh ?? ''
                    user.refreshExpiresIn = refreshExpiresIn ?? 0
                    logger.debug({user: user}, "Authenticated")
                   
                    // const user:User = {
                    //     id: customUser ? customUser?.name as string : '',
                    //     name: customUser?.name as string,
                    //     email: customUser?.email as string,
                    //     role: customUser.role as string,
                    //     image: customUser?.image as string,
                    // }

                    // const now = new Date();
                    // const time = now.getTime();
                    // const expireTime = time + 1000*36000;
                    // const expirationTime = now.setTime(expireTime);
                    // document.cookie = 'cookie=ok;expires='+now.toUTCString()+';path=/';
                    
                    // appends Set-Cookie header to response 
                    // the cookie is set in SSR mode (from server to client)
                    // cookies().set({
                    //             name: 'JWT',
                    //             value: access as string,
                    //             httpOnly: true, // disable cookie read by JavaScript
                    //             maxAge: 5 * 60, // 5 min 
                    //             path: '/',
                    //             domain: 'smokemap.org',
                    //             sameSite: 'lax', // allow cross-site requests GET, not POST (None must come with secure; Strict -> no cross-domain )
                    //             expires: new Date(accessExpiresIn as number),
                    //             secure: false, // only send when using https
                    //         });
                    // cookies().set({
                    //             name: 'JWT-refresh-token',
                    //             value: refresh as string,
                    //             httpOnly: true,
                    //             maxAge: 7 * 24 * 60 * 60, // 7 days
                    //             path: '/',
                    //             domain: 'smokemap.org',
                    //             sameSite: 'lax',
                    //             expires: new Date(refreshExpiresIn as number),
                    //             secure: false,
                    //         });

                    // localStorage.setItem("token", access as string)
                    // cookies().set({
                    //     name: 'token',
                    //     value: access as string,
                    //     // secure: true,
                    //     httpOnly: true,
                    //     // path: '/',
                    // })
                    // setCookie({ res }, "user", JSON.stringify(user), {
					// 			maxAge: 2 * 24 * 60 * 60,
					// 			path: "/",
					// 			httpOnly: true,
					// 		});

                    // Any object returned will be saved in `user` property of the JWT
                    return user;

                } else {
                    logger.error(login_result.errors,"Login error(s)")
                }
                // If you return null then an error will be displayed advising the user to check their details.
                return null;

                // You can also Reject this callback with an Error thus the user will be sent to the error page with the error message as a query parameter
                //return Promise.reject(new Error(response?.errors));
            },
        }),
        // GithubProvider({
        //     profile(profile: GithubProfile) {
        //         const augmented_profile = {
        //             ...profile,
        //             role: profile?.role as string ?? 'user' ,
        //             id: profile.id.toString(),
        //             image: profile.avatar_url,
        //             access: '',
        //             accessExpiresIn: 0,
        //             refresh: '',
        //             refeshExpiresIn: 0
        //         };
        //         logger.debug(
        //             'Github profile +changes: ' +
        //                 JSON.stringify(augmented_profile),
        //         );
        //         return augmented_profile;
        //     },
        //     clientId: process.env.AUTH_GITHUB_ID as string,
        //     clientSecret: process.env.AUTH_GITHUB_SECRET as string,
        // }),
        // GoogleProvider({
        //     clientId: process.env.AUTH_GOOGLE_ID as string,
        //     clientSecret: process.env.AUTH_GOOGLE_SECRET as string,
        //     authorization: {
        //         params: {
        //             prompt: "consent",
        //             access_type: "offline",
        //             response_type: "code"
        //         }
        //     }
        // }),
    ],
    // cookies: {
    //     sessionToken: {
    //         name: `__Secure-next-auth.jwt`,
    //         options: {
    //             httpOnly: true,
    //             sameSite: 'lax',
    //             path: '/',
    //             secure: true
    //         }
    //     },
    // },
    callbacks: {
        // eslint-disable-next-line @typescript-eslint/require-await
        async jwt({ token, user, account }) {
            logger.debug({token: token, user: user, account: account },"callback.jwt() fired")
            //https://authjs.dev/guides/basics/role-based-access-control
            // catch first user login
            if (user) {
                logger.debug("first user login")
                // token.role = user.role;
                return  {...token, ...user}
            }
            
            // Return previous token if the access token has not expired yet
            logger.debug({ now: new Date(Date.now()).toUTCString(), expires: new Date(token.accessExpiresIn * 1000).toUTCString(), test: Date.now() < token.accessExpiresIn * 1000},"check expiration date")
            if (Date.now() < token.accessExpiresIn * 1000) {
                return  token
            } 
            
            if (token?.error == "RefreshAccessTokenError") {
                logger.debug("error refreshing token")
                return token
            }
            
            logger.debug({token: token, user: user},"callback.jwt() refreshAccessToken")
            return refreshAccessTokenWithGraphene(token)
        },
        // for client components
        session({ session, token, user }) {
            // logger.debug({token: token, session: session},"callback.session()")
            if (session?.user) {
                session.user.role = token.role;
                session.user.access = token.access;
                session.user.refresh = token.refresh;
            }
            return session;
        },
        
    },
    // logger: {
    //   error(code, metadata) {
    //     logger.error(code, metadata)
    //   },
    //   warn(code) {
    //     logger.warn(code)
    //   },
    //   debug(code, metadata) {
    //     logger.debug(code, metadata)
    //   }
    // }
};
