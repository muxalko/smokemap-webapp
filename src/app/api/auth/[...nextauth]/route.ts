import NextAuth from 'next-auth/next';
import { options } from './config';

// something is wrong with auth.ts
//import { auth, config } from "auth";
// const handler = NextAuth(config)

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const handler = NextAuth(options);
export { handler as GET, handler as POST };
