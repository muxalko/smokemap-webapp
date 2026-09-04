jest.mock("server-only", () => ({}), { virtual: true });
jest.mock("@/lib/auth/get-backend-auth", () => ({ getBackendAuth: jest.fn() }));
jest.mock("@/lib/client", () => ({ getClient: jest.fn() }));

import { getBackendAuth } from "@/lib/auth/get-backend-auth";
import { getClient } from "@/lib/client";
import { createSubmissionV3, finalizeSubmissionV3 } from "./actions";

const auth = getBackendAuth as jest.MockedFunction<typeof getBackendAuth>;
const mutate = jest.fn();
const input = {
  name: "Zero image place",
  categorySlug: "outdoors" as const,
  longitude: -77.0365,
  latitude: 38.8977,
  addressLabel: "Human label",
  tags: [],
  description: "",
  website: "",
};

beforeEach(() => {
  jest.clearAllMocks();
  (getClient as jest.Mock).mockReturnValue({ mutate });
  auth.mockResolvedValue({ role: "user", backendAccess: "access" });
});

it("validates create input before reading auth or mutating", async () => {
  await expect(
    createSubmissionV3({ ...input, latitude: 91 }, "create-key")
  ).resolves.toEqual({
    ok: false,
    code: "INVALID_SUBMISSION",
    field: "latitude",
  });
  expect(auth).not.toHaveBeenCalled();
  expect(mutate).not.toHaveBeenCalled();
});

it("requires backend authentication before create", async () => {
  auth.mockResolvedValue(null);
  await expect(createSubmissionV3(input, "create-key")).resolves.toEqual({
    ok: false,
    code: "AUTHENTICATION_REQUIRED",
  });
  expect(mutate).not.toHaveBeenCalled();
});

it("sends create and finalize with the private bearer credential", async () => {
  mutate
    .mockResolvedValueOnce({
      data: {
        createSubmissionV3: { submission: { id: "42", state: "draft" } },
      },
    })
    .mockResolvedValueOnce({
      data: {
        finalizeSubmissionV3: {
          submission: { id: "42", state: "pending" },
        },
      },
    });

  await expect(createSubmissionV3(input, "create-key")).resolves.toEqual({
    ok: true,
    submission: { id: "42", state: "draft" },
  });
  await expect(finalizeSubmissionV3("42", "finalize-key")).resolves.toEqual({
    ok: true,
    submission: { id: "42", state: "pending" },
  });

  expect(mutate).toHaveBeenNthCalledWith(
    1,
    expect.objectContaining({
      variables: {
        input,
        idempotencyKey: "create-key",
      },
      context: { headers: { Authorization: "Bearer access" } },
    })
  );
  expect(mutate).toHaveBeenNthCalledWith(
    2,
    expect.objectContaining({
      variables: { submissionId: "42", idempotencyKey: "finalize-key" },
      context: { headers: { Authorization: "Bearer access" } },
    })
  );
});
