jest.mock("server-only", () => ({}), { virtual: true });
jest.mock("./backend-auth-client", () => ({
  rotateBackendSession: jest.fn(),
}));

import type { JWT } from "next-auth/jwt";
import { rotateBackendSession } from "./backend-auth-client";
import {
  refreshBackendSession,
  terminalBackendSession,
} from "./token-lifecycle";

const rotate = rotateBackendSession as jest.MockedFunction<
  typeof rotateBackendSession
>;
const now = 2_000_000_000_000;

function expiredToken(): JWT {
  return {
    backendAccess: "old-access",
    backendAccessExpiresAt: now / 1000 - 1,
    backendRefresh: "old-refresh",
    backendRefreshExpiresAt: now / 1000 + 3600,
  };
}

beforeEach(() => jest.clearAllMocks());

it("keeps an access token that is safely inside its lifetime", async () => {
  const token = { ...expiredToken(), backendAccessExpiresAt: now / 1000 + 60 };
  await expect(refreshBackendSession(token, now)).resolves.toBe(token);
  expect(rotate).not.toHaveBeenCalled();
});

it("rotates an expired access and refresh credential", async () => {
  rotate.mockResolvedValue({
    access: "new-access",
    accessExpiresAt: now / 1000 + 300,
    refresh: "new-refresh",
    refreshExpiresAt: now / 1000 + 3600,
  });
  await expect(
    refreshBackendSession(expiredToken(), now)
  ).resolves.toMatchObject({
    backendAccess: "new-access",
    backendRefresh: "new-refresh",
    authError: undefined,
  });
});

it("deduplicates concurrent refreshes of the same credential", async () => {
  let resolveRefresh!: (
    value: Awaited<ReturnType<typeof rotateBackendSession>>
  ) => void;
  rotate.mockReturnValue(
    new Promise((resolve) => {
      resolveRefresh = resolve;
    })
  );
  const first = refreshBackendSession(expiredToken(), now);
  const second = refreshBackendSession(expiredToken(), now);
  expect(rotate).toHaveBeenCalledTimes(1);
  resolveRefresh({
    access: "new-access",
    accessExpiresAt: now / 1000 + 300,
    refresh: "new-refresh",
    refreshExpiresAt: now / 1000 + 3600,
  });
  await expect(Promise.all([first, second])).resolves.toHaveLength(2);
});

it("erases current and legacy credentials after terminal failure", async () => {
  rotate.mockRejectedValue(new Error("provider failed"));
  const terminal = await refreshBackendSession(
    { ...expiredToken(), access: "legacy-access", refresh: "legacy-refresh" },
    now
  );
  expect(terminal).toMatchObject({ authError: "SessionExpired" });
  expect(terminal).not.toHaveProperty("backendAccess");
  expect(terminal).not.toHaveProperty("backendRefresh");
  expect(terminal).not.toHaveProperty("access");
  expect(terminal).not.toHaveProperty("refresh");
  expect(await refreshBackendSession(terminal, now)).toEqual(
    terminalBackendSession(terminal)
  );
  expect(rotate).toHaveBeenCalledTimes(1);
});

it("does not call refresh after the refresh credential expires", async () => {
  const terminal = await refreshBackendSession(
    { ...expiredToken(), backendRefreshExpiresAt: now / 1000 },
    now
  );
  expect(terminal.authError).toBe("SessionExpired");
  expect(rotate).not.toHaveBeenCalled();
});
