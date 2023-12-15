import NextAuth from 'next-auth/next';
import { options } from './config';

// something is wrong with auth.ts
//import { auth, config } from "auth";
// const handler = NextAuth(config)

const handler = NextAuth(options);
export { handler as GET, handler as POST };
