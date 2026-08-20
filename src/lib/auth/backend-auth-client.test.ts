jest.mock("server-only", () => ({}), { virtual: true });

import {
  loginWithPassword,
  revokeBackendSession,
  rotateBackendSession,
} from "./backend-auth-client";

const response = (body: unknown, status = 200) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  }) as unknown as Response;

beforeEach(() => {
  global.fetch = jest.fn();
});

it("maps password login to provider-neutral backend credentials", async () => {
  (fetch as jest.Mock).mockResolvedValue(
    response({
      data: {
        tokenAuth: {
          payload: { exp: 123, sub: "7" },
          token: "access-secret",
          refreshExpiresIn: 456,
          refreshToken: "refresh-secret",
          user: { name: "User", role: "user" },
        },
      },
    })
  );
  await expect(
    loginWithPassword("user@example.test", "password-secret")
  ).resolves.toMatchObject({
    id: "7",
    backendAccess: "access-secret",
    backendRefresh: "refresh-secret",
  });
});

it("retries one transient refresh failure and rotates successfully", async () => {
  (fetch as jest.Mock)
    .mockRejectedValueOnce(new Error("network unavailable"))
    .mockResolvedValueOnce(
      response({
        data: {
          refreshToken: {
            payload: { exp: 123 },
            token: "new-access",
            refreshExpiresIn: 456,
            refreshToken: "new-refresh",
          },
        },
      })
    );
  await expect(rotateBackendSession("refresh-secret")).resolves.toMatchObject({
    access: "new-access",
    refresh: "new-refresh",
  });
  expect(fetch).toHaveBeenCalledTimes(2);
});

it("does not retry a stable authentication denial", async () => {
  (fetch as jest.Mock).mockResolvedValue(
    response({ errors: [{ extensions: { code: "REFRESH_TOKEN_REUSED" } }] })
  );
  await expect(rotateBackendSession("refresh-secret")).rejects.toMatchObject({
    code: "REFRESH_TOKEN_REUSED",
  });
  expect(fetch).toHaveBeenCalledTimes(1);
});

it("revokes through GraphQL without putting the token in a cookie header", async () => {
  const fetchMock = fetch as jest.MockedFunction<typeof fetch>;
  fetchMock.mockResolvedValue(
    response({ data: { revokeToken: { revoked: 123 } } })
  );
  await revokeBackendSession("refresh-secret");
  const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
  expect(init.headers).toEqual({ "Content-Type": "application/json" });
  expect(init.body).toContain('"refreshToken":"refresh-secret"');
});
