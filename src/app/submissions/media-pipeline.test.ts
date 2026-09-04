jest.mock("./media-actions", () => ({
  createMediaUploadIntent: jest.fn(),
  issueMediaUploadIntent: jest.fn(),
  renewMediaUploadIntent: jest.fn(),
  verifyMediaUploadIntent: jest.fn(),
  attachVerifiedMedia: jest.fn(),
}));
jest.mock("./media-crypto", () => ({ sha256Hex: jest.fn() }));
jest.mock("./media-upload", () => ({ postDirectUpload: jest.fn() }));
jest.mock("uuid", () => ({ v4: jest.fn() }));

import { v4 as uuid } from "uuid";
import {
  attachVerifiedMedia,
  createMediaUploadIntent,
  issueMediaUploadIntent,
  renewMediaUploadIntent,
  verifyMediaUploadIntent,
} from "./media-actions";
import { sha256Hex } from "./media-crypto";
import { postDirectUpload } from "./media-upload";
import {
  createMediaSlotOperation,
  createMediaSlotOperations,
  createResumedMediaSlotOperation,
  runMediaSlot,
} from "./media-pipeline";

const createIntent = createMediaUploadIntent as jest.MockedFunction<
  typeof createMediaUploadIntent
>;
const issueIntent = issueMediaUploadIntent as jest.MockedFunction<
  typeof issueMediaUploadIntent
>;
const renewIntent = renewMediaUploadIntent as jest.MockedFunction<
  typeof renewMediaUploadIntent
>;
const verifyIntent = verifyMediaUploadIntent as jest.MockedFunction<
  typeof verifyMediaUploadIntent
>;
const attachMedia = attachVerifiedMedia as jest.MockedFunction<
  typeof attachVerifiedMedia
>;
const hash = sha256Hex as jest.MockedFunction<typeof sha256Hex>;
const upload = postDirectUpload as jest.MockedFunction<typeof postDirectUpload>;
const uuidMock = uuid as jest.MockedFunction<typeof uuid>;

const file = new File(["content"], "photo.png", { type: "image/png" });
const authorization = {
  url: "https://storage.invalid/upload",
  fields: { key: "k" },
  expiresAt: "2026-01-01T00:00:00Z",
};

function onPhase() {
  const phases: string[] = [];
  return { phases, record: (phase: string) => phases.push(phase) };
}

beforeEach(() => {
  jest.clearAllMocks();
  hash.mockResolvedValue("a".repeat(64));
  uuidMock.mockReturnValue("generated-uuid");
});

it("creates one operation per file with a stable identity", () => {
  let counter = 0;
  uuidMock.mockImplementation(() => `uuid-${(counter += 1)}`);
  const files = [file, file];
  const ops = createMediaSlotOperations(files);
  expect(ops).toHaveLength(2);
  expect(ops[0].slot).toBe(0);
  expect(ops[1].slot).toBe(1);
  expect(ops[0].createIntentKey).not.toBe(ops[1].createIntentKey);
});

