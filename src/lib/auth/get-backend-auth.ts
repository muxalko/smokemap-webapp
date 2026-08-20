import "server-only";

import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/config";

type BackendServerSession = {
  backendAccess?: string;
  authError?: "SessionExpired";
};

export async function getBackendAccessToken(): Promise<string | null> {
  const session = await getServerSession({
    ...options,
    callbacks: {
      ...options.callbacks,
      session({ token }) {
        return {
          backendAccess: token.backendAccess,
          authError: token.authError,
        } as BackendServerSession;
      },
    },
  });
  return session?.authError ? null : session?.backendAccess ?? null;
}
