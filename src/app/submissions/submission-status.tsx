"use client";

import { Button } from "@/components/ui/button";
import { useSubmission } from "./submission-provider";

const FAILURE_MESSAGES: Record<string, string> = {
  AUTHENTICATION_REQUIRED:
    "Your session is no longer active. Sign in and retry.",
  DUPLICATE_SUBMISSION: "A matching place or submission already exists nearby.",
  IDEMPOTENCY_CONFLICT: "This retry no longer matches the original operation.",
  INVALID_SUBMISSION: "Review the highlighted submission fields and try again.",
  MEDIA_NOT_READY: "The submission cannot be finalized while media is pending.",
  SUBMISSION_CREATE_FAILED:
    "The draft could not be created. You can safely retry.",
  SUBMISSION_FINALIZE_FAILED:
    "The draft was saved but could not be finalized. Retrying will not create another draft.",
  TOO_MANY_MEDIA_FILES: "Choose at most 3 photos.",
  UNSUPPORTED_MEDIA_TYPE: "Photos must be JPEG, PNG, or WebP.",
  MEDIA_TOO_LARGE: "Each photo must be 5 MB or smaller.",
  MEDIA_LIMIT_REACHED: "This submission already has three photos.",
  MEDIA_SLOT_CONFLICT: "A photo slot conflict occurred. You can safely retry.",
  MEDIA_DIGEST_CONFLICT: "That photo is already attached to this submission.",
  MEDIA_INTENT_EXPIRED:
    "The photo upload window expired. You can safely retry.",
  UPLOAD_AUTHORIZATION_EXPIRED:
    "The photo upload window expired. You can safely retry.",
  MEDIA_STORAGE_UNAVAILABLE:
    "Photo storage is temporarily unavailable. You can safely retry.",
  MEDIA_UPLOAD_FAILED: "The photo upload failed. You can safely retry.",
  MEDIA_VERIFICATION_FAILED:
    "The uploaded photo could not be verified. You can safely retry.",
};

const PHASE_MESSAGES: Partial<Record<string, string>> = {
  creating: "Creating a private draft…",
  uploading: "Uploading photo…",
  verifying: "Verifying photo…",
  attaching: "Attaching photo…",
  finalizing: "Finalizing the draft for review…",
};

export function SubmissionStatus() {
  const { progress, retry, dismiss } = useSubmission();
  if (progress.phase === "idle") return null;

  const isFailure = progress.phase === "failed";
  const retryable = isFailure && progress.failure?.operation !== "validation";
  let message = PHASE_MESSAGES[progress.phase] ?? "Creating a private draft…";
  if (
    (progress.phase === "uploading" ||
      progress.phase === "verifying" ||
      progress.phase === "attaching") &&
    progress.mediaCount !== undefined &&
    progress.mediaIndex !== undefined
  ) {
    message = `${message.replace("…", "")} (${progress.mediaIndex + 1} of ${
      progress.mediaCount
    })…`;
  }
  if (progress.phase === "pending") {
    message = `Submission ${progress.submissionId} is pending review.`;
  }
  if (isFailure) {
    message =
      FAILURE_MESSAGES[progress.failure?.code ?? ""] ??
      "The submission could not be completed. You can safely retry.";
  }

  return (
    <aside
      aria-live="polite"
      className="fixed bottom-16 left-1/2 z-[70] flex w-[min(32rem,calc(100%-2rem))] -translate-x-1/2 items-center justify-between gap-3 rounded-md border bg-background p-3 shadow-lg"
      data-submission-phase={progress.phase}
      role="status"
    >
      <div>
        <p className={isFailure ? "text-red-700" : "text-foreground"}>
          {message}
        </p>
        {isFailure && progress.failure?.field ? (
          <p className="text-xs text-muted-foreground">
            Field: {progress.failure.field}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 gap-2">
        {retryable ? (
          <Button onClick={retry} size="sm" type="button">
            Retry
          </Button>
        ) : null}
        {isFailure || progress.phase === "pending" ? (
          <Button onClick={dismiss} size="sm" type="button" variant="outline">
            Dismiss
          </Button>
        ) : null}
      </div>
    </aside>
  );
}
