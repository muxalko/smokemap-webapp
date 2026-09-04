"use server";

import type { ApolloError, DocumentNode } from "@apollo/client";

import { getBackendAuth } from "@/lib/auth/get-backend-auth";
import { getClient } from "@/lib/client";
import {
  ATTACH_VERIFIED_MEDIA,
  CREATE_MEDIA_UPLOAD_INTENT,
  EXPIRE_MEDIA_UPLOAD_INTENT,
  ISSUE_MEDIA_UPLOAD_INTENT,
  MEDIA_ATTACHMENT_PREVIEW_V3,
  REMOVE_ATTACHED_MEDIA,
  RENEW_MEDIA_UPLOAD_INTENT,
  VERIFY_MEDIA_UPLOAD_INTENT,
} from "@/graphql/queries/gql";
import type { MediaUploadAuthorizationFields } from "./media-upload";

export type MediaIntentSnapshot = {
  id: string;
  submissionId: string;
  state: string;
  slot: number | null;
  failureCode: string;
};

export type MediaUploadAuthorization = {
  url: string;
  fields: MediaUploadAuthorizationFields;
  expiresAt: string;
};

export type MediaAttachment = {
  id: string;
  submissionId: string;
  position: number;
  state: string;
};

export type MediaActionResult<T> =
  | ({ ok: true; replayed: boolean } & T)
  | { ok: false; code: string; field?: string };

export type CreateMediaIntentInput = {
  submissionId: string;
  mimeType: string;
  declaredByteSize: number;
  declaredSha256: string;
  originalFilename?: string;
  slot?: number;
};

