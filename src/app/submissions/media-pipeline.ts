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

export type MediaSlotOperation = {
  file?: File;
  slot: number;
  mimeType: string;
  createIntentKey: string;
  issueKey: string;
  verifyKey: string;
  attachKey: string;
  declaredByteSize?: number;
  declaredSha256?: string;
  intentId?: string;
  issuedOnce?: boolean;
  renewKey?: string;
  uploaded?: boolean;
  verified?: boolean;
  attached?: boolean;
  attachmentId?: string;
};

/** The subset of a resumed media intent's state that still needs client action. */
export type ResumableMediaIntentSnapshot = {
  id: string;
  slot: number;
  state: "created" | "issued" | "verified";
};

export type MediaSlotPhase =
  | "hashing"
  | "creating-intent"
  | "authorizing"
  | "uploading"
  | "verifying"
  | "attaching";

export type MediaSlotFailureOperation =
  | "media_hash"
  | "media_intent"
  | "media_authorize"
  | "media_upload"
  | "media_verify"
  | "media_attach"
  | "media_reselect";

export type MediaSlotFailure = {
  operation: MediaSlotFailureOperation;
  code: string;
  field?: string;
  slot: number;
};

export type MediaSlotResult =
  | { ok: true }
  | { ok: false; failure: MediaSlotFailure };

const VERIFIED_STATES = new Set(["verified", "attached"]);

function failed(
  operation: MediaSlotFailureOperation,
  code: string,
  slot: number,
  field?: string
): MediaSlotResult {
  return {
    ok: false,
    failure: { operation, code, ...(field ? { field } : {}), slot },
  };
}

export function createMediaSlotOperation(
  slot: number,
  file?: File
): MediaSlotOperation {
  return {
    file,
    slot,
    mimeType: file?.type ?? "",
    createIntentKey: uuid(),
    issueKey: uuid(),
    verifyKey: uuid(),
    attachKey: uuid(),
  };
}

export function createMediaSlotOperations(files: File[]): MediaSlotOperation[] {
  return files.map((file, slot) => createMediaSlotOperation(slot, file));
}

/**
 * Rebuilds an in-flight-but-unattached media intent recovered from
 * `submissionMediaStateV3` into an operation `runMediaSlot` can continue.
 * `file` is only required when the intent has not reached `verified` yet -
 * the bytes behind a `created`/`issued` intent never survive a page reload.
 */
export function createResumedMediaSlotOperation(
  intent: ResumableMediaIntentSnapshot,
  file?: File
): MediaSlotOperation {
  const op = createMediaSlotOperation(intent.slot, file);
  op.intentId = intent.id;
  if (intent.state === "verified") {
    op.verified = true;
    op.uploaded = true;
    op.issuedOnce = true;
  } else if (intent.state === "issued") {
    op.issuedOnce = true;
  }
  return op;
}

export async function runMediaSlot(
  submissionId: string,
  op: MediaSlotOperation,
  onPhase: (phase: MediaSlotPhase) => void
): Promise<MediaSlotResult> {
  if (op.attached) return { ok: true };
  if (!op.file && !op.verified) {
    return failed("media_reselect", "MEDIA_FILE_REQUIRED", op.slot);
  }

  if (!op.intentId) {
    const file = op.file;
    if (!file) {
      return failed("media_reselect", "MEDIA_FILE_REQUIRED", op.slot);
    }
    if (op.declaredByteSize === undefined || op.declaredSha256 === undefined) {
      onPhase("hashing");
      try {
        op.declaredSha256 = await sha256Hex(file);
        op.declaredByteSize = file.size;
      } catch {
        return {
          ok: false,
          failure: {
            operation: "media_hash",
            code: "MEDIA_HASH_FAILED",
            slot: op.slot,
          },
        };
      }
    }

    onPhase("creating-intent");
    let created;
    try {
      created = await createMediaUploadIntent(
        {
          submissionId,
          mimeType: op.mimeType,
          declaredByteSize: op.declaredByteSize,
          declaredSha256: op.declaredSha256,
          slot: op.slot,
        },
        op.createIntentKey
      );
    } catch {
      return failed("media_intent", "MEDIA_INTENT_CREATE_FAILED", op.slot);
    }
    if (!created.ok) {
      return failed("media_intent", created.code, op.slot, created.field);
    }
    op.intentId = created.intent.id;
    if (VERIFIED_STATES.has(created.intent.state)) op.verified = true;
    if (created.intent.state !== "created") op.issuedOnce = true;
  }

  const intentId = op.intentId;

  if (!op.verified) {
    if (!op.uploaded) {
      const file = op.file;
      if (!file) {
        return failed("media_reselect", "MEDIA_FILE_REQUIRED", op.slot);
      }
      onPhase("authorizing");
      let authorized;
      try {
        if (op.issuedOnce) {
          op.renewKey ??= uuid();
          authorized = await renewMediaUploadIntent(intentId, op.renewKey);
        } else {
          authorized = await issueMediaUploadIntent(intentId, op.issueKey);
        }
      } catch {
        return failed(
          "media_authorize",
          op.issuedOnce ? "MEDIA_RENEW_FAILED" : "MEDIA_ISSUE_FAILED",
          op.slot
        );
      }
      if (!authorized.ok) {
        if (
          !op.issuedOnce &&
          authorized.code === "UPLOAD_AUTHORIZATION_EXPIRED"
        ) {
          op.issuedOnce = true;
        }
        return failed("media_authorize", authorized.code, op.slot);
      }
      op.issuedOnce = true;
      op.renewKey = undefined;

      onPhase("uploading");
      const uploaded = await postDirectUpload(
        authorized.upload.url,
        authorized.upload.fields,
        file
      );
      if (!uploaded) {
        return failed("media_upload", "MEDIA_UPLOAD_FAILED", op.slot);
      }
      op.uploaded = true;
    }

    onPhase("verifying");
    let verified;
    try {
      verified = await verifyMediaUploadIntent(intentId, op.verifyKey);
    } catch {
      return failed("media_verify", "MEDIA_VERIFY_FAILED", op.slot);
    }
    if (!verified.ok) {
      return failed("media_verify", verified.code, op.slot);
    }
    if (!VERIFIED_STATES.has(verified.intent.state)) {
      return failed(
        "media_verify",
        verified.intent.failureCode || "MEDIA_VERIFICATION_FAILED",
        op.slot
      );
    }
    op.verified = true;
  }

  onPhase("attaching");
  let attached;
  try {
    attached = await attachVerifiedMedia(intentId, op.attachKey);
  } catch {
    return failed("media_attach", "MEDIA_ATTACH_FAILED", op.slot);
  }
  if (!attached.ok) {
    return failed("media_attach", attached.code, op.slot);
  }
  if (
    attached.attachment.submissionId !== submissionId ||
    attached.attachment.position !== op.slot ||
    attached.attachment.state !== "attached"
  ) {
    return failed("media_attach", "INVALID_MEDIA_ATTACHMENT_RESPONSE", op.slot);
  }
  op.attached = true;
  op.attachmentId = attached.attachment.id;
  return { ok: true };
}
