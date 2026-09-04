"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { MAX_MEDIA_FILES } from "./media-schema";
import { describeFailure } from "./submission-messages";
import { ResumeMediaThumbnail } from "./resume-media-thumbnail";
import type {
  ResumeActionProgress,
  RestoredActiveMediaIntent,
  RestoredBlockedMediaIntent,
  RestoredMediaAttachment,
} from "./submission-provider";

export function ResumeMediaGrid({
  attachments,
  activeIntents,
  blockedIntents,
  resumeAction,
  disabled,
  onRemove,
  onReorder,
  onRetry,
  onReplace,
}: {
  attachments: RestoredMediaAttachment[];
  activeIntents: RestoredActiveMediaIntent[];
  blockedIntents: RestoredBlockedMediaIntent[];
  resumeAction: ResumeActionProgress;
  disabled: boolean;
  onRemove: (attachmentId: string) => void;
  onReorder: (orderedAttachmentIds: string[]) => void;
  onRetry: (intentId: string, file?: File) => void;
  onReplace: (file: File) => void;
}) {
  const [pendingFiles, setPendingFiles] = useState<Record<string, File>>({});
  const occupiedSlots = attachments.length + activeIntents.length;
  const canAddMore = occupiedSlots < MAX_MEDIA_FILES;
  const isEmpty =
    attachments.length === 0 &&
    activeIntents.length === 0 &&
    blockedIntents.length === 0;

  function moveAttachment(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= attachments.length) return;
    const orderedIds = attachments.map((attachment) => attachment.attachmentId);
    [orderedIds[index], orderedIds[target]] = [
      orderedIds[target],
      orderedIds[index],
    ];
    onReorder(orderedIds);
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium leading-none">Photos</h3>
      {isEmpty ? (
        <p className="text-sm text-muted-foreground">No photos attached.</p>
      ) : null}

      {attachments.length > 0 ? (
        <ul className="space-y-2">
          {attachments.map((attachment, index) => (
            <li
              className="flex items-center gap-3 rounded-md border p-2"
              key={attachment.attachmentId}
            >
              <ResumeMediaThumbnail attachmentId={attachment.attachmentId} />
              <span className="flex-1 text-sm">Photo {attachment.position + 1}</span>
              <div className="flex shrink-0 gap-1">
                <Button
                  aria-label={`Move photo ${attachment.position + 1} earlier`}
                  disabled={disabled || index === 0}
                  onClick={() => moveAttachment(index, -1)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  ↑
                </Button>
                <Button
                  aria-label={`Move photo ${attachment.position + 1} later`}
                  disabled={disabled || index === attachments.length - 1}
                  onClick={() => moveAttachment(index, 1)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  ↓
                </Button>
                <Button
                  aria-label={`Remove photo ${attachment.position + 1}`}
                  disabled={disabled}
                  onClick={() => onRemove(attachment.attachmentId)}
                  size="sm"
                  type="button"
                  variant="destructive"
                >
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {activeIntents.length > 0 ? (
        <ul className="space-y-2">
          {activeIntents.map((intent) => {
            const needsFile = intent.state !== "verified";
            const isActing =
              resumeAction.slot === intent.slot &&
              resumeAction.phase !== "idle" &&
              resumeAction.phase !== "failed";
            const failedHere =
              resumeAction.phase === "failed" && resumeAction.slot === intent.slot;
            const inputId = `resume-media-reselect-${intent.intentId}`;
            return (
              <li
                className="space-y-2 rounded-md border border-amber-500 p-2"
                key={intent.intentId}
              >
                <p className="text-sm">
                  Photo {intent.slot + 1}: upload was interrupted
                  {isActing ? ` — ${resumeAction.phase.replace("-", " ")}…` : ""}
                </p>
                {failedHere ? (
                  <p className="text-xs text-red-700" role="alert">
                    {describeFailure(resumeAction.failure?.code)}
                  </p>
                ) : null}
                {needsFile ? (
                  <div>
                    <label className="text-xs text-muted-foreground" htmlFor={inputId}>
                      Choose the photo again to continue this upload
                    </label>
                    <input
                      accept="image/jpeg,image/png,image/webp"
                      className="block text-sm"
                      disabled={disabled}
                      id={inputId}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          setPendingFiles((previous) => ({
                            ...previous,
                            [intent.intentId]: file,
                          }));
                        }
                      }}
                      type="file"
                    />
                  </div>
                ) : null}
                <Button
                  disabled={disabled || (needsFile && !pendingFiles[intent.intentId])}
                  onClick={() => onRetry(intent.intentId, pendingFiles[intent.intentId])}
                  size="sm"
                  type="button"
                >
                  {needsFile ? "Upload and retry" : "Retry"}
                </Button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {blockedIntents.length > 0 ? (
        <ul className="space-y-2">
          {blockedIntents.map((intent) => (
            <li
              className="rounded-md border border-red-500 p-2 text-sm text-red-700"
              key={intent.intentId}
            >
              Photo{intent.slot !== null ? ` ${intent.slot + 1}` : ""} could not be
              uploaded: {describeFailure(intent.failureCode)} Add a replacement
              photo below if you would like to try again.
            </li>
          ))}
        </ul>
      ) : null}

      {canAddMore ? (
        <div>
          <label className="text-sm font-medium leading-none" htmlFor="resume-media-add">
            Add a photo
          </label>
          <input
            accept="image/jpeg,image/png,image/webp"
            className="block text-sm"
            disabled={disabled}
            id="resume-media-add"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) onReplace(file);
            }}
            type="file"
          />
        </div>
      ) : null}
    </div>
  );
}
