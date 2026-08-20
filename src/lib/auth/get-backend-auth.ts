import "server-only";

import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/config";

type BackendServerSession = {
  backendAccess?: string;
  role?: string;
  userId?: string;
  authError?: "SessionExpired";
};

export async function getBackendAuth(): Promise<BackendServerSession | null> {
  const session = await getServerSession({
    ...options,
    callbacks: {
      ...options.callbacks,
      session({ token }) {
        return {
          backendAccess: token.backendAccess,
          role: token.role,
          userId: token.backendUserId,
          authError: token.authError,
        } as BackendServerSession;
      },
    },
  });
  return session?.authError ? null : session;
}

export async function getBackendAccessToken(): Promise<string | null> {
  return (await getBackendAuth())?.backendAccess ?? null;
}
