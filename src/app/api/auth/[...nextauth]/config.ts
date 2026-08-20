import type { NextAuthOptions, Session, User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import type { JWT } from "next-auth/jwt";

import logger from "@/lib/logger";
import {
  loginWithPassword,
  revokeBackendSession,
} from "@/lib/auth/backend-auth-client";
import {
  refreshBackendSession,
  terminalBackendSession,
} from "@/lib/auth/token-lifecycle";

const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

function safeSession(session: Session, token: JWT): Session {
  if (session.user) {
    session.user.id = token.backendUserId ?? token.sub ?? "";
    session.user.role = token.role ?? "user";
  }
  session.error = token.authError;
  return session;
}

export const options: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE_SECONDS },
  jwt: { maxAge: SESSION_MAX_AGE_SECONDS },
  ...(process.env.NODE_ENV === "development"
    ? {
        cookies: {
          sessionToken: {
            name: "next-auth.session-token",
            options: {
              httpOnly: true,
              sameSite: "lax" as const,
              path: "/",
              secure: false,
            },
          },
        },
      }
    : {}),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;
        try {
          const authenticated = await loginWithPassword(
            credentials.email,
            credentials.password
          );
          logger.info("Credentials authentication succeeded");
          return authenticated as User;
        } catch {
          logger.warn("Credentials authentication denied");
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        return {
          ...token,
          backendUserId: user.id,
          role: user.role,
          backendAccess: user.backendAccess,
          backendAccessExpiresAt: user.backendAccessExpiresAt,
          backendRefresh: user.backendRefresh,
          backendRefreshExpiresAt: user.backendRefreshExpiresAt,
          authError: undefined,
        };
      }
      if (token.authError)
        return terminalBackendSession(token, token.authError);
      return refreshBackendSession(token);
    },
    session({ session, token }) {
      return safeSession(session, token);
    },
  },
  events: {
    async signOut({ token }) {
      if (!token?.backendRefresh) return;
      try {
        await revokeBackendSession(token.backendRefresh);
      } catch {
        logger.warn("Backend session revocation failed during logout");
      }
    },
  },
};

export { safeSession };
