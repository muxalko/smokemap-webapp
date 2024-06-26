//https://next-auth.js.org/getting-started/typescript#module-augmentation
import { DefaultSession, DefaultUser } from 'next-auth';
import { DefaultJWT, JWT } from 'next-auth/jwt';

declare module 'next-auth' {
    /**
     * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
     */
    interface Session {
        user: {
            /** The user's id as string. */
            id: string;
            /** The user's role as string. */
            role: string;
            /** The user's access token as string. */
            access: string;
            accessExpiresIn: number;
            /** The user's refresh token as string. */
            refresh: string;
            refreshExpiresIn: number;
        } & DefaultSession['user'];
    }

    /**
     * The shape of the user object returned in the OAuth providers' `profile` callback,
     * or the second parameter of the `session` callback, when using a database.
     */
    interface User extends DefaultUser {
        /** The user's role as string. */
        role: string;
        access: string;
        accessExpiresIn: number;
        refresh: string;
        refreshExpiresIn: number;
    }

    /**
     * Usually contains information about the provider being used
     * and also extends `TokenSet`, which is different tokens returned by OAuth Providers.
     */
    // interface Account {}
    /** The OAuth profile returned from your provider */
    // interface Profile {}
}

declare module 'next-auth/jwt' {
    interface JWT extends DefaultJWT {
        /** The user's role as string. */
        role: string;
        access: string;
        accessExpiresIn: number;
        refresh: string;
        efreshExpiresIn: number;
        /** OpenID ID Token */
        //idToken?: string
    }
}
