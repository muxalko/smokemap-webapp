jest.mock("server-only", () => ({}), { virtual: true });
jest.mock("@/lib/auth/get-backend-auth", () => ({ getBackendAuth: jest.fn() }));
jest.mock("@/lib/client", () => ({ getClient: jest.fn() }));

import { getBackendAuth } from "@/lib/auth/get-backend-auth";
import { getClient } from "@/lib/client";
import {
  attachVerifiedMedia,
  createMediaUploadIntent,
  issueMediaUploadIntent,
  renewMediaUploadIntent,
  verifyMediaUploadIntent,
} from "./media-actions";

const auth = getBackendAuth as jest.MockedFunction<typeof getBackendAuth>;
const mutate = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (getClient as jest.Mock).mockReturnValue({ mutate });
  auth.mockResolvedValue({ role: "user", backendAccess: "access" });
});

describe("createMediaUploadIntent", () => {
  const input = {
    submissionId: "42",
    mimeType: "image/png",
    declaredByteSize: 10,
    declaredSha256: "a".repeat(64),
    slot: 0,
  };

  it("requires backend authentication", async () => {
    auth.mockResolvedValue(null);
    await expect(createMediaUploadIntent(input, "key")).resolves.toEqual({
      ok: false,
      code: "AUTHENTICATION_REQUIRED",
    });
    expect(mutate).not.toHaveBeenCalled();
  });

  it("rejects an invalid idempotency key before mutating", async () => {
    await expect(createMediaUploadIntent(input, "")).resolves.toEqual({
      ok: false,
      code: "INVALID_IDEMPOTENCY_KEY",
    });
    expect(mutate).not.toHaveBeenCalled();
  });

  it("sends the intent input with the bearer credential", async () => {
    mutate.mockResolvedValue({
      data: {
        createMediaUploadIntent: {
          intent: {
            id: "intent-1",
            submissionId: "42",
            state: "created",
            slot: 0,
            failureCode: "",
          },
          replayed: false,
        },
      },
    });

    await expect(createMediaUploadIntent(input, "create-key")).resolves.toEqual(
      {
        ok: true,
        replayed: false,
        intent: {
          id: "intent-1",
          submissionId: "42",
          state: "created",
          slot: 0,
          failureCode: "",
        },
      }
    );
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: { idempotencyKey: "create-key", input },
        context: { headers: { Authorization: "Bearer access" } },
      })
    );
  });

  it("maps a GraphQL error to its extension code", async () => {
    mutate.mockRejectedValue({
      graphQLErrors: [{ extensions: { code: "MEDIA_LIMIT_REACHED" } }],
    });
    await expect(createMediaUploadIntent(input, "create-key")).resolves.toEqual(
      {
        ok: false,
        code: "MEDIA_LIMIT_REACHED",
      }
    );
  });
});

describe("issueMediaUploadIntent and renewMediaUploadIntent", () => {
  it("issues an upload authorization", async () => {
    mutate.mockResolvedValue({
      data: {
        issueMediaUploadIntent: {
          intent: {
            id: "intent-1",
            submissionId: "42",
            state: "issued",
            slot: 0,
            failureCode: "",
          },
          upload: {
            url: "https://storage.invalid/upload",
            fields: { key: "k" },
            expiresAt: "2026-01-01T00:00:00Z",
          },
          replayed: false,
        },
      },
    });

    await expect(
      issueMediaUploadIntent("intent-1", "issue-key")
    ).resolves.toEqual({
      ok: true,
      replayed: false,
      intent: {
        id: "intent-1",
        submissionId: "42",
        state: "issued",
        slot: 0,
        failureCode: "",
      },
      upload: {
        url: "https://storage.invalid/upload",
        fields: { key: "k" },
        expiresAt: "2026-01-01T00:00:00Z",
      },
    });
  });

  it("renews an upload authorization for an already-issued intent", async () => {
    mutate.mockResolvedValue({
      data: {
        renewMediaUploadIntent: {
          intent: {
            id: "intent-1",
            submissionId: "42",
            state: "issued",
            slot: 0,
            failureCode: "",
          },
          upload: {
            url: "https://storage.invalid/renewed",
            fields: { key: "k" },
            expiresAt: "2026-01-01T00:10:00Z",
          },
          replayed: false,
        },
      },
    });

    const result = await renewMediaUploadIntent("intent-1", "renew-key");
    expect(result.ok).toBe(true);
    expect(result.ok && result.upload.url).toBe(
      "https://storage.invalid/renewed"
    );
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: { intentId: "intent-1", idempotencyKey: "renew-key" },
      })
    );
  });

  it("rejects a missing intent id", async () => {
    await expect(issueMediaUploadIntent("", "issue-key")).resolves.toEqual({
      ok: false,
      code: "INVALID_INTENT_ID",
    });
    expect(mutate).not.toHaveBeenCalled();
  });
});

describe("verifyMediaUploadIntent", () => {
  it("reports the verified intent state", async () => {
    mutate.mockResolvedValue({
      data: {
        verifyMediaUploadIntent: {
          intent: {
            id: "intent-1",
            submissionId: "42",
            state: "verified",
            slot: 0,
            failureCode: "",
          },
          replayed: false,
        },
      },
    });

    await expect(
      verifyMediaUploadIntent("intent-1", "verify-key")
    ).resolves.toEqual({
      ok: true,
      replayed: false,
      intent: {
        id: "intent-1",
        submissionId: "42",
        state: "verified",
        slot: 0,
        failureCode: "",
      },
    });
  });

  it("surfaces a failed verification as intent state, not a thrown error", async () => {
    mutate.mockResolvedValue({
      data: {
        verifyMediaUploadIntent: {
          intent: {
            id: "intent-1",
            submissionId: "42",
            state: "cleanup_pending",
            slot: 0,
            failureCode: "sha256_mismatch",
          },
          replayed: false,
        },
      },
    });

    const result = await verifyMediaUploadIntent("intent-1", "verify-key");
    expect(result).toEqual({
      ok: true,
      replayed: false,
      intent: {
        id: "intent-1",
        submissionId: "42",
        state: "cleanup_pending",
        slot: 0,
        failureCode: "sha256_mismatch",
      },
    });
  });
});

describe("attachVerifiedMedia", () => {
  it("returns the attachment on success", async () => {
    mutate.mockResolvedValue({
      data: {
        attachVerifiedMedia: {
          attachment: {
            id: "image-1",
            submissionId: "42",
            position: 0,
            state: "attached",
          },
          replayed: false,
        },
      },
    });

    await expect(
      attachVerifiedMedia("intent-1", "attach-key")
    ).resolves.toEqual({
      ok: true,
      replayed: false,
      attachment: {
        id: "image-1",
        submissionId: "42",
        position: 0,
        state: "attached",
      },
    });
  });

  it("maps MediaStateConflict to its code", async () => {
    mutate.mockRejectedValue({
      graphQLErrors: [{ extensions: { code: "MEDIA_STATE_CONFLICT" } }],
    });
    await expect(
      attachVerifiedMedia("intent-1", "attach-key")
    ).resolves.toEqual({ ok: false, code: "MEDIA_STATE_CONFLICT" });
  });
});
