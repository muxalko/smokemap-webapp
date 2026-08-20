jest.mock("server-only", () => ({}), { virtual: true });
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/auth/get-backend-auth", () => ({ getBackendAuth: jest.fn() }));
jest.mock("@/lib/client", () => ({ getClient: jest.fn() }));

import { getBackendAuth } from "@/lib/auth/get-backend-auth";
import { getClient } from "@/lib/client";
import { approveRequest, deleteRequest } from "./actions";

const auth = getBackendAuth as jest.MockedFunction<typeof getBackendAuth>;
const mutate = jest.fn().mockResolvedValue({ data: {} });

beforeEach(() => {
  jest.clearAllMocks();
  (getClient as jest.Mock).mockReturnValue({ mutate });
});

it.each([null, { role: "guest" }, { role: "user", backendAccess: "access" }])(
  "denies approval before calling the backend for %p",
  async (session) => {
    auth.mockResolvedValue(session);
    await expect(approveRequest("1")).rejects.toMatchObject({
      code: session?.backendAccess ? "FORBIDDEN" : "AUTHENTICATION_REQUIRED",
    });
    expect(mutate).not.toHaveBeenCalled();
  }
);

it.each(["moderator", "administrator"])(
  "allows %s approval and forwards backend denial",
  async (role) => {
    auth.mockResolvedValue({ role, backendAccess: "access" });
    mutate.mockRejectedValueOnce(new Error("backend denied"));
    await expect(approveRequest("1")).rejects.toThrow("backend denied");
    expect(mutate).toHaveBeenCalledTimes(1);
  }
);

it("denies moderator hard deletion before calling the backend", async () => {
  auth.mockResolvedValue({ role: "moderator", backendAccess: "access" });
  await expect(deleteRequest("1")).rejects.toMatchObject({ code: "FORBIDDEN" });
  expect(mutate).not.toHaveBeenCalled();
});

it("allows an administrator to invoke hard deletion", async () => {
  auth.mockResolvedValue({ role: "administrator", backendAccess: "access" });
  await deleteRequest("1");
  expect(mutate).toHaveBeenCalledWith(
    expect.objectContaining({
      context: { headers: { Authorization: "Bearer access" } },
    })
  );
});
