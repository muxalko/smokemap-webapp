jest.mock("server-only", () => ({}), { virtual: true });
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/auth/get-backend-auth", () => ({ getBackendAuth: jest.fn() }));
jest.mock("@/lib/client", () => ({ getClient: jest.fn() }));

import { revalidatePath } from "next/cache";

import { getBackendAuth } from "@/lib/auth/get-backend-auth";
import { getClient } from "@/lib/client";
import {
  approveSubmission,
  deleteSubmission,
  loadModerationPreview,
  loadModerationQueue,
} from "./actions";
import { MODERATION_PAGE_SIZE } from "./types";

const auth = getBackendAuth as jest.MockedFunction<typeof getBackendAuth>;
const query = jest.fn();
const mutate = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (getClient as jest.Mock).mockReturnValue({ query, mutate });
});

it.each([
  [null, "AUTHENTICATION_REQUIRED"],
  [{ role: "guest" }, "AUTHENTICATION_REQUIRED"],
  [{ role: "user", backendAccess: "user-token" }, "FORBIDDEN"],
] as const)(
  "fails closed before queue or moderation calls for %p",
  async (session, code) => {
    auth.mockResolvedValue(session);

    await expect(loadModerationQueue()).resolves.toEqual({ ok: false, code });
    await expect(
      approveSubmission("1", "Reviewed", "approval-key")
    ).resolves.toEqual({ ok: false, code });
    await expect(deleteSubmission("1")).resolves.toEqual({
      ok: false,
      code: session?.role === "user" ? "FORBIDDEN" : code,
    });
    await expect(loadModerationPreview("attachment-1")).resolves.toEqual({
      ok: false,
      code,
    });
    expect(query).not.toHaveBeenCalled();
    expect(mutate).not.toHaveBeenCalled();
  }
);

it.each(["moderator", "administrator"] as const)(
  "loads one bounded queue page for a %s",
  async (role) => {
    auth.mockResolvedValue({ role, backendAccess: `${role}-token` });
    query.mockResolvedValue({
      data: {
        moderationQueueV4: {
          items: [],
          hasNextPage: false,
          nextCursor: null,
        },
      },
    });

    await expect(loadModerationQueue("opaque-cursor")).resolves.toMatchObject({
      ok: true,
    });
    expect(query).toHaveBeenCalledWith(
      expect.objectContaining({
        fetchPolicy: "no-cache",
        variables: {
          first: MODERATION_PAGE_SIZE,
          after: "opaque-cursor",
        },
        context: {
          headers: { Authorization: `Bearer ${role}-token` },
        },
      })
    );
  }
);

it("approves with the V4 idempotency key and refreshes queue and map state", async () => {
  auth.mockResolvedValue({ role: "moderator", backendAccess: "access" });
  mutate.mockResolvedValue({
    data: {
      approveSubmissionV4: {
        submission: { id: "7", state: "approved" },
        replayed: false,
      },
    },
  });

  await expect(
    approveSubmission("7", "  Ready to publish  ", "stable-key")
  ).resolves.toEqual({ ok: true, submissionId: "7", replayed: false });
  expect(mutate).toHaveBeenCalledWith(
    expect.objectContaining({
      variables: {
        submissionId: "7",
        idempotencyKey: "stable-key",
        input: { comment: "Ready to publish" },
      },
    })
  );
  expect(revalidatePath).toHaveBeenCalledWith("/");
  expect(revalidatePath).toHaveBeenCalledWith("/requests");
});

it("returns stable backend conflict codes without assuming success", async () => {
  auth.mockResolvedValue({ role: "moderator", backendAccess: "access" });
  mutate.mockRejectedValue({
    graphQLErrors: [{ extensions: { code: "INVALID_SUBMISSION_STATE" } }],
  });

  await expect(
    approveSubmission("7", "Reviewed", "stable-key")
  ).resolves.toEqual({ ok: false, code: "INVALID_SUBMISSION_STATE" });
  expect(revalidatePath).not.toHaveBeenCalled();
});

it("allows hard deletion only for an administrator", async () => {
  auth.mockResolvedValueOnce({ role: "moderator", backendAccess: "access" });
  await expect(deleteSubmission("7")).resolves.toEqual({
    ok: false,
    code: "FORBIDDEN",
  });
  expect(mutate).not.toHaveBeenCalled();

  auth.mockResolvedValueOnce({ role: "administrator", backendAccess: "admin" });
  mutate.mockResolvedValue({ data: { deleteRequest: { ok: true } } });
  await expect(deleteSubmission("7")).resolves.toEqual({
    ok: true,
    submissionId: "7",
  });
  expect(mutate).toHaveBeenCalledTimes(1);
});

it("rejects invalid bounds, ids, and comments before backend calls", async () => {
  auth.mockResolvedValue({ role: "administrator", backendAccess: "admin" });
  await expect(loadModerationQueue("")).resolves.toMatchObject({
    ok: false,
    code: "INVALID_PAGINATION",
  });
  await expect(approveSubmission("", "Reviewed", "key")).resolves.toMatchObject(
    {
      ok: false,
      code: "INVALID_SUBMISSION_ID",
    }
  );
  await expect(approveSubmission("1", " ", "key")).resolves.toMatchObject({
    ok: false,
    code: "INVALID_REVIEW_COMMENT",
  });
  expect(query).not.toHaveBeenCalled();
  expect(mutate).not.toHaveBeenCalled();
});
