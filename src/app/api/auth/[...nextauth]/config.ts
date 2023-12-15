import { NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { GithubProfile } from "next-auth/providers/github";
// debug with events
// import log from "logging-service"

export const options: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      // The name to display on the sign in form (e.g. "Sign in with...")
      name: "Credentials",
      // `credentials` is used to generate a form on the sign in page.
      // You can specify which fields should be submitted, by adding keys to the `credentials` object.
      // e.g. domain, username, password, 2FA token, etc.
      // You can pass any HTML attribute to the <input> tag through the object.
      credentials: {
        username: { label: "Username", type: "text", placeholder: "jsmith" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        console.log('req: ' + JSON.stringify(req));
        console.log('credentials: ' + JSON.stringify(credentials));
        // Add logic here to look up the user from the credentials supplied
        const user = {
          id: '1',
          name: 'J Smith',
          email: 'jsmith@example.com',
          password: '12345678',
          image: '/smokemap.svg',
          role: 'admin',
        };

        if (
          credentials?.username === user.email &&
          credentials?.password === user.password
        ) {
          // Any object returned will be saved in `user` property of the JWT
          return user;
        }
        // If you return null then an error will be displayed advising the user to check their details.
        return null;

        // You can also Reject this callback with an Error thus the user will be sent to the error page with the error message as a query parameter
      },
    }),
    GithubProvider({
      profile(profile: GithubProfile) {
        const augmented_profile = {
          ...profile,
          role: profile.role ?? "user",
          id: profile.id.toString(),
          image: profile.avatar_url,
        };
        console.log(
          "Github profile +changes: " + JSON.stringify(augmented_profile),
        );
        return augmented_profile;
      },
      clientId: process.env.AUTH_GITHUB_ID as string,
      clientSecret: process.env.AUTH_GITHUB_SECRET as string,
    }),
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID as string,
      clientSecret: process.env.AUTH_GOOGLE_SECRET as string,
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      //https://authjs.dev/guides/basics/role-based-access-control
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    // for client components
    session({ session, token }) {
      if (session?.user) {
        session.user.role = token.role;
      }
      return session;
    },
  },
  // logger: {
  //   error(code, metadata) {
  //     log.error(code, metadata)
  //   },
  //   warn(code) {
  //     log.warn(code)
  //   },
  //   debug(code, metadata) {
  //     log.debug(code, metadata)
  //   }
  // }
};
