"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { v4 as uuid } from "uuid";

import {
  createSubmissionV3,
  editSubmissionV3,
  finalizeSubmissionV3,
  loadSubmissionMediaStateV3,
  reorderSubmissionMediaV3,
  type ReorderSubmissionMediaResult,
  type SubmissionActionResult,
  type SubmissionContentActionResult,
  type SubmissionMediaStateSnapshot,
} from "./actions";
import {
  expireMediaUploadIntent,
  mediaAttachmentPreviewV3,
  removeAttachedMedia,
} from "./media-actions";
import {
  createMediaSlotOperation,
  createMediaSlotOperations,
  createResumedMediaSlotOperation,
  runMediaSlot,
  type MediaSlotFailureOperation,
  type MediaSlotOperation,
  type MediaSlotPhase,
} from "./media-pipeline";
import { MAX_MEDIA_FILES, validateMediaFiles } from "./media-schema";
import {
  M3SubmissionSchema,
  type M3SubmissionInput,
  type ValidatedM3SubmissionInput,
} from "./m3-schema";

const RESUME_LOCATOR_STORAGE_KEY = "smokemap.m3.submission.locator";

function readStoredLocator(): string | null {
  try {
    return window.localStorage.getItem(RESUME_LOCATOR_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredLocator(locator: string | null) {
  try {
    if (locator) {
      window.localStorage.setItem(RESUME_LOCATOR_STORAGE_KEY, locator);
    } else {
      window.localStorage.removeItem(RESUME_LOCATOR_STORAGE_KEY);
    }
  } catch {
    // Resume is a convenience; a blocked or full store must not break submission.
  }
}

const ACTIVE_MEDIA_INTENT_STATES = new Set(["created", "issued", "verified"]);

// A media intent the backend can never move forward from a draft: it neither
// reserves its slot (a new upload may reuse it, mirroring `create_upload_intent`'s
// own RESERVING_STATES) nor counts as attached. `finalizeSubmissionV3` rejects
// every submission with an intent in one of these states until the backend's own
// cleanup path retires it to `deleted`, so the client must refuse to finalize too
// instead of surfacing the backend's opaque MEDIA_NOT_READY conflict.
const BLOCKING_TERMINAL_INTENT_STATES = new Set([
  "failed",
  "expired",
  "cleanup_pending",
]);

export type RestoredMediaAttachment = {
  attachmentId: string;
  mediaIntentId: string;
  position: number;
};

export type RestoredActiveMediaIntent = {
  intentId: string;
  slot: number;
  state: "created" | "issued" | "verified";
  failureCode?: string;
};

export type RestoredBlockedMediaIntent = {
  intentId: string;
  slot: number | null;
  state: string;
  failureCode?: string;
};

export type RestoredSubmission = {
  submissionId: string;
  submissionState: "draft" | "pending";
  input: ValidatedM3SubmissionInput;
  attachments: RestoredMediaAttachment[];
  activeIntents: RestoredActiveMediaIntent[];
  blockedIntents: RestoredBlockedMediaIntent[];
};

/**
 * Whether a resumed media operation's failure means the backend already moved
 * the intent to a terminal, unretryable state (so the client must stop
 * offering retry and start blocking finalization), as opposed to a transient
 * or client-only failure that leaves the intent exactly as it was.
 *
 * `media_verify` mutates the intent to `cleanup_pending` for every outcome
 * except the network-only `MEDIA_VERIFY_FAILED` fallback (the request never
 * reached the server, so its state is unchanged); `media_authorize` and
 * `media_attach` only mutate it when the backend reports the intent's
 * absolute deadline has passed. Every other resumed-op failure
 * (`media_hash`, `media_intent`, `media_upload`, `media_reselect`) never
 * touches server-side intent state.
 */
function resumedMediaFailureIsTerminal(failure: {
  operation: MediaSlotFailureOperation;
  code: string;
}): boolean {
  if (failure.operation === "media_verify") {
    return failure.code !== "MEDIA_VERIFY_FAILED";
  }
  if (failure.operation === "media_authorize" || failure.operation === "media_attach") {
    return failure.code === "MEDIA_INTENT_EXPIRED";
  }
  return false;
}

export type ResumeLoadStatus = "idle" | "loading" | "ready" | "not_found" | "error";

export type ResumeActionOperation =
  | "resume_edit"
  | "resume_media_validation"
  | MediaSlotFailureOperation
  | "resume_remove"
  | "resume_reorder"
  | "resume_finalize";

export type ResumeActionPhase =
  | "idle"
  | "editing"
  | MediaSlotPhase
  | "removing"
  | "reordering"
  | "finalizing"
  | "failed";

export type ResumeActionProgress = {
  phase: ResumeActionPhase;
  slot?: number;
  failure?: {
    operation: ResumeActionOperation;
    code: string;
    field?: string;
  };
};

const initialResumeAction: ResumeActionProgress = { phase: "idle" };

function toRestoredSubmission(
  state: SubmissionMediaStateSnapshot
): RestoredSubmission | null {
  const parsedInput = M3SubmissionSchema.safeParse({
    name: state.submission.name,
    categorySlug: state.submission.categorySlug,
    longitude: state.submission.longitude,
    latitude: state.submission.latitude,
    addressLabel: state.submission.addressLabel ?? "",
    tags: state.submission.tags ?? [],
    description: state.submission.description ?? "",
    website: state.submission.website ?? "",
  });
  if (!parsedInput.success) return null;

  const attachments = state.attachments
    .map((attachment) => ({
      attachmentId: attachment.id,
      mediaIntentId: attachment.mediaIntentId,
      position: attachment.position,
    }))
    .sort((a, b) => a.position - b.position);

  const activeIntents = state.mediaIntents
    .filter(
      (intent) =>
        intent.slot !== null && ACTIVE_MEDIA_INTENT_STATES.has(intent.state)
    )
    .map((intent) => ({
      intentId: intent.id,
      slot: intent.slot as number,
      state: intent.state as "created" | "issued" | "verified",
      ...(intent.failureCode ? { failureCode: intent.failureCode } : {}),
    }))
    .sort((a, b) => a.slot - b.slot);

  const blockedIntents = state.mediaIntents
    .filter((intent) => BLOCKING_TERMINAL_INTENT_STATES.has(intent.state))
    .map((intent) => ({
      intentId: intent.id,
      slot: intent.slot,
      state: intent.state,
      ...(intent.failureCode ? { failureCode: intent.failureCode } : {}),
    }));

  return {
    submissionId: state.submission.id,
    submissionState: state.submission.state,
    input: parsedInput.data,
    attachments,
    activeIntents,
    blockedIntents,
  };
}

export type SubmissionFailureOperation =
  | "validation"
  | "create"
  | "finalize"
  | MediaSlotFailureOperation;

export type SubmissionProgressPhase =
  | "idle"
  | "creating"
  | "uploading"
  | "verifying"
  | "attaching"
  | "finalizing"
  | "pending"
  | "failed";

export type SubmissionProgress = {
  phase: SubmissionProgressPhase;
  submissionId?: string;
  mediaIndex?: number;
  mediaCount?: number;
  failure?: {
    operation: SubmissionFailureOperation;
    code: string;
    field?: string;
  };
};

type SubmissionOperation = {
  input: ValidatedM3SubmissionInput;
  createKey: string;
  finalizeKey: string;
  mediaOps: MediaSlotOperation[];
  submissionId?: string;
};

type SubmissionContextValue = {
  progress: SubmissionProgress;
  active: boolean;
  submit: (input: M3SubmissionInput, images?: File[]) => boolean;
  retry: () => boolean;
  dismiss: () => void;
  resumeStatus: ResumeLoadStatus;
  restored: RestoredSubmission | null;
  resumeAction: ResumeActionProgress;
  resumeActive: boolean;
  editRestored: (input: M3SubmissionInput) => boolean;
  replaceRestoredMedia: (file: File) => boolean;
  retryRestoredMedia: (intentId: string, file?: File) => boolean;
  removeRestoredMedia: (attachmentId: string) => boolean;
  reorderRestoredMedia: (orderedAttachmentIds: string[]) => boolean;
  finalizeRestored: () => boolean;
  discardRestored: () => void;
  dismissResumeAction: () => void;
  previewRestoredMedia: (
    attachmentId: string
  ) => ReturnType<typeof mediaAttachmentPreviewV3>;
};

function mediaProgressPhase(phase: MediaSlotPhase): SubmissionProgressPhase {
  if (phase === "verifying") return "verifying";
  if (phase === "attaching") return "attaching";
  return "uploading";
}

const initialProgress: SubmissionProgress = { phase: "idle" };
const SubmissionContext = createContext<SubmissionContextValue | null>(null);

function failedProgress(
  operation: SubmissionFailureOperation,
  result: SubmissionActionResult,
  submissionId?: string
): SubmissionProgress {
  return result.ok
    ? initialProgress
    : {
        phase: "failed",
        submissionId,
        failure: {
          operation,
          code: result.code,
          ...(result.field ? { field: result.field } : {}),
        },
      };
}

export function SubmissionProvider({ children }: PropsWithChildren) {
  const [progress, setProgress] = useState<SubmissionProgress>(initialProgress);
  const operationRef = useRef<SubmissionOperation | null>(null);
  const activeRef = useRef(false);
  const mountedRef = useRef(true);

  const [resumeStatus, setResumeStatus] = useState<ResumeLoadStatus>("idle");
  const [restored, setRestored] = useState<RestoredSubmission | null>(null);
  const [resumeAction, setResumeAction] = useState<ResumeActionProgress>(
    initialResumeAction
  );
  const restoredRef = useRef<RestoredSubmission | null>(null);
  const resumeActiveRef = useRef(false);

  // Persists one idempotency key per logical resume action across a lost
  // response: if the request actually reached the backend before the
  // response was lost, a retry that reused a *different* key would replay
  // as a brand-new operation, and for `finalize`/`remove` land on a
  // submission/intent state the retry no longer expects (e.g. "only a draft
  // submission can be finalized"), reporting a confusing failure for an
  // action that already succeeded. Keyed by a signature of the action's
  // target/payload so a genuinely new invocation (different input, a
  // different attachment) still mints a fresh key.
  const resumeActionKeysRef = useRef<
    Partial<Record<"edit" | "remove" | "reorder" | "finalize", { key: string; signature: string }>>
  >({});

  const takeResumeActionKey = useCallback(
    (kind: "edit" | "remove" | "reorder" | "finalize", signature: string) => {
      const existing = resumeActionKeysRef.current[kind];
      if (existing && existing.signature === signature) return existing.key;
      const key = uuid();
      resumeActionKeysRef.current[kind] = { key, signature };
      return key;
    },
    []
  );

  const clearResumeActionKey = useCallback(
    (kind: "edit" | "remove" | "reorder" | "finalize") => {
      delete resumeActionKeysRef.current[kind];
    },
    []
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const setProgressIfMounted = useCallback((next: SubmissionProgress) => {
    if (mountedRef.current) setProgress(next);
  }, []);

  const setRestoredIfMounted = useCallback((next: RestoredSubmission | null) => {
    restoredRef.current = next;
    if (mountedRef.current) setRestored(next);
  }, []);

  const setResumeStatusIfMounted = useCallback((next: ResumeLoadStatus) => {
    if (mountedRef.current) setResumeStatus(next);
  }, []);

  const setResumeActionIfMounted = useCallback(
    (next: ResumeActionProgress) => {
      if (mountedRef.current) setResumeAction(next);
    },
    []
  );

  useEffect(() => {
    const locator = readStoredLocator();
    if (!locator) return;
    setResumeStatusIfMounted("loading");
    void (async () => {
      let result;
      try {
        result = await loadSubmissionMediaStateV3(locator);
      } catch {
        result = { ok: false, code: "SUBMISSION_MEDIA_STATE_FAILED" } as const;
      }
      if (!result.ok) {
        // Only NOT_FOUND is a definitive signal that this locator is stale
        // (the submission is gone or no longer this user's). Every other
        // failure - a lapsed session, a dropped request, a transient backend
        // error - says nothing about whether the draft still exists, so the
        // locator must survive it; otherwise a momentary auth hiccup on one
        // page load would silently and permanently strand the user's draft.
        if (result.code === "NOT_FOUND") writeStoredLocator(null);
        setRestoredIfMounted(null);
        setResumeStatusIfMounted(result.code === "NOT_FOUND" ? "not_found" : "error");
        return;
      }
      const next = toRestoredSubmission(result.state);
      if (!next) {
        writeStoredLocator(null);
        setRestoredIfMounted(null);
        setResumeStatusIfMounted("error");
        return;
      }
      setRestoredIfMounted(next);
      setResumeStatusIfMounted("ready");
    })();
    // Runs once, on mount, to opportunistically recover a locator left behind
    // by an earlier tab/session; explicit resume actions never re-trigger it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = useCallback(
    async (operation: SubmissionOperation) => {
      if (!operation.submissionId) {
        setProgressIfMounted({ phase: "creating" });
        let created: SubmissionActionResult;
        try {
          created = await createSubmissionV3(
            operation.input,
            operation.createKey
          );
        } catch {
          created = { ok: false, code: "SUBMISSION_CREATE_FAILED" };
        }
        if (!created.ok) {
          activeRef.current = false;
          setProgressIfMounted(failedProgress("create", created));
          return;
        }
        operation.submissionId = created.submission.id;
        writeStoredLocator(operation.submissionId);
      }

      const submissionId = operation.submissionId;
      if (!mountedRef.current) {
        activeRef.current = false;
        return;
      }

      for (const mediaOp of operation.mediaOps) {
        if (mediaOp.attached) continue;
        const result = await runMediaSlot(submissionId, mediaOp, (phase) => {
          setProgressIfMounted({
            phase: mediaProgressPhase(phase),
            submissionId,
            mediaIndex: mediaOp.slot,
            mediaCount: operation.mediaOps.length,
          });
        });
        if (!result.ok) {
          activeRef.current = false;
          setProgressIfMounted({
            phase: "failed",
            submissionId,
            mediaIndex: mediaOp.slot,
            mediaCount: operation.mediaOps.length,
            failure: {
              operation: result.failure.operation,
              code: result.failure.code,
              ...(result.failure.field ? { field: result.failure.field } : {}),
            },
          });
          return;
        }
        if (!mountedRef.current) {
          activeRef.current = false;
          return;
        }
      }

      setProgressIfMounted({ phase: "finalizing", submissionId });
      let finalized: SubmissionActionResult;
      try {
        finalized = await finalizeSubmissionV3(
          submissionId,
          operation.finalizeKey
        );
      } catch {
        finalized = { ok: false, code: "SUBMISSION_FINALIZE_FAILED" };
      }
      activeRef.current = false;
      if (!finalized.ok) {
        setProgressIfMounted(
          failedProgress("finalize", finalized, submissionId)
        );
        return;
      }
      operationRef.current = null;
      // This submission is now pending review, so it must stop being offered
      // as a resumable draft: a stale locator here would make every future
      // mount "recover" an already-finalized submission indefinitely.
      writeStoredLocator(null);
      if (restoredRef.current?.submissionId === finalized.submission.id) {
        setRestoredIfMounted(null);
        setResumeStatusIfMounted("idle");
      }
      setProgressIfMounted({
        phase: "pending",
        submissionId: finalized.submission.id,
      });
    },
    [setProgressIfMounted, setRestoredIfMounted, setResumeStatusIfMounted]
  );

  const submit = useCallback(
    (input: M3SubmissionInput, images: File[] = []) => {
      if (activeRef.current || operationRef.current) return false;
      const parsed = M3SubmissionSchema.safeParse(input);
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        setProgressIfMounted({
          phase: "failed",
          failure: {
            operation: "validation",
            code: "INVALID_SUBMISSION",
            field: String(issue?.path[0] ?? "submission"),
          },
        });
        return false;
      }

      const mediaFailure = validateMediaFiles(images);
      if (mediaFailure) {
        setProgressIfMounted({
          phase: "failed",
          failure: {
            operation: "validation",
            code: mediaFailure.code,
            field: mediaFailure.field,
          },
        });
        return false;
      }

      const operation: SubmissionOperation = {
        input: parsed.data,
        createKey: uuid(),
        finalizeKey: uuid(),
        mediaOps: createMediaSlotOperations(images),
      };
      operationRef.current = operation;
      activeRef.current = true;
      void run(operation);
      return true;
    },
    [run, setProgressIfMounted]
  );

  const retry = useCallback(() => {
    const operation = operationRef.current;
    if (!operation || activeRef.current || progress.phase !== "failed") {
      return false;
    }
    activeRef.current = true;
    void run(operation);
    return true;
  }, [progress.phase, run]);

  const dismiss = useCallback(() => {
    if (activeRef.current) return;
    operationRef.current = null;
    setProgressIfMounted(initialProgress);
  }, [setProgressIfMounted]);

  const runResumedMediaOperation = useCallback(
    (current: RestoredSubmission, op: MediaSlotOperation) => {
      resumeActiveRef.current = true;
      const initialPhase: MediaSlotPhase = op.verified
        ? "attaching"
        : op.intentId
        ? "authorizing"
        : "hashing";
      setResumeActionIfMounted({ phase: initialPhase, slot: op.slot });
      void (async () => {
        const result = await runMediaSlot(current.submissionId, op, (phase) => {
          setResumeActionIfMounted({ phase, slot: op.slot });
        });
        resumeActiveRef.current = false;
        if (!mountedRef.current) return;
        if (!result.ok) {
          setResumeActionIfMounted({
            phase: "failed",
            slot: op.slot,
            failure: {
              operation: result.failure.operation,
              code: result.failure.code,
              ...(result.failure.field ? { field: result.failure.field } : {}),
            },
          });
          if (op.intentId && resumedMediaFailureIsTerminal(result.failure)) {
            const intentId = op.intentId;
            setRestoredIfMounted({
              ...current,
              activeIntents: current.activeIntents.filter(
                (intent) => intent.intentId !== intentId
              ),
              blockedIntents: [
                ...current.blockedIntents.filter(
                  (intent) => intent.intentId !== intentId
                ),
                {
                  intentId,
                  slot: op.slot,
                  state: "cleanup_pending",
                  failureCode: result.failure.code,
                },
              ],
            });
          }
          return;
        }
        const attachment: RestoredMediaAttachment = {
          attachmentId: op.attachmentId as string,
          mediaIntentId: op.intentId as string,
          position: op.slot,
        };
        setRestoredIfMounted({
          ...current,
          attachments: [...current.attachments, attachment].sort(
            (a, b) => a.position - b.position
          ),
          activeIntents: current.activeIntents.filter(
            (intent) => intent.slot !== op.slot
          ),
        });
        setResumeActionIfMounted(initialResumeAction);
      })();
      return true;
    },
    [setResumeActionIfMounted, setRestoredIfMounted]
  );

  const editRestored = useCallback(
    (input: M3SubmissionInput) => {
      const current = restoredRef.current;
      if (
        !current ||
        current.submissionState !== "draft" ||
        resumeActiveRef.current
      ) {
        return false;
      }
      const parsed = M3SubmissionSchema.safeParse(input);
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        setResumeActionIfMounted({
          phase: "failed",
          failure: {
            operation: "resume_edit",
            code: "INVALID_SUBMISSION",
            field: String(issue?.path[0] ?? "submission"),
          },
        });
        return false;
      }
      resumeActiveRef.current = true;
      setResumeActionIfMounted({ phase: "editing" });
      const key = takeResumeActionKey("edit", JSON.stringify(parsed.data));
      void (async () => {
        let result: SubmissionContentActionResult;
        try {
          result = await editSubmissionV3(
            current.submissionId,
            parsed.data,
            key
          );
        } catch {
          result = { ok: false, code: "SUBMISSION_EDIT_FAILED" };
        }
        resumeActiveRef.current = false;
        if (!mountedRef.current) return;
        if (!result.ok) {
          setResumeActionIfMounted({
            phase: "failed",
            failure: {
              operation: "resume_edit",
              code: result.code,
              ...(result.field ? { field: result.field } : {}),
            },
          });
          return;
        }
        clearResumeActionKey("edit");
        setRestoredIfMounted({ ...current, input: parsed.data });
        setResumeActionIfMounted(initialResumeAction);
      })();
      return true;
    },
    [setResumeActionIfMounted, setRestoredIfMounted, takeResumeActionKey, clearResumeActionKey]
  );

  const replaceRestoredMedia = useCallback(
    (file: File) => {
      const current = restoredRef.current;
      if (
        !current ||
        current.submissionState !== "draft" ||
        resumeActiveRef.current
      ) {
        return false;
      }
      const occupied = new Set<number>([
        ...current.attachments.map((attachment) => attachment.position),
        ...current.activeIntents.map((intent) => intent.slot),
      ]);
      let freeSlot = -1;
      for (let candidate = 0; candidate < MAX_MEDIA_FILES; candidate += 1) {
        if (!occupied.has(candidate)) {
          freeSlot = candidate;
          break;
        }
      }
      if (freeSlot === -1) {
        setResumeActionIfMounted({
          phase: "failed",
          failure: {
            operation: "resume_media_validation",
            code: "TOO_MANY_MEDIA_FILES",
          },
        });
        return false;
      }
      const mediaFailure = validateMediaFiles([file]);
      if (mediaFailure) {
        setResumeActionIfMounted({
          phase: "failed",
          slot: freeSlot,
          failure: {
            operation: "resume_media_validation",
            code: mediaFailure.code,
            field: mediaFailure.field,
          },
        });
        return false;
      }
      return runResumedMediaOperation(
        current,
        createMediaSlotOperation(freeSlot, file)
      );
    },
    [runResumedMediaOperation, setResumeActionIfMounted]
  );

  const retryRestoredMedia = useCallback(
    (intentId: string, file?: File) => {
      const current = restoredRef.current;
      if (
        !current ||
        current.submissionState !== "draft" ||
        resumeActiveRef.current
      ) {
        return false;
      }
      const intent = current.activeIntents.find(
        (entry) => entry.intentId === intentId
      );
      if (!intent) return false;
      if (file) {
        const mediaFailure = validateMediaFiles([file]);
        if (mediaFailure) {
          setResumeActionIfMounted({
            phase: "failed",
            slot: intent.slot,
            failure: {
              operation: "resume_media_validation",
              code: mediaFailure.code,
              field: mediaFailure.field,
            },
          });
          return false;
        }
      }
      const op = createResumedMediaSlotOperation(
        { id: intent.intentId, slot: intent.slot, state: intent.state },
        file
      );
      return runResumedMediaOperation(current, op);
    },
    [runResumedMediaOperation, setResumeActionIfMounted]
  );

  const removeRestoredMedia = useCallback(
    (attachmentId: string) => {
      const current = restoredRef.current;
      if (
        !current ||
        current.submissionState !== "draft" ||
        resumeActiveRef.current
      ) {
        return false;
      }
      const attachment = current.attachments.find(
        (entry) => entry.attachmentId === attachmentId
      );
      if (!attachment) return false;
      resumeActiveRef.current = true;
      setResumeActionIfMounted({ phase: "removing", slot: attachment.position });
      const key = takeResumeActionKey("remove", attachment.mediaIntentId);
      void (async () => {
        let result;
        try {
          result = await removeAttachedMedia(attachment.mediaIntentId, key);
        } catch {
          result = { ok: false, code: "MEDIA_REMOVE_FAILED" } as const;
        }
        resumeActiveRef.current = false;
        if (!mountedRef.current) return;
        if (!result.ok) {
          setResumeActionIfMounted({
            phase: "failed",
            slot: attachment.position,
            failure: { operation: "resume_remove", code: result.code },
          });
          return;
        }
        clearResumeActionKey("remove");
        setRestoredIfMounted({
          ...current,
          attachments: current.attachments.filter(
            (entry) => entry.attachmentId !== attachmentId
          ),
          // The freed intent moves to `cleanup_pending`, not away entirely:
          // it still blocks finalization until the backend's own cleanup
          // path retires it, so resume tracking must not drop it silently.
          blockedIntents: [
            ...current.blockedIntents,
            {
              intentId: result.intent.id,
              slot: result.intent.slot,
              state: result.intent.state,
              ...(result.intent.failureCode
                ? { failureCode: result.intent.failureCode }
                : {}),
            },
          ],
        });
        setResumeActionIfMounted(initialResumeAction);
      })();
      return true;
    },
    [setResumeActionIfMounted, setRestoredIfMounted, takeResumeActionKey, clearResumeActionKey]
  );

  const reorderRestoredMedia = useCallback(
    (orderedAttachmentIds: string[]) => {
      const current = restoredRef.current;
      if (
        !current ||
        current.submissionState !== "draft" ||
        resumeActiveRef.current
      ) {
        return false;
      }
      resumeActiveRef.current = true;
      setResumeActionIfMounted({ phase: "reordering" });
      const key = takeResumeActionKey(
        "reorder",
        JSON.stringify(orderedAttachmentIds)
      );
      void (async () => {
        let result: ReorderSubmissionMediaResult;
        try {
          result = await reorderSubmissionMediaV3(
            current.submissionId,
            orderedAttachmentIds,
            key
          );
        } catch {
          result = { ok: false, code: "SUBMISSION_REORDER_MEDIA_FAILED" };
        }
        resumeActiveRef.current = false;
        if (!mountedRef.current) return;
        if (!result.ok) {
          setResumeActionIfMounted({
            phase: "failed",
            failure: {
              operation: "resume_reorder",
              code: result.code,
              ...(result.field ? { field: result.field } : {}),
            },
          });
          return;
        }
        clearResumeActionKey("reorder");
        const byId = new Map(
          current.attachments.map((attachment) => [
            attachment.attachmentId,
            attachment,
          ])
        );
        const attachments = result.orderedAttachmentIds
          .map((id, position) => {
            const existing = byId.get(id);
            return existing ? { ...existing, position } : null;
          })
          .filter(
            (entry): entry is RestoredMediaAttachment => entry !== null
          );
        setRestoredIfMounted({ ...current, attachments });
        setResumeActionIfMounted(initialResumeAction);
      })();
      return true;
    },
    [setResumeActionIfMounted, setRestoredIfMounted, takeResumeActionKey, clearResumeActionKey]
  );

  const finalizeRestored = useCallback(() => {
    const current = restoredRef.current;
    if (
      !current ||
      current.submissionState !== "draft" ||
      current.activeIntents.length > 0 ||
      current.blockedIntents.length > 0 ||
      resumeActiveRef.current
    ) {
      return false;
    }
    resumeActiveRef.current = true;
    setResumeActionIfMounted({ phase: "finalizing" });
    const key = takeResumeActionKey("finalize", current.submissionId);
    void (async () => {
      let result: SubmissionActionResult;
      try {
        result = await finalizeSubmissionV3(current.submissionId, key);
      } catch {
        result = { ok: false, code: "SUBMISSION_FINALIZE_FAILED" };
      }
      resumeActiveRef.current = false;
      if (!mountedRef.current) return;
      if (!result.ok) {
        setResumeActionIfMounted({
          phase: "failed",
          failure: { operation: "resume_finalize", code: result.code },
        });
        return;
      }
      clearResumeActionKey("finalize");
      writeStoredLocator(null);
      setRestoredIfMounted(null);
      setResumeStatusIfMounted("idle");
      setResumeActionIfMounted(initialResumeAction);
      setProgressIfMounted({
        phase: "pending",
        submissionId: result.submission.id,
      });
    })();
    return true;
  }, [
    setProgressIfMounted,
    setResumeActionIfMounted,
    setResumeStatusIfMounted,
    setRestoredIfMounted,
    takeResumeActionKey,
    clearResumeActionKey,
  ]);

  const discardRestored = useCallback(() => {
    if (resumeActiveRef.current) return;
    const current = restoredRef.current;
    // Best-effort reap of any intent already past its absolute expiry: the
    // backend refuses expireMediaUploadIntent before that deadline, so this
    // is never awaited or surfaced as a discard failure - it only prevents
    // an intent this tab is abandoning from outliving its own draft's TTL.
    if (current) {
      for (const intent of current.activeIntents) {
        void expireMediaUploadIntent(intent.intentId, uuid()).catch(() => {});
      }
    }
    resumeActionKeysRef.current = {};
    writeStoredLocator(null);
    setRestoredIfMounted(null);
    setResumeStatusIfMounted("idle");
    setResumeActionIfMounted(initialResumeAction);
  }, [setRestoredIfMounted, setResumeActionIfMounted, setResumeStatusIfMounted]);

  const dismissResumeAction = useCallback(() => {
    if (resumeActiveRef.current) return;
    setResumeActionIfMounted(initialResumeAction);
  }, [setResumeActionIfMounted]);

  const previewRestoredMedia = useCallback(
    (attachmentId: string) => mediaAttachmentPreviewV3(attachmentId),
    []
  );

  const value = useMemo<SubmissionContextValue>(
    () => ({
      progress,
      active:
        progress.phase === "creating" ||
        progress.phase === "uploading" ||
        progress.phase === "verifying" ||
        progress.phase === "attaching" ||
        progress.phase === "finalizing",
      submit,
      retry,
      dismiss,
      resumeStatus,
      restored,
      resumeAction,
      resumeActive: resumeAction.phase !== "idle" && resumeAction.phase !== "failed",
      editRestored,
      replaceRestoredMedia,
      retryRestoredMedia,
      removeRestoredMedia,
      reorderRestoredMedia,
      finalizeRestored,
      discardRestored,
      dismissResumeAction,
      previewRestoredMedia,
    }),
    [
      dismiss,
      discardRestored,
      dismissResumeAction,
      editRestored,
      finalizeRestored,
      previewRestoredMedia,
      progress,
      removeRestoredMedia,
      reorderRestoredMedia,
      replaceRestoredMedia,
      restored,
      resumeAction,
      resumeStatus,
      retry,
      retryRestoredMedia,
      submit,
    ]
  );

  return (
    <SubmissionContext.Provider value={value}>
      {children}
    </SubmissionContext.Provider>
  );
}

export function useSubmission() {
  const context = useContext(SubmissionContext);
  if (!context)
    throw new Error("useSubmission must be used within SubmissionProvider");
  return context;
}
