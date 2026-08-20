jest.mock("server-only", () => ({}), { virtual: true });
jest.mock("@/lib/logger", () => ({ info: jest.fn(), warn: jest.fn() }));
jest.mock("@/lib/auth/backend-auth-client", () => ({
  loginWithPassword: jest.fn(),
  revokeBackendSession: jest.fn(),
}));

import type { Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { revokeBackendSession } from "@/lib/auth/backend-auth-client";
import { options, safeSession } from "./config";

it("projects only safe identity and terminal error fields into the public session", () => {
  const session = {
    user: { name: "User", email: "user@example.test", image: null },
    expires: "future",
  } as Session;
  const token = {
    backendUserId: "7",
    role: "moderator",
    backendAccess: "access-secret",
    backendRefresh: "refresh-secret",
    authError: "SessionExpired",
  } as JWT;
  expect(safeSession(session, token)).toEqual({
    user: {
      id: "7",
      name: "User",
      email: "user@example.test",
      image: null,
      role: "moderator",
    },
    expires: "future",
    error: "SessionExpired",
  });
  expect(JSON.stringify(session)).not.toContain("access-secret");
  expect(JSON.stringify(session)).not.toContain("refresh-secret");
});

it("attempts backend revocation on logout", async () => {
  const signOut = options.events?.signOut;
  expect(signOut).toBeDefined();
  await signOut?.({
    token: { backendRefresh: "refresh-secret" } as JWT,
    session: {} as never,
  });
  expect(revokeBackendSession).toHaveBeenCalledWith("refresh-secret");
});

it("allows local logout when backend revocation fails", async () => {
  (revokeBackendSession as jest.Mock).mockRejectedValueOnce(
    new Error("offline")
  );
  await expect(
    options.events?.signOut?.({
      token: { backendRefresh: "refresh-secret" } as JWT,
      session: {} as never,
    })
  ).resolves.toBeUndefined();
});
