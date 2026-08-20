import type { DefaultSession, DefaultUser } from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: { id: string; role: string } & DefaultSession["user"];
    error?: "SessionExpired";
  }
  interface User extends DefaultUser {
    role: string;
    backendAccess?: string;
    backendAccessExpiresAt?: number;
    backendRefresh?: string;
    backendRefreshExpiresAt?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    backendUserId?: string;
    role?: string;
    backendAccess?: string;
    backendAccessExpiresAt?: number;
    backendRefresh?: string;
    backendRefreshExpiresAt?: number;
    authError?: "SessionExpired";
    access?: string;
    accessExpiresIn?: number;
    refresh?: string;
    refreshExpiresIn?: number;
  }
}