function failure(
  error: unknown,
  fallbackCode: string
): { ok: false; code: string; field?: string } {
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

async function accessToken(): Promise<string | null> {
  return (await getBackendAuth())?.backendAccess ?? null;
}

function bearerContext(token: string) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

function isValidIdempotencyKey(idempotencyKey: string): boolean {
  return (
    !!idempotencyKey &&
    idempotencyKey.length <= 255 &&
    !idempotencyKey.includes("\0")
  );
}

function isValidIntentId(intentId: string): boolean {
  return !!intentId && !intentId.includes("\0");
}

export async function createMediaUploadIntent(
  input: CreateMediaIntentInput,
  idempotencyKey: string
): Promise<MediaActionResult<{ intent: MediaIntentSnapshot }>> {
  if (!input.submissionId) return { ok: false, code: "INVALID_SUBMISSION_ID" };
  if (!isValidIdempotencyKey(idempotencyKey)) {
    return { ok: false, code: "INVALID_IDEMPOTENCY_KEY" };
  }

  const token = await accessToken();
  if (!token) return { ok: false, code: "AUTHENTICATION_REQUIRED" };

  try {
    const response = await getClient().mutate<{
      createMediaUploadIntent?: {
        intent?: MediaIntentSnapshot;
        replayed?: boolean;
      };
    }>({
      fetchPolicy: "no-cache",
      mutation: CREATE_MEDIA_UPLOAD_INTENT,
      variables: {
        idempotencyKey,
        input: {
          submissionId: input.submissionId,
          mimeType: input.mimeType,
          declaredByteSize: input.declaredByteSize,
          declaredSha256: input.declaredSha256,
          ...(input.originalFilename !== undefined
            ? { originalFilename: input.originalFilename }
            : {}),
          ...(input.slot !== undefined ? { slot: input.slot } : {}),
        },
      },
      context: bearerContext(token),
    });
    const intent = response.data?.createMediaUploadIntent?.intent;
    return intent?.id
      ? {
          ok: true,
          intent,
          replayed: response.data?.createMediaUploadIntent?.replayed ?? false,
        }
      : { ok: false, code: "INVALID_MEDIA_INTENT_RESPONSE" };
  } catch (error) {
    return failure(error, "MEDIA_INTENT_CREATE_FAILED");
  }
}

async function issueOrRenewMediaUpload(
  mutation: DocumentNode,
  intentId: string,
  idempotencyKey: string,
  fallbackCode: string
): Promise<
  MediaActionResult<{
    intent: MediaIntentSnapshot;
    upload: MediaUploadAuthorization;
  }>
> {
  if (!isValidIntentId(intentId))
    return { ok: false, code: "INVALID_INTENT_ID" };
  if (!isValidIdempotencyKey(idempotencyKey)) {
    return { ok: false, code: "INVALID_IDEMPOTENCY_KEY" };
  }

  const token = await accessToken();
  if (!token) return { ok: false, code: "AUTHENTICATION_REQUIRED" };

  try {
    const response = await getClient().mutate<{
      issueMediaUploadIntent?: {
        intent?: MediaIntentSnapshot;
        upload?: MediaUploadAuthorization;
        replayed?: boolean;
      };
      renewMediaUploadIntent?: {
        intent?: MediaIntentSnapshot;
        upload?: MediaUploadAuthorization;
        replayed?: boolean;
      };
    }>({
      fetchPolicy: "no-cache",
      mutation,
      variables: { intentId, idempotencyKey },
      context: bearerContext(token),
    });
    const payload =
      response.data?.issueMediaUploadIntent ??
      response.data?.renewMediaUploadIntent;
    const intent = payload?.intent;
    const upload = payload?.upload;
    return intent?.id && upload?.url && upload.fields
      ? { ok: true, intent, upload, replayed: payload?.replayed ?? false }
      : { ok: false, code: "INVALID_MEDIA_INTENT_RESPONSE" };
  } catch (error) {
    return failure(error, fallbackCode);
  }
}

export async function issueMediaUploadIntent(
  intentId: string,
  idempotencyKey: string
): Promise<
  MediaActionResult<{
    intent: MediaIntentSnapshot;
    upload: MediaUploadAuthorization;
  }>
> {
  return issueOrRenewMediaUpload(
    ISSUE_MEDIA_UPLOAD_INTENT,
    intentId,
    idempotencyKey,
    "MEDIA_ISSUE_FAILED"
  );
}

export async function renewMediaUploadIntent(
  intentId: string,
  idempotencyKey: string
): Promise<
  MediaActionResult<{
    intent: MediaIntentSnapshot;
    upload: MediaUploadAuthorization;
  }>
> {
  return issueOrRenewMediaUpload(
    RENEW_MEDIA_UPLOAD_INTENT,
    intentId,
    idempotencyKey,
    "MEDIA_RENEW_FAILED"
  );
}

export async function verifyMediaUploadIntent(
  intentId: string,
  idempotencyKey: string
): Promise<MediaActionResult<{ intent: MediaIntentSnapshot }>> {
  if (!isValidIntentId(intentId))
    return { ok: false, code: "INVALID_INTENT_ID" };
  if (!isValidIdempotencyKey(idempotencyKey)) {
    return { ok: false, code: "INVALID_IDEMPOTENCY_KEY" };
  }

  const token = await accessToken();
  if (!token) return { ok: false, code: "AUTHENTICATION_REQUIRED" };

  try {
    const response = await getClient().mutate<{
      verifyMediaUploadIntent?: {
        intent?: MediaIntentSnapshot;
        replayed?: boolean;
      };
    }>({
      fetchPolicy: "no-cache",
      mutation: VERIFY_MEDIA_UPLOAD_INTENT,
      variables: { intentId, idempotencyKey },
      context: bearerContext(token),
    });
    const intent = response.data?.verifyMediaUploadIntent?.intent;
    return intent?.id
      ? {
          ok: true,
          intent,
          replayed: response.data?.verifyMediaUploadIntent?.replayed ?? false,
        }
      : { ok: false, code: "INVALID_MEDIA_INTENT_RESPONSE" };
  } catch (error) {
    return failure(error, "MEDIA_VERIFY_FAILED");
  }
}

export async function attachVerifiedMedia(
  intentId: string,
  idempotencyKey: string
): Promise<MediaActionResult<{ attachment: MediaAttachment }>> {
  if (!isValidIntentId(intentId))
    return { ok: false, code: "INVALID_INTENT_ID" };
  if (!isValidIdempotencyKey(idempotencyKey)) {
    return { ok: false, code: "INVALID_IDEMPOTENCY_KEY" };
  }

  const token = await accessToken();
  if (!token) return { ok: false, code: "AUTHENTICATION_REQUIRED" };

  try {
    const response = await getClient().mutate<{
      attachVerifiedMedia?: {
        attachment?: MediaAttachment;
        replayed?: boolean;
      };
    }>({
      fetchPolicy: "no-cache",
      mutation: ATTACH_VERIFIED_MEDIA,
      variables: { intentId, idempotencyKey },
      context: bearerContext(token),
    });
    const attachment = response.data?.attachVerifiedMedia?.attachment;
    return attachment?.id
      ? {
          ok: true,
          attachment,
          replayed: response.data?.attachVerifiedMedia?.replayed ?? false,
        }
      : { ok: false, code: "INVALID_MEDIA_INTENT_RESPONSE" };
  } catch (error) {
    return failure(error, "MEDIA_ATTACH_FAILED");
  }
}

export async function removeAttachedMedia(
  intentId: string,
  idempotencyKey: string
): Promise<MediaActionResult<{ intent: MediaIntentSnapshot }>> {
  if (!isValidIntentId(intentId))
    return { ok: false, code: "INVALID_INTENT_ID" };
  if (!isValidIdempotencyKey(idempotencyKey)) {
    return { ok: false, code: "INVALID_IDEMPOTENCY_KEY" };
  }

  const token = await accessToken();
  if (!token) return { ok: false, code: "AUTHENTICATION_REQUIRED" };

  try {
    const response = await getClient().mutate<{
      removeAttachedMedia?: {
        intent?: MediaIntentSnapshot;
        replayed?: boolean;
      };
    }>({
      fetchPolicy: "no-cache",
      mutation: REMOVE_ATTACHED_MEDIA,
      variables: { intentId, idempotencyKey },
      context: bearerContext(token),
    });
    const intent = response.data?.removeAttachedMedia?.intent;
    return intent?.id
      ? {
          ok: true,
          intent,
          replayed: response.data?.removeAttachedMedia?.replayed ?? false,
        }
      : { ok: false, code: "INVALID_MEDIA_INTENT_RESPONSE" };
  } catch (error) {
    return failure(error, "MEDIA_REMOVE_FAILED");
  }
}

/**
 * Reaps one media intent that is past its absolute expiry (created/issued/verified
 * but never attached). The backend rejects this before that deadline, so callers
 * treat failure here as a routine, ignorable outcome rather than a user-facing error.
 */
export async function expireMediaUploadIntent(
  intentId: string,
  idempotencyKey: string
): Promise<MediaActionResult<{ intent: MediaIntentSnapshot }>> {
  if (!isValidIntentId(intentId))
    return { ok: false, code: "INVALID_INTENT_ID" };
  if (!isValidIdempotencyKey(idempotencyKey)) {
    return { ok: false, code: "INVALID_IDEMPOTENCY_KEY" };
  }

  const token = await accessToken();
  if (!token) return { ok: false, code: "AUTHENTICATION_REQUIRED" };

  try {
    const response = await getClient().mutate<{
      expireMediaUploadIntent?: {
        intent?: MediaIntentSnapshot;
        replayed?: boolean;
      };
    }>({
      fetchPolicy: "no-cache",
      mutation: EXPIRE_MEDIA_UPLOAD_INTENT,
      variables: { intentId, idempotencyKey },
      context: bearerContext(token),
    });
    const intent = response.data?.expireMediaUploadIntent?.intent;
    return intent?.id
      ? {
          ok: true,
          intent,
          replayed: response.data?.expireMediaUploadIntent?.replayed ?? false,
        }
      : { ok: false, code: "INVALID_MEDIA_INTENT_RESPONSE" };
  } catch (error) {
    return failure(error, "MEDIA_EXPIRE_FAILED");
  }
}

export type MediaPreviewResult =
  | { ok: true; url: string; expiresAt: string }
  | { ok: false; code: string };

export async function mediaAttachmentPreviewV3(
  attachmentId: string
): Promise<MediaPreviewResult> {
  if (!attachmentId || attachmentId.includes("\0")) {
    return { ok: false, code: "INVALID_ATTACHMENT_ID" };
  }

  const token = await accessToken();
  if (!token) return { ok: false, code: "AUTHENTICATION_REQUIRED" };

  try {
    const response = await getClient().query<{
      mediaAttachmentPreviewV3?: { url?: string; expiresAt?: string };
    }>({
      fetchPolicy: "no-cache",
      query: MEDIA_ATTACHMENT_PREVIEW_V3,
      variables: { attachmentId },
      context: bearerContext(token),
    });
    const preview = response.data?.mediaAttachmentPreviewV3;
    return preview?.url && preview.expiresAt
      ? { ok: true, url: preview.url, expiresAt: preview.expiresAt }
      : { ok: false, code: "INVALID_MEDIA_PREVIEW_RESPONSE" };
  } catch (error) {
    return failure(error, "MEDIA_PREVIEW_FAILED");
  }
}
