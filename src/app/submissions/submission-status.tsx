"use client";

import { Button } from "@/components/ui/button";
import { useSubmission } from "./submission-provider";
import { describeFailure } from "./submission-messages";

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
    message = describeFailure(progress.failure?.code);
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