it("runs the full pipeline for a fresh slot: hash, create, issue, upload, verify, attach", async () => {
  createIntent.mockResolvedValue({
    ok: true,
    replayed: false,
    intent: {
      id: "intent-1",
      submissionId: "42",
      state: "created",
      slot: 0,
      failureCode: "",
    },
  });
  issueIntent.mockResolvedValue({
    ok: true,
    replayed: false,
    intent: {
      id: "intent-1",
      submissionId: "42",
      state: "issued",
      slot: 0,
      failureCode: "",
    },
    upload: authorization,
  });
  upload.mockResolvedValue(true);
  verifyIntent.mockResolvedValue({
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
  attachMedia.mockResolvedValue({
    ok: true,
    replayed: false,
    attachment: {
      id: "image-1",
      submissionId: "42",
      position: 0,
      state: "attached",
    },
  });

  const [op] = createMediaSlotOperations([file]);
  const { phases, record } = onPhase();
  const result = await runMediaSlot("42", op, record);

  expect(result).toEqual({ ok: true });
  expect(phases).toEqual([
    "hashing",
    "creating-intent",
    "authorizing",
    "uploading",
    "verifying",
    "attaching",
  ]);
  expect(createIntent).toHaveBeenCalledWith(
    {
      submissionId: "42",
      mimeType: "image/png",
      declaredByteSize: file.size,
      declaredSha256: "a".repeat(64),
      slot: 0,
    },
    op.createIntentKey
  );
  expect(issueIntent).toHaveBeenCalledWith("intent-1", op.issueKey);
  expect(upload).toHaveBeenCalledWith(
    authorization.url,
    authorization.fields,
    file
  );
  expect(verifyIntent).toHaveBeenCalledWith("intent-1", op.verifyKey);
  expect(attachMedia).toHaveBeenCalledWith("intent-1", op.attachKey);
  expect(op.attached).toBe(true);
});

it("returns ok immediately for an already-attached slot without calling any mutation", async () => {
  const [op] = createMediaSlotOperations([file]);
  op.attached = true;

  const result = await runMediaSlot("42", op, jest.fn());

  expect(result).toEqual({ ok: true });
  expect(createIntent).not.toHaveBeenCalled();
  expect(hash).not.toHaveBeenCalled();
});

it("renews instead of re-issuing once the intent has already been issued", async () => {
  const [op] = createMediaSlotOperations([file]);
  op.intentId = "intent-1";
  op.declaredByteSize = file.size;
  op.declaredSha256 = "a".repeat(64);
  op.issuedOnce = true;
  uuidMock.mockReturnValue("fresh-renew-key");
  renewIntent.mockResolvedValue({
    ok: true,
    replayed: false,
    intent: {
      id: "intent-1",
      submissionId: "42",
      state: "issued",
      slot: 0,
      failureCode: "",
    },
    upload: authorization,
  });
  upload.mockResolvedValue(true);
  verifyIntent.mockResolvedValue({
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
  attachMedia.mockResolvedValue({
    ok: true,
    replayed: false,
    attachment: {
      id: "image-1",
      submissionId: "42",
      position: 0,
      state: "attached",
    },
  });

  const result = await runMediaSlot("42", op, jest.fn());

  expect(result).toEqual({ ok: true });
  expect(issueIntent).not.toHaveBeenCalled();
  expect(renewIntent).toHaveBeenCalledWith("intent-1", "fresh-renew-key");
  expect(createIntent).not.toHaveBeenCalled();
});

it("reuses the renewal key after an ambiguous renewal failure", async () => {
  const [op] = createMediaSlotOperations([file]);
  op.intentId = "intent-1";
  op.declaredByteSize = file.size;
  op.declaredSha256 = "a".repeat(64);
  op.issuedOnce = true;
  uuidMock.mockReturnValue("stable-renew-key");
  renewIntent
    .mockRejectedValueOnce(new Error("response lost"))
    .mockResolvedValueOnce({
      ok: true,
      replayed: true,
      intent: {
        id: "intent-1",
        submissionId: "42",
        state: "issued",
        slot: 0,
        failureCode: "",
      },
      upload: authorization,
    });
  upload.mockResolvedValue(true);
  verifyIntent.mockResolvedValue({
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
  attachMedia.mockResolvedValue({
    ok: true,
    replayed: false,
    attachment: {
      id: "image-1",
      submissionId: "42",
      position: 0,
      state: "attached",
    },
  });

  await expect(runMediaSlot("42", op, jest.fn())).resolves.toEqual({
    ok: false,
    failure: {
      operation: "media_authorize",
      code: "MEDIA_RENEW_FAILED",
      slot: 0,
    },
  });
  await expect(runMediaSlot("42", op, jest.fn())).resolves.toEqual({
    ok: true,
  });

  expect(renewIntent.mock.calls).toEqual([
    ["intent-1", "stable-renew-key"],
    ["intent-1", "stable-renew-key"],
  ]);
});

it("resumes a retry after an upload failure without recreating the intent or re-issuing", async () => {
  createIntent.mockResolvedValue({
    ok: true,
    replayed: false,
    intent: {
      id: "intent-1",
      submissionId: "42",
      state: "created",
      slot: 0,
      failureCode: "",
    },
  });
  issueIntent.mockResolvedValue({
    ok: true,
    replayed: false,
    intent: {
      id: "intent-1",
      submissionId: "42",
      state: "issued",
      slot: 0,
      failureCode: "",
    },
    upload: authorization,
  });
  upload.mockResolvedValueOnce(false);

  const [op] = createMediaSlotOperations([file]);
  const first = await runMediaSlot("42", op, jest.fn());
  expect(first).toEqual({
    ok: false,
    failure: {
      operation: "media_upload",
      code: "MEDIA_UPLOAD_FAILED",
      slot: 0,
    },
  });

  uuidMock.mockReturnValue("fresh-renew-key");
  renewIntent.mockResolvedValue({
    ok: true,
    replayed: false,
    intent: {
      id: "intent-1",
      submissionId: "42",
      state: "issued",
      slot: 0,
      failureCode: "",
    },
    upload: authorization,
  });
  upload.mockResolvedValueOnce(true);
  verifyIntent.mockResolvedValue({
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
  attachMedia.mockResolvedValue({
    ok: true,
    replayed: false,
    attachment: {
      id: "image-1",
      submissionId: "42",
      position: 0,
      state: "attached",
    },
  });

  const second = await runMediaSlot("42", op, jest.fn());

  expect(second).toEqual({ ok: true });
  expect(createIntent).toHaveBeenCalledTimes(1);
  expect(issueIntent).toHaveBeenCalledTimes(1);
  expect(renewIntent).toHaveBeenCalledWith("intent-1", "fresh-renew-key");
  expect(hash).toHaveBeenCalledTimes(1);
});

it("renews after a replayed issue authorization has expired", async () => {
  createIntent.mockResolvedValue({
    ok: true,
    replayed: false,
    intent: {
      id: "intent-1",
      submissionId: "42",
      state: "created",
      slot: 0,
      failureCode: "",
    },
  });
  issueIntent.mockResolvedValue({
    ok: false,
    code: "UPLOAD_AUTHORIZATION_EXPIRED",
  });

  const [op] = createMediaSlotOperations([file]);
  await expect(runMediaSlot("42", op, jest.fn())).resolves.toEqual({
    ok: false,
    failure: {
      operation: "media_authorize",
      code: "UPLOAD_AUTHORIZATION_EXPIRED",
      slot: 0,
    },
  });

  uuidMock.mockReturnValue("renew-after-expiry-key");
  renewIntent.mockResolvedValue({
    ok: true,
    replayed: false,
    intent: {
      id: "intent-1",
      submissionId: "42",
      state: "issued",
      slot: 0,
      failureCode: "",
    },
    upload: authorization,
  });
  upload.mockResolvedValue(true);
  verifyIntent.mockResolvedValue({
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
  attachMedia.mockResolvedValue({
    ok: true,
    replayed: false,
    attachment: {
      id: "image-1",
      submissionId: "42",
      position: 0,
      state: "attached",
    },
  });

  await expect(runMediaSlot("42", op, jest.fn())).resolves.toEqual({
    ok: true,
  });
  expect(issueIntent).toHaveBeenCalledTimes(1);
  expect(renewIntent).toHaveBeenCalledWith(
    "intent-1",
    "renew-after-expiry-key"
  );
});

it("replays verification after its response is lost without renewing or uploading again", async () => {
  createIntent.mockResolvedValue({
    ok: true,
    replayed: false,
    intent: {
      id: "intent-1",
      submissionId: "42",
      state: "created",
      slot: 0,
      failureCode: "",
    },
  });
  issueIntent.mockResolvedValue({
    ok: true,
    replayed: false,
    intent: {
      id: "intent-1",
      submissionId: "42",
      state: "issued",
      slot: 0,
      failureCode: "",
    },
    upload: authorization,
  });
  upload.mockResolvedValue(true);
  verifyIntent
    .mockRejectedValueOnce(new Error("response lost"))
    .mockResolvedValueOnce({
      ok: true,
      replayed: true,
      intent: {
        id: "intent-1",
        submissionId: "42",
        state: "verified",
        slot: 0,
        failureCode: "",
      },
    });
  attachMedia.mockResolvedValue({
    ok: true,
    replayed: false,
    attachment: {
      id: "image-1",
      submissionId: "42",
      position: 0,
      state: "attached",
    },
  });

  const [op] = createMediaSlotOperations([file]);
  await expect(runMediaSlot("42", op, jest.fn())).resolves.toEqual({
    ok: false,
    failure: {
      operation: "media_verify",
      code: "MEDIA_VERIFY_FAILED",
      slot: 0,
    },
  });
  await expect(runMediaSlot("42", op, jest.fn())).resolves.toEqual({
    ok: true,
  });

  expect(issueIntent).toHaveBeenCalledTimes(1);
  expect(renewIntent).not.toHaveBeenCalled();
  expect(upload).toHaveBeenCalledTimes(1);
  expect(verifyIntent.mock.calls).toEqual([
    ["intent-1", op.verifyKey],
    ["intent-1", op.verifyKey],
  ]);
});

it("fails with media_intent when the intent cannot be created", async () => {
  createIntent.mockResolvedValue({
    ok: false,
    code: "MEDIA_LIMIT_REACHED",
  });

  const [op] = createMediaSlotOperations([file]);
  const result = await runMediaSlot("42", op, jest.fn());

  expect(result).toEqual({
    ok: false,
    failure: {
      operation: "media_intent",
      code: "MEDIA_LIMIT_REACHED",
      field: undefined,
      slot: 0,
    },
  });
  expect(issueIntent).not.toHaveBeenCalled();
});

it("fails with media_hash when hashing throws, before any mutation runs", async () => {
  hash.mockRejectedValue(new Error("unreadable file"));

  const [op] = createMediaSlotOperations([file]);
  const result = await runMediaSlot("42", op, jest.fn());

  expect(result).toEqual({
    ok: false,
    failure: { operation: "media_hash", code: "MEDIA_HASH_FAILED", slot: 0 },
  });
  expect(createIntent).not.toHaveBeenCalled();
});

it("fails with media_upload when the direct POST does not succeed, without verifying", async () => {
  createIntent.mockResolvedValue({
    ok: true,
    replayed: false,
    intent: {
      id: "intent-1",
      submissionId: "42",
      state: "created",
      slot: 0,
      failureCode: "",
    },
  });
  issueIntent.mockResolvedValue({
    ok: true,
    replayed: false,
    intent: {
      id: "intent-1",
      submissionId: "42",
      state: "issued",
      slot: 0,
      failureCode: "",
    },
    upload: authorization,
  });
  upload.mockResolvedValue(false);

  const [op] = createMediaSlotOperations([file]);
  const result = await runMediaSlot("42", op, jest.fn());

  expect(result).toEqual({
    ok: false,
    failure: {
      operation: "media_upload",
      code: "MEDIA_UPLOAD_FAILED",
      slot: 0,
    },
  });
  expect(verifyIntent).not.toHaveBeenCalled();
  expect(op.issuedOnce).toBe(true);
});

it("fails with media_verify using the intent's failure code when verification lands in a non-verified state", async () => {
  createIntent.mockResolvedValue({
    ok: true,
    replayed: false,
    intent: {
      id: "intent-1",
      submissionId: "42",
      state: "created",
      slot: 0,
      failureCode: "",
    },
  });
  issueIntent.mockResolvedValue({
    ok: true,
    replayed: false,
    intent: {
      id: "intent-1",
      submissionId: "42",
      state: "issued",
      slot: 0,
      failureCode: "",
    },
    upload: authorization,
  });
  upload.mockResolvedValue(true);
  verifyIntent.mockResolvedValue({
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

  const [op] = createMediaSlotOperations([file]);
  const result = await runMediaSlot("42", op, jest.fn());

  expect(result).toEqual({
    ok: false,
    failure: { operation: "media_verify", code: "sha256_mismatch", slot: 0 },
  });
  expect(attachMedia).not.toHaveBeenCalled();
});

it("fails with media_attach when attachment is rejected", async () => {
  createIntent.mockResolvedValue({
    ok: true,
    replayed: false,
    intent: {
      id: "intent-1",
      submissionId: "42",
      state: "created",
      slot: 0,
      failureCode: "",
    },
  });
  issueIntent.mockResolvedValue({
    ok: true,
    replayed: false,
    intent: {
      id: "intent-1",
      submissionId: "42",
      state: "issued",
      slot: 0,
      failureCode: "",
    },
    upload: authorization,
  });
  upload.mockResolvedValue(true);
  verifyIntent.mockResolvedValue({
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
  attachMedia.mockResolvedValue({ ok: false, code: "MEDIA_STATE_CONFLICT" });

  const [op] = createMediaSlotOperations([file]);
  const result = await runMediaSlot("42", op, jest.fn());

  expect(result).toEqual({
    ok: false,
    failure: {
      operation: "media_attach",
      code: "MEDIA_STATE_CONFLICT",
      slot: 0,
    },
  });
  expect(op.attached).toBeUndefined();
});

it("rejects an attachment response for another submission or slot", async () => {
  const [op] = createMediaSlotOperations([file]);
  op.intentId = "intent-1";
  op.verified = true;
  attachMedia.mockResolvedValue({
    ok: true,
    replayed: false,
    attachment: {
      id: "image-1",
      submissionId: "other-submission",
      position: 2,
      state: "attached",
    },
  });

  await expect(runMediaSlot("42", op, jest.fn())).resolves.toEqual({
    ok: false,
    failure: {
      operation: "media_attach",
      code: "INVALID_MEDIA_ATTACHMENT_RESPONSE",
      slot: 0,
    },
  });
  expect(op.attached).toBeUndefined();
});

it("skips straight to attach when a retried create-intent replays an already-verified intent", async () => {
  const [op] = createMediaSlotOperations([file]);
  createIntent.mockResolvedValue({
    ok: true,
    replayed: true,
    intent: {
      id: "intent-1",
      submissionId: "42",
      state: "verified",
      slot: 0,
      failureCode: "",
    },
  });
  attachMedia.mockResolvedValue({
    ok: true,
    replayed: false,
    attachment: {
      id: "image-1",
      submissionId: "42",
      position: 0,
      state: "attached",
    },
  });

  const result = await runMediaSlot("42", op, jest.fn());

  expect(result).toEqual({ ok: true });
  expect(issueIntent).not.toHaveBeenCalled();
  expect(renewIntent).not.toHaveBeenCalled();
  expect(upload).not.toHaveBeenCalled();
  expect(verifyIntent).not.toHaveBeenCalled();
  expect(attachMedia).toHaveBeenCalledWith("intent-1", op.attachKey);
});

it("records the attachment id once a slot attaches", async () => {
  createIntent.mockResolvedValue({
    ok: true,
    replayed: false,
    intent: {
      id: "intent-1",
      submissionId: "42",
      state: "created",
      slot: 0,
      failureCode: "",
    },
  });
  issueIntent.mockResolvedValue({
    ok: true,
    replayed: false,
    intent: {
      id: "intent-1",
      submissionId: "42",
      state: "issued",
      slot: 0,
      failureCode: "",
    },
    upload: authorization,
  });
  upload.mockResolvedValue(true);
  verifyIntent.mockResolvedValue({
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
  attachMedia.mockResolvedValue({
    ok: true,
    replayed: false,
    attachment: {
      id: "image-1",
      submissionId: "42",
      position: 0,
      state: "attached",
    },
  });

  const [op] = createMediaSlotOperations([file]);
  await runMediaSlot("42", op, jest.fn());

  expect(op.attachmentId).toBe("image-1");
});

describe("createMediaSlotOperation", () => {
  it("builds a single operation bound to an explicit slot, not a sequential index", () => {
    const op = createMediaSlotOperation(2, file);
    expect(op.slot).toBe(2);
    expect(op.file).toBe(file);
    expect(op.mimeType).toBe("image/png");
    expect(op.intentId).toBeUndefined();
  });

  it("allows a slot with no file, for operations that only need to continue an existing intent", () => {
    const op = createMediaSlotOperation(1);
    expect(op.file).toBeUndefined();
    expect(op.mimeType).toBe("");
  });
});

describe("createResumedMediaSlotOperation", () => {
  it("marks a verified-but-unattached intent ready to attach without any file", async () => {
    const op = createResumedMediaSlotOperation({
      id: "intent-1",
      slot: 2,
      state: "verified",
    });
    expect(op.verified).toBe(true);
    expect(op.uploaded).toBe(true);
    expect(op.issuedOnce).toBe(true);
    expect(op.file).toBeUndefined();

    attachMedia.mockResolvedValue({
      ok: true,
      replayed: false,
      attachment: {
        id: "image-2",
        submissionId: "42",
        position: 2,
        state: "attached",
      },
    });

    const result = await runMediaSlot("42", op, jest.fn());

    expect(result).toEqual({ ok: true });
    expect(createIntent).not.toHaveBeenCalled();
    expect(issueIntent).not.toHaveBeenCalled();
    expect(renewIntent).not.toHaveBeenCalled();
    expect(upload).not.toHaveBeenCalled();
    expect(verifyIntent).not.toHaveBeenCalled();
    expect(attachMedia).toHaveBeenCalledWith("intent-1", op.attachKey);
  });

  it("renews rather than issues for an already-issued intent once a file is reselected", async () => {
    const op = createResumedMediaSlotOperation(
      { id: "intent-1", slot: 1, state: "issued" },
      file
    );
    expect(op.issuedOnce).toBe(true);

    renewIntent.mockResolvedValue({
      ok: true,
      replayed: false,
      intent: {
        id: "intent-1",
        submissionId: "42",
        state: "issued",
        slot: 1,
        failureCode: "",
      },
      upload: authorization,
    });
    upload.mockResolvedValue(true);
    verifyIntent.mockResolvedValue({
      ok: true,
      replayed: false,
      intent: {
        id: "intent-1",
        submissionId: "42",
        state: "verified",
        slot: 1,
        failureCode: "",
      },
    });
    attachMedia.mockResolvedValue({
      ok: true,
      replayed: false,
      attachment: {
        id: "image-1",
        submissionId: "42",
        position: 1,
        state: "attached",
      },
    });

    const result = await runMediaSlot("42", op, jest.fn());

    expect(result).toEqual({ ok: true });
    expect(createIntent).not.toHaveBeenCalled();
    expect(issueIntent).not.toHaveBeenCalled();
    expect(hash).not.toHaveBeenCalled();
    expect(renewIntent).toHaveBeenCalledWith("intent-1", "generated-uuid");
  });

  it("issues (not renews) for a created intent that was never authorized", async () => {
    const op = createResumedMediaSlotOperation(
      { id: "intent-1", slot: 0, state: "created" },
      file
    );
    expect(op.issuedOnce).toBeUndefined();

    issueIntent.mockResolvedValue({
      ok: true,
      replayed: false,
      intent: {
        id: "intent-1",
        submissionId: "42",
        state: "issued",
        slot: 0,
        failureCode: "",
      },
      upload: authorization,
    });
    upload.mockResolvedValue(true);
    verifyIntent.mockResolvedValue({
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
    attachMedia.mockResolvedValue({
      ok: true,
      replayed: false,
      attachment: {
        id: "image-1",
        submissionId: "42",
        position: 0,
        state: "attached",
      },
    });

    const result = await runMediaSlot("42", op, jest.fn());

    expect(result).toEqual({ ok: true });
    expect(createIntent).not.toHaveBeenCalled();
    expect(hash).not.toHaveBeenCalled();
    expect(issueIntent).toHaveBeenCalledWith("intent-1", op.issueKey);
  });

  it("fails with media_reselect when a created or issued intent has no file to upload", async () => {
    const created = createResumedMediaSlotOperation({
      id: "intent-1",
      slot: 0,
      state: "created",
    });
    await expect(runMediaSlot("42", created, jest.fn())).resolves.toEqual({
      ok: false,
      failure: {
        operation: "media_reselect",
        code: "MEDIA_FILE_REQUIRED",
        slot: 0,
      },
    });

    const issued = createResumedMediaSlotOperation({
      id: "intent-1",
      slot: 1,
      state: "issued",
    });
    await expect(runMediaSlot("42", issued, jest.fn())).resolves.toEqual({
      ok: false,
      failure: {
        operation: "media_reselect",
        code: "MEDIA_FILE_REQUIRED",
        slot: 1,
      },
    });

    expect(createIntent).not.toHaveBeenCalled();
    expect(issueIntent).not.toHaveBeenCalled();
    expect(renewIntent).not.toHaveBeenCalled();
  });
});

it("fails with media_reselect for a brand-new slot given no file to hash", async () => {
  const op = createMediaSlotOperation(0);

  const result = await runMediaSlot("42", op, jest.fn());

  expect(result).toEqual({
    ok: false,
    failure: { operation: "media_reselect", code: "MEDIA_FILE_REQUIRED", slot: 0 },
  });
  expect(hash).not.toHaveBeenCalled();
  expect(createIntent).not.toHaveBeenCalled();
});
