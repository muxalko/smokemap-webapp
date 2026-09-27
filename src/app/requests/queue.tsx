"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  approveSubmission,
  deleteSubmission,
  loadModerationPreview,
  loadModerationQueue,
} from "./actions";
import {
  MAX_REVIEW_COMMENT_LENGTH,
  type ModerationAttachment,
  type ModerationFailure,
  type ModerationQueueItem,
} from "./types";

type QueueStatus =
  | "loading"
  | "ready"
  | "empty"
  | "error"
  | "authentication"
  | "authorization";

type ReviewIntent = {
  kind: "approve" | "delete";
  item: ModerationQueueItem;
  idempotencyKey: string;
};

const authenticationCodes = new Set([
  "AUTHENTICATION_REQUIRED",
  "UNAUTHENTICATED",
]);
const conflictCodes = new Set([
  "DUPLICATE_SUBMISSION",
  "IDEMPOTENCY_CONFLICT",
  "INVALID_SUBMISSION_STATE",
  "MEDIA_CLEANUP_REQUIRED",
  "NOT_FOUND",
]);

function actionKey(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `moderation-${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
}

function queueFailureStatus(code: string): QueueStatus {
  if (authenticationCodes.has(code)) return "authentication";
  if (code === "FORBIDDEN") return "authorization";
  return "error";
}

function failureMessage(failure: ModerationFailure): string {
  if (authenticationCodes.has(failure.code)) {
    return "Your session is no longer active. Sign in again before reviewing submissions.";
  }
  if (failure.code === "FORBIDDEN") {
    return "Your account no longer has permission to moderate this queue.";
  }
  if (failure.code === "DUPLICATE_SUBMISSION") {
    return "Approval conflicts with an existing nearby place. The submission was not changed.";
  }
  if (
    failure.code === "INVALID_SUBMISSION_STATE" ||
    failure.code === "NOT_FOUND"
  ) {
    return "This submission is no longer pending. The queue has been refreshed.";
  }
  if (failure.code === "IDEMPOTENCY_CONFLICT") {
    return "This approval conflicts with an earlier attempt. The queue has been refreshed.";
  }
  if (failure.code === "MEDIA_CLEANUP_REQUIRED") {
    return "This submission still has managed media and cannot be hard-deleted safely.";
  }
  return "The moderation request failed. No successful change was assumed.";
}

function formattedDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? "Unknown"
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

function coordinatesLabel(value: unknown): string {
  if (
    !Array.isArray(value) ||
    value.length < 2 ||
    typeof value[0] !== "number" ||
    typeof value[1] !== "number"
  ) {
    return "Coordinates unavailable";
  }
  return `${value[1].toFixed(6)}, ${value[0].toFixed(6)}`;
}

function safeWebsite(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function MediaPreview({ attachment }: { attachment: ModerationAttachment }) {
  const [state, setState] = useState<
    "idle" | "loading" | "ready" | "error" | "authorization"
  >("idle");
  const [url, setUrl] = useState<string>();
  const requestRef = useRef<Promise<void> | null>(null);

  const load = useCallback(() => {
    if (requestRef.current) return;
    setState("loading");
    const request = (async () => {
      const result = await loadModerationPreview(attachment.id);
      if (result.ok) {
        setUrl(result.url);
        setState("ready");
      } else {
        setUrl(undefined);
        setState(
          authenticationCodes.has(result.code) || result.code === "FORBIDDEN"
            ? "authorization"
            : "error"
        );
      }
    })();
    requestRef.current = request;
    void request.finally(() => {
      if (requestRef.current === request) requestRef.current = null;
    });
  }, [attachment.id]);

  return (
    <div className="rounded-md border p-3">
      <p className="mb-2 text-sm font-medium">
        Photo {attachment.position + 1}
      </p>
      {state === "ready" && url ? (
        // The short-lived URL is returned by the authorized preview capability;
        // it is never copied into queue data or durable client storage.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={`Submitted attachment ${attachment.position + 1}`}
          className="max-h-80 w-full rounded object-contain"
          onError={() => {
            setUrl(undefined);
            setState("error");
          }}
          src={url}
        />
      ) : null}
      {state === "authorization" ? (
        <p className="text-sm text-destructive" role="alert">
          Preview access was denied or your session expired.
        </p>
      ) : null}
      {state === "error" ? (
        <p className="text-sm text-destructive" role="alert">
          This preview is unavailable or expired.
        </p>
      ) : null}
      {state !== "ready" ? (
        <Button
          className="mt-2"
          disabled={state === "loading"}
          onClick={load}
          size="sm"
          type="button"
          variant="outline"
        >
          {state === "loading" ? "Loading preview…" : "Load private preview"}
        </Button>
      ) : null}
    </div>
  );
}

function SubmissionCard({
  item,
  canDelete,
  actionsDisabled,
  onReview,
}: {
  item: ModerationQueueItem;
  canDelete: boolean;
  actionsDisabled: boolean;
  onReview: (kind: ReviewIntent["kind"], item: ModerationQueueItem) => void;
}) {
  const website = safeWebsite(item.website);
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <CardTitle>{item.name}</CardTitle>
          <Badge variant="outline">{item.state}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-muted-foreground">
              Category
            </dt>
            <dd>{item.category?.name ?? "Unknown"}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted-foreground">
              Submitted
            </dt>
            <dd>{formattedDate(item.dateCreated)}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted-foreground">
              Requester reference
            </dt>
            <dd>{item.requestedBy ?? "Unavailable"}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted-foreground">
              Location
            </dt>
            <dd>
              {item.address?.properties?.addressString ?? "No address label"}
            </dd>
            <dd className="text-sm text-muted-foreground">
              {coordinatesLabel(item.address?.geometry?.coordinates)}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-muted-foreground">
              Description
            </dt>
            <dd className="whitespace-pre-wrap">
              {item.description || "No description"}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted-foreground">
              Website
            </dt>
            <dd>
              {website ? (
                <a
                  className="break-all underline"
                  href={website}
                  rel="noreferrer"
                  target="_blank"
                >
                  {website}
                </a>
              ) : item.website ? (
                "Invalid website address"
              ) : (
                "No website"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted-foreground">Tags</dt>
            <dd className="flex flex-wrap gap-1">
              {item.tags.length > 0
                ? item.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))
                : "No tags"}
            </dd>
          </div>
        </dl>
        <section aria-label={`Media for ${item.name}`}>
          <h3 className="mb-2 font-medium">Submitted media</h3>
          {item.attachments.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {item.attachments.map((attachment) => (
                <MediaPreview attachment={attachment} key={attachment.id} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No submitted media.</p>
          )}
        </section>
      </CardContent>
      <CardFooter className="flex flex-wrap justify-end gap-2">
        {canDelete ? (
          <Button
            disabled={actionsDisabled}
            onClick={() => onReview("delete", item)}
            type="button"
            variant="destructive"
          >
            Delete permanently
          </Button>
        ) : null}
        <Button
          disabled={actionsDisabled}
          onClick={() => onReview("approve", item)}
          type="button"
        >
          Approve
        </Button>
      </CardFooter>
    </Card>
  );
}

export function ModerationQueue({ canDelete }: { canDelete: boolean }) {
  const [items, setItems] = useState<ModerationQueueItem[]>([]);
  const [status, setStatus] = useState<QueueStatus>("loading");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [notice, setNotice] = useState<string>();
  const [review, setReview] = useState<ReviewIntent>();
  const [comment, setComment] = useState("");
  const [actionError, setActionError] = useState<string>();
  const [acting, setActing] = useState(false);
  const fetchRef = useRef<Promise<void> | null>(null);
  const actionRef = useRef<Promise<void> | null>(null);

  const fetchPage = useCallback((after: string | null, reset: boolean) => {
    if (fetchRef.current) return fetchRef.current;
    if (reset) {
      setStatus("loading");
      setLoadingMore(false);
    } else {
      setLoadingMore(true);
    }
    const request = (async () => {
      const result = await loadModerationQueue(after);
      if (!result.ok) {
        setStatus(queueFailureStatus(result.code));
        setLoadingMore(false);
        return;
      }
      setItems((current) => {
        if (reset) return result.page.items;
        const existing = new Set(current.map((item) => item.id));
        return [
          ...current,
          ...result.page.items.filter((item) => !existing.has(item.id)),
        ];
      });
      setHasNextPage(result.page.hasNextPage);
      setNextCursor(result.page.nextCursor);
      setStatus(reset && result.page.items.length === 0 ? "empty" : "ready");
      setLoadingMore(false);
    })();
    fetchRef.current = request;
    void request.finally(() => {
      if (fetchRef.current === request) fetchRef.current = null;
    });
    return request;
  }, []);

  useEffect(() => {
    void fetchPage(null, true);
  }, [fetchPage]);

  const openReview = useCallback(
    (kind: ReviewIntent["kind"], item: ModerationQueueItem) => {
      if (actionRef.current) return;
      setReview({ kind, item, idempotencyKey: actionKey() });
      setComment("");
      setActionError(undefined);
    },
    []
  );

  const confirmReview = useCallback(() => {
    if (!review || actionRef.current) return;
    if (review.kind === "approve" && !comment.trim()) {
      setActionError("Enter a review comment before approving.");
      return;
    }
    setActing(true);
    setActionError(undefined);
    const request = (async () => {
      const result =
        review.kind === "approve"
          ? await approveSubmission(
              review.item.id,
              comment,
              review.idempotencyKey
            )
          : await deleteSubmission(review.item.id);
      if (result.ok) {
        setReview(undefined);
        setNotice(
          review.kind === "approve"
            ? "Submission approved. The queue and public map state were refreshed."
            : "Submission permanently deleted. The queue was refreshed."
        );
        await fetchPage(null, true);
        return;
      }
      const message = failureMessage(result);
      if (authenticationCodes.has(result.code)) {
        setReview(undefined);
        setStatus("authentication");
      } else if (result.code === "FORBIDDEN") {
        setReview(undefined);
        setStatus("authorization");
      } else if (conflictCodes.has(result.code)) {
        setReview(undefined);
        setNotice(message);
        await fetchPage(null, true);
      } else {
        setActionError(message);
      }
    })();
    actionRef.current = request;
    void request.finally(() => {
      if (actionRef.current === request) actionRef.current = null;
      setActing(false);
    });
  }, [comment, fetchPage, review]);

  if (status === "loading" && items.length === 0) {
    return <p role="status">Loading pending submissions…</p>;
  }
  if (status === "authentication") {
    return (
      <div className="rounded-md border border-destructive p-4" role="alert">
        Your session expired.{" "}
        <a
          className="underline"
          href="/api/auth/signin?callbackUrl=%2Frequests"
        >
          Sign in again
        </a>
        .
      </div>
    );
  }
  if (status === "authorization") {
    return (
      <div className="rounded-md border border-destructive p-4" role="alert">
        Access denied. Moderator or administrator permission is required.
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="rounded-md border border-destructive p-4" role="alert">
        <p>The moderation queue could not be loaded.</p>
        <Button
          className="mt-3"
          onClick={() => void fetchPage(null, true)}
          type="button"
          variant="outline"
        >
          Retry queue
        </Button>
      </div>
    );
  }
  if (status === "empty") {
    return (
      <>
        {notice ? (
          <div className="mb-4 rounded-md border p-3" role="status">
            {notice}
          </div>
        ) : null}
        <div className="rounded-md border p-8 text-center">
          <h2 className="text-xl font-medium">No pending submissions</h2>
          <p className="mt-2 text-muted-foreground">
            The moderation queue is empty.
          </p>
          <Button
            className="mt-4"
            onClick={() => void fetchPage(null, true)}
            type="button"
            variant="outline"
          >
            Refresh queue
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      {notice ? (
        <div className="mb-4 rounded-md border p-3" role="status">
          {notice}
        </div>
      ) : null}
      <div className="space-y-6">
        {items.map((item) => (
          <SubmissionCard
            actionsDisabled={acting || loadingMore || status === "loading"}
            canDelete={canDelete}
            item={item}
            key={item.id}
            onReview={openReview}
          />
        ))}
      </div>
      <div className="mt-8 flex justify-center">
        {hasNextPage && nextCursor ? (
          <Button
            disabled={acting || loadingMore || Boolean(fetchRef.current)}
            onClick={() => void fetchPage(nextCursor, false)}
            type="button"
            variant="outline"
          >
            {loadingMore ? "Loading more…" : "Load more submissions"}
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">
            End of moderation queue.
          </p>
        )}
      </div>

      <Dialog
        open={Boolean(review)}
        onOpenChange={(open) => {
          if (!open && !actionRef.current) setReview(undefined);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {review?.kind === "approve"
                ? "Approve submission?"
                : "Permanently delete submission?"}
            </DialogTitle>
            <DialogDescription>
              {review?.kind === "approve"
                ? `Confirm approval of ${review.item.name}. This publishes the place and records your review comment.`
                : `Confirm permanent deletion of ${
                    review?.item.name ?? "this submission"
                  }. This exceptional administrator action cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          {review?.kind === "approve" ? (
            <label className="space-y-2 text-sm font-medium">
              Review comment
              <Textarea
                aria-label="Review comment"
                disabled={acting}
                maxLength={MAX_REVIEW_COMMENT_LENGTH}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Explain why this submission is ready to publish"
                value={comment}
              />
              <span className="block text-xs text-muted-foreground">
                {comment.length}/{MAX_REVIEW_COMMENT_LENGTH}
              </span>
            </label>
          ) : null}
          {actionError ? (
            <p className="text-sm text-destructive" role="alert">
              {actionError}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              disabled={acting}
              onClick={() => setReview(undefined)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={acting}
              onClick={confirmReview}
              type="button"
              variant={review?.kind === "delete" ? "destructive" : "default"}
            >
              {acting
                ? "Submitting…"
                : review?.kind === "approve"
                  ? "Confirm approval"
                  : "Confirm permanent deletion"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
