export const MODERATION_PAGE_SIZE = 20;
export const MAX_REVIEW_COMMENT_LENGTH = 2000;

export type ModerationAttachment = {
  id: string;
  position: number;
};

export type ModerationQueueItem = {
  id: string;
  name: string;
  category: { name: string };
  address: {
    properties?: { addressString?: string | null } | null;
    geometry?: { coordinates?: unknown } | null;
  };
  description?: string | null;
  tags: string[];
  website?: string | null;
  dateCreated: string;
  state: string;
  requestedBy?: string | null;
  attachments: ModerationAttachment[];
};

export type ModerationQueuePage = {
  items: ModerationQueueItem[];
  hasNextPage: boolean;
  nextCursor: string | null;
};

export type ModerationFailure = {
  ok: false;
  code: string;
  field?: string;
};

export type ModerationQueueResult =
  | { ok: true; page: ModerationQueuePage }
  | ModerationFailure;

export type ModerationActionResult =
  | { ok: true; submissionId: string; replayed?: boolean }
  | ModerationFailure;

export type ModerationPreviewResult =
  | { ok: true; url: string; expiresAt: string }
  | ModerationFailure;
