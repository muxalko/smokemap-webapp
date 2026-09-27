"use server";

import type { ApolloError } from "@apollo/client";
import { revalidatePath } from "next/cache";

import {
  APPROVE_SUBMISSION_V4,
  DELETE_REQUEST,
  MEDIA_ATTACHMENT_PREVIEW_V3,
  MODERATION_QUEUE_V4,
} from "@/graphql/queries/gql";
import { getBackendAuth } from "@/lib/auth/get-backend-auth";
import { canHardDelete, canModerate } from "@/lib/auth/permissions";
import { getClient } from "@/lib/client";
import {
  MAX_REVIEW_COMMENT_LENGTH,
  MODERATION_PAGE_SIZE,
  type ModerationActionResult,
  type ModerationFailure,
  type ModerationPreviewResult,
  type ModerationQueuePage,
  type ModerationQueueResult,
} from "./types";

function failure(error: unknown, fallbackCode: string): ModerationFailure {
  const graphQLError = (error as ApolloError | undefined)?.graphQLErrors?.[0];
  const extensions = graphQLError?.extensions as
    | { code?: unknown; field?: unknown }
    | undefined;
  return {
    ok: false,
    code: typeof extensions?.code === "string" ? extensions.code : fallbackCode,
    ...(typeof extensions?.field === "string"
      ? { field: extensions.field }
      : {}),
  };
}

function bearerContext(accessToken: string) {
  return { headers: { Authorization: `Bearer ${accessToken}` } };
}

async function moderationToken(
  administratorOnly = false
): Promise<{ ok: true; token: string } | ModerationFailure> {
  const auth = await getBackendAuth();
  if (!auth?.backendAccess) {
    return { ok: false, code: "AUTHENTICATION_REQUIRED" };
  }
  const allowed = administratorOnly
    ? canHardDelete(auth.role)
    : canModerate(auth.role);
  return allowed
    ? { ok: true, token: auth.backendAccess }
    : { ok: false, code: "FORBIDDEN" };
}

function validIdentifier(value: string): boolean {
  return Boolean(value) && !value.includes("\0") && value.length <= 255;
}

export async function loadModerationQueue(
  after?: string | null
): Promise<ModerationQueueResult> {
  if (
    after !== undefined &&
    after !== null &&
    (!after || after.includes("\0") || after.length > 4096)
  ) {
    return { ok: false, code: "INVALID_PAGINATION" };
  }
  const auth = await moderationToken();
  if (!auth.ok) return auth;

  try {
    const response = await getClient().query<{
      moderationQueueV4?: ModerationQueuePage;
    }>({
      fetchPolicy: "no-cache",
      query: MODERATION_QUEUE_V4,
      variables: { first: MODERATION_PAGE_SIZE, after: after ?? null },
      context: bearerContext(auth.token),
    });
    const page = response.data?.moderationQueueV4;
    if (
      !page ||
      !Array.isArray(page.items) ||
      typeof page.hasNextPage !== "boolean" ||
      (page.hasNextPage && !page.nextCursor) ||
      (after && page.hasNextPage && page.nextCursor === after) ||
      page.items.length > MODERATION_PAGE_SIZE
    ) {
      return { ok: false, code: "INVALID_MODERATION_QUEUE_RESPONSE" };
    }
    return { ok: true, page };
  } catch (error) {
    return failure(error, "MODERATION_QUEUE_FAILED");
  }
}

export async function loadModerationPreview(
  attachmentId: string
): Promise<ModerationPreviewResult> {
  if (!validIdentifier(attachmentId)) {
    return { ok: false, code: "INVALID_ATTACHMENT_ID" };
  }
  const auth = await moderationToken();
  if (!auth.ok) return auth;

  try {
    const response = await getClient().query<{
      mediaAttachmentPreviewV3?: { url?: string; expiresAt?: string };
    }>({
      fetchPolicy: "no-cache",
      query: MEDIA_ATTACHMENT_PREVIEW_V3,
      variables: { attachmentId },
      context: bearerContext(auth.token),
    });
    const preview = response.data?.mediaAttachmentPreviewV3;
    return preview?.url && preview.expiresAt
      ? { ok: true, url: preview.url, expiresAt: preview.expiresAt }
      : { ok: false, code: "INVALID_MEDIA_PREVIEW_RESPONSE" };
  } catch (error) {
    return failure(error, "MEDIA_PREVIEW_FAILED");
  }
}

export async function approveSubmission(
  submissionId: string,
  comment: string,
  idempotencyKey: string
): Promise<ModerationActionResult> {
  if (!validIdentifier(submissionId)) {
    return { ok: false, code: "INVALID_SUBMISSION_ID" };
  }
  const normalizedComment = comment.trim();
  if (
    !normalizedComment ||
    normalizedComment.length > MAX_REVIEW_COMMENT_LENGTH
  ) {
    return { ok: false, code: "INVALID_REVIEW_COMMENT", field: "comment" };
  }
  if (!validIdentifier(idempotencyKey)) {
    return { ok: false, code: "INVALID_IDEMPOTENCY_KEY" };
  }
  const auth = await moderationToken();
  if (!auth.ok) return auth;

  try {
    const response = await getClient().mutate<{
      approveSubmissionV4?: {
        submission?: { id?: string; state?: string };
        replayed?: boolean;
      };
    }>({
      fetchPolicy: "no-cache",
      mutation: APPROVE_SUBMISSION_V4,
      variables: {
        submissionId,
        idempotencyKey,
        input: { comment: normalizedComment },
      },
      context: bearerContext(auth.token),
    });
    const approved = response.data?.approveSubmissionV4;
    if (
      approved?.submission?.id !== submissionId ||
      approved.submission.state !== "approved"
    ) {
      return { ok: false, code: "INVALID_APPROVAL_RESPONSE" };
    }
    revalidatePath("/");
    revalidatePath("/requests");
    return {
      ok: true,
      submissionId,
      replayed: approved.replayed ?? false,
    };
  } catch (error) {
    return failure(error, "SUBMISSION_APPROVE_FAILED");
  }
}

export async function deleteSubmission(
  submissionId: string
): Promise<ModerationActionResult> {
  if (!validIdentifier(submissionId)) {
    return { ok: false, code: "INVALID_SUBMISSION_ID" };
  }
  const auth = await moderationToken(true);
  if (!auth.ok) return auth;

  try {
    const response = await getClient().mutate<{
      deleteRequest?: { ok?: boolean };
    }>({
      fetchPolicy: "no-cache",
      mutation: DELETE_REQUEST,
      variables: { id: submissionId },
      context: bearerContext(auth.token),
    });
    if (response.data?.deleteRequest?.ok !== true) {
      return { ok: false, code: "INVALID_DELETE_RESPONSE" };
    }
    revalidatePath("/");
    revalidatePath("/requests");
    return { ok: true, submissionId };
  } catch (error) {
    return failure(error, "SUBMISSION_DELETE_FAILED");
  }
}
