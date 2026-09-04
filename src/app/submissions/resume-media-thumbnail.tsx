"use client";

import { useEffect, useState } from "react";

import { useSubmission } from "./submission-provider";

type ThumbnailState =
  | { status: "loading" }
  | { status: "ready"; url: string }
  | { status: "error" };

export function ResumeMediaThumbnail({
  attachmentId,
}: {
  attachmentId: string;
}) {
  const { previewRestoredMedia } = useSubmission();
  const [state, setState] = useState<ThumbnailState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    void (async () => {
      let result;
      try {
        result = await previewRestoredMedia(attachmentId);
      } catch {
        result = { ok: false, code: "MEDIA_PREVIEW_FAILED" } as const;
      }
      if (cancelled) return;
      setState(result.ok ? { status: "ready", url: result.url } : { status: "error" });
    })();
    return () => {
      cancelled = true;
    };
  }, [attachmentId, previewRestoredMedia]);

  if (state.status === "loading") {
    return (
      <div
        aria-label="Loading photo preview"
        className="h-16 w-16 shrink-0 animate-pulse rounded-md bg-muted"
        role="img"
      />
    );
  }

  if (state.status === "error") {
    return (
      <div
        aria-label="Photo preview unavailable"
        className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border text-xs text-muted-foreground"
        role="img"
      >
        N/A
      </div>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      alt="Attached to this submission"
      className="h-16 w-16 shrink-0 rounded-md border object-cover"
      src={state.url}
    />
  );
}
