jest.mock("server-only", () => ({}), { virtual: true });
jest.mock("@/lib/auth/get-backend-auth", () => ({ getBackendAuth: jest.fn() }));
jest.mock("@/lib/client", () => ({ getClient: jest.fn() }));

import { getBackendAuth } from "@/lib/auth/get-backend-auth";
import { getClient } from "@/lib/client";
import {
  attachVerifiedMedia,
  createMediaUploadIntent,
  expireMediaUploadIntent,
  issueMediaUploadIntent,
  mediaAttachmentPreviewV3,
  removeAttachedMedia,
  renewMediaUploadIntent,
  verifyMediaUploadIntent,
} from "./media-actions";

const auth = getBackendAuth as jest.MockedFunction<typeof getBackendAuth>;
const mutate = jest.fn();
const query = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (getClient as jest.Mock).mockReturnValue({ mutate, query });
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

describe("removeAttachedMedia", () => {
  it("rejects a missing intent id before mutating", async () => {
    await expect(removeAttachedMedia("", "remove-key")).resolves.toEqual({
      ok: false,
      code: "INVALID_INTENT_ID",
    });
    expect(mutate).not.toHaveBeenCalled();
  });

  it("requires backend authentication", async () => {
    auth.mockResolvedValue(null);
    await expect(
      removeAttachedMedia("intent-1", "remove-key")
    ).resolves.toEqual({ ok: false, code: "AUTHENTICATION_REQUIRED" });
    expect(mutate).not.toHaveBeenCalled();
  });

  it("returns the freed intent on success", async () => {
    mutate.mockResolvedValue({
      data: {
        removeAttachedMedia: {
          intent: {
            id: "intent-1",
            submissionId: "42",
            state: "cleanup_pending",
            slot: 0,
            failureCode: "media_removed",
          },
          replayed: false,
        },
      },
    });

    await expect(
      removeAttachedMedia("intent-1", "remove-key")
    ).resolves.toEqual({
      ok: true,
      replayed: false,
      intent: {
        id: "intent-1",
        submissionId: "42",
        state: "cleanup_pending",
        slot: 0,
        failureCode: "media_removed",
      },
    });
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: { intentId: "intent-1", idempotencyKey: "remove-key" },
        context: { headers: { Authorization: "Bearer access" } },
      })
    );
  });

  it("maps a state conflict, such as a non-draft submission, to its code", async () => {
    mutate.mockRejectedValue({
      graphQLErrors: [{ extensions: { code: "INVALID_SUBMISSION_STATE" } }],
    });
    await expect(
      removeAttachedMedia("intent-1", "remove-key")
    ).resolves.toEqual({ ok: false, code: "INVALID_SUBMISSION_STATE" });
  });
});

describe("expireMediaUploadIntent", () => {
  it("rejects a missing intent id before mutating", async () => {
    await expect(expireMediaUploadIntent("", "expire-key")).resolves.toEqual({
      ok: false,
      code: "INVALID_INTENT_ID",
    });
    expect(mutate).not.toHaveBeenCalled();
  });

  it("requires backend authentication", async () => {
    auth.mockResolvedValue(null);
    await expect(
      expireMediaUploadIntent("intent-1", "expire-key")
    ).resolves.toEqual({ ok: false, code: "AUTHENTICATION_REQUIRED" });
    expect(mutate).not.toHaveBeenCalled();
  });

  it("returns the reaped intent on success", async () => {
    mutate.mockResolvedValue({
      data: {
        expireMediaUploadIntent: {
          intent: {
            id: "intent-1",
            submissionId: "42",
            state: "cleanup_pending",
            slot: 0,
            failureCode: "intent_expired",
          },
          replayed: false,
        },
      },
    });

    await expect(
      expireMediaUploadIntent("intent-1", "expire-key")
    ).resolves.toEqual({
      ok: true,
      replayed: false,
      intent: {
        id: "intent-1",
        submissionId: "42",
        state: "cleanup_pending",
        slot: 0,
        failureCode: "intent_expired",
      },
    });
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: { intentId: "intent-1", idempotencyKey: "expire-key" },
        context: { headers: { Authorization: "Bearer access" } },
      })
    );
  });

  it("maps an intent that has not reached its absolute expiry to its code", async () => {
    mutate.mockRejectedValue({
      graphQLErrors: [{ extensions: { code: "MEDIA_STATE_CONFLICT" } }],
    });
    await expect(
      expireMediaUploadIntent("intent-1", "expire-key")
    ).resolves.toEqual({ ok: false, code: "MEDIA_STATE_CONFLICT" });
  });
});

describe("mediaAttachmentPreviewV3", () => {
  it("rejects a missing attachment id before querying", async () => {
    await expect(mediaAttachmentPreviewV3("")).resolves.toEqual({
      ok: false,
      code: "INVALID_ATTACHMENT_ID",
    });
    expect(query).not.toHaveBeenCalled();
  });

  it("requires backend authentication", async () => {
    auth.mockResolvedValue(null);
    await expect(mediaAttachmentPreviewV3("image-1")).resolves.toEqual({
      ok: false,
      code: "AUTHENTICATION_REQUIRED",
    });
    expect(query).not.toHaveBeenCalled();
  });

  it("returns a short-lived preview URL with the bearer credential", async () => {
    query.mockResolvedValue({
      data: {
        mediaAttachmentPreviewV3: {
          url: "https://storage.invalid/preview",
          expiresAt: "2026-01-01T00:10:00Z",
        },
      },
    });

    await expect(mediaAttachmentPreviewV3("image-1")).resolves.toEqual({
      ok: true,
      url: "https://storage.invalid/preview",
      expiresAt: "2026-01-01T00:10:00Z",
    });
    expect(query).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: { attachmentId: "image-1" },
        context: { headers: { Authorization: "Bearer access" } },
      })
    );
  });

  it("maps a denied preview to NOT_FOUND without distinguishing the reason", async () => {
    query.mockRejectedValue({
      graphQLErrors: [{ extensions: { code: "NOT_FOUND" } }],
    });
    await expect(mediaAttachmentPreviewV3("image-1")).resolves.toEqual({
      ok: false,
      code: "NOT_FOUND",
    });
  });
});
