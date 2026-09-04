"use server";

import type { ApolloError } from "@apollo/client";

import { getBackendAuth } from "@/lib/auth/get-backend-auth";
import { getClient } from "@/lib/client";
import {
  CREATE_SUBMISSION_V3,
  EDIT_SUBMISSION_V3,
  FINALIZE_SUBMISSION_V3,
  REORDER_SUBMISSION_MEDIA_V3,
  SUBMISSION_MEDIA_STATE_V3,
} from "@/graphql/queries/gql";
import {
  M3SubmissionSchema,
  type M3SubmissionInput,
  type ValidatedM3SubmissionInput,
} from "./m3-schema";

export type SubmissionSnapshot = { id: string; state: "draft" | "pending" };
export type ActionFailure = { ok: false; code: string; field?: string };
export type SubmissionActionResult =
  | { ok: true; submission: SubmissionSnapshot }
  | ActionFailure;

export type SubmissionContentSnapshot = SubmissionSnapshot & {
  name: string;
  categorySlug: string;
  longitude: number;
  latitude: number;
  addressLabel: string | null;
  tags: string[];
  description: string | null;
  website: string | null;
};

export type SubmissionContentActionResult =
  | { ok: true; submission: SubmissionContentSnapshot; replayed: boolean }
  | ActionFailure;

export type SubmissionMediaAttachmentSnapshot = {
  id: string;
  submissionId: string;
  position: number;
  state: string;
  mediaIntentId: string;
};

export type SubmissionMediaIntentResumeSnapshot = {
  id: string;
  submissionId: string;
  state: string;
  slot: number | null;
  failureCode: string;
};

export type SubmissionMediaStateSnapshot = {
  submission: SubmissionContentSnapshot;
  attachments: SubmissionMediaAttachmentSnapshot[];
  mediaIntents: SubmissionMediaIntentResumeSnapshot[];
};

export type SubmissionMediaStateResult =
  | { ok: true; state: SubmissionMediaStateSnapshot }
  | ActionFailure;

export type ReorderSubmissionMediaResult =
  | { ok: true; orderedAttachmentIds: string[]; replayed: boolean }
  | ActionFailure;

function failure(error: unknown, fallbackCode: string): ActionFailure {
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

export async function createSubmissionV3(
  input: M3SubmissionInput,
  idempotencyKey: string
): Promise<SubmissionActionResult> {
  const parsed = M3SubmissionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "INVALID_SUBMISSION",
      field: String(parsed.error.issues[0]?.path[0] ?? "submission"),
    };
  }
  if (
    !idempotencyKey ||
    idempotencyKey.length > 255 ||
    idempotencyKey.includes("\0")
  ) {
    return { ok: false, code: "INVALID_IDEMPOTENCY_KEY" };
  }

  const token = await accessToken();
  if (!token) return { ok: false, code: "AUTHENTICATION_REQUIRED" };

  try {
    const response = await getClient().mutate<
      {
        createSubmissionV3?: { submission?: SubmissionSnapshot };
      },
      { input: ValidatedM3SubmissionInput; idempotencyKey: string }
    >({
      fetchPolicy: "no-cache",
      mutation: CREATE_SUBMISSION_V3,
      variables: { input: parsed.data, idempotencyKey },
      context: bearerContext(token),
    });
    const submission = response.data?.createSubmissionV3?.submission;
    return submission?.id && submission.state === "draft"
      ? { ok: true, submission }
      : { ok: false, code: "INVALID_CREATE_RESPONSE" };
  } catch (error) {
    return failure(error, "SUBMISSION_CREATE_FAILED");
  }
}

export async function finalizeSubmissionV3(
  submissionId: string,
  idempotencyKey: string
): Promise<SubmissionActionResult> {
  if (!submissionId) return { ok: false, code: "INVALID_SUBMISSION_ID" };
  if (
    !idempotencyKey ||
    idempotencyKey.length > 255 ||
    idempotencyKey.includes("\0")
  )
    return { ok: false, code: "INVALID_IDEMPOTENCY_KEY" };

  const token = await accessToken();
  if (!token) return { ok: false, code: "AUTHENTICATION_REQUIRED" };

  try {
    const response = await getClient().mutate<{
      finalizeSubmissionV3?: { submission?: SubmissionSnapshot };
    }>({
      fetchPolicy: "no-cache",
      mutation: FINALIZE_SUBMISSION_V3,
      variables: { submissionId, idempotencyKey },
      context: bearerContext(token),
    });
    const submission = response.data?.finalizeSubmissionV3?.submission;
    return submission?.id === submissionId && submission.state === "pending"
      ? { ok: true, submission }
      : { ok: false, code: "INVALID_FINALIZE_RESPONSE" };
  } catch (error) {
    return failure(error, "SUBMISSION_FINALIZE_FAILED");
  }
}

export async function editSubmissionV3(
  submissionId: string,
  input: M3SubmissionInput,
  idempotencyKey: string
): Promise<SubmissionContentActionResult> {
  if (!submissionId) return { ok: false, code: "INVALID_SUBMISSION_ID" };
  const parsed = M3SubmissionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "INVALID_SUBMISSION",
      field: String(parsed.error.issues[0]?.path[0] ?? "submission"),
    };
  }
  if (
    !idempotencyKey ||
    idempotencyKey.length > 255 ||
    idempotencyKey.includes("\0")
  ) {
    return { ok: false, code: "INVALID_IDEMPOTENCY_KEY" };
  }

  const token = await accessToken();
  if (!token) return { ok: false, code: "AUTHENTICATION_REQUIRED" };

  try {
    const response = await getClient().mutate<
      { editSubmissionV3?: { submission?: SubmissionContentSnapshot; replayed?: boolean } },
      { submissionId: string; input: ValidatedM3SubmissionInput; idempotencyKey: string }
    >({
      fetchPolicy: "no-cache",
      mutation: EDIT_SUBMISSION_V3,
      variables: { submissionId, input: parsed.data, idempotencyKey },
      context: bearerContext(token),
    });
    const submission = response.data?.editSubmissionV3?.submission;
    return submission?.id === submissionId && submission.state === "draft"
      ? {
          ok: true,
          submission,
          replayed: response.data?.editSubmissionV3?.replayed ?? false,
        }
      : { ok: false, code: "INVALID_EDIT_RESPONSE" };
  } catch (error) {
    return failure(error, "SUBMISSION_EDIT_FAILED");
  }
}

export async function loadSubmissionMediaStateV3(
  submissionId: string
): Promise<SubmissionMediaStateResult> {
  if (!submissionId) return { ok: false, code: "INVALID_SUBMISSION_ID" };

  const token = await accessToken();
  if (!token) return { ok: false, code: "AUTHENTICATION_REQUIRED" };

  try {
    const response = await getClient().query<{
      submissionMediaStateV3?: SubmissionMediaStateSnapshot;
    }>({
      fetchPolicy: "no-cache",
      query: SUBMISSION_MEDIA_STATE_V3,
      variables: { submissionId },
      context: bearerContext(token),
    });
    const state = response.data?.submissionMediaStateV3;
    return state?.submission?.id
      ? { ok: true, state }
      : { ok: false, code: "NOT_FOUND" };
  } catch (error) {
    return failure(error, "SUBMISSION_MEDIA_STATE_FAILED");
  }
}

export async function reorderSubmissionMediaV3(
  submissionId: string,
  attachmentIds: string[],
  idempotencyKey: string
): Promise<ReorderSubmissionMediaResult> {
  if (!submissionId) return { ok: false, code: "INVALID_SUBMISSION_ID" };
  if (!Array.isArray(attachmentIds) || attachmentIds.length === 0) {
    return { ok: false, code: "INVALID_SUBMISSION", field: "attachmentIds" };
  }
  if (
    !idempotencyKey ||
    idempotencyKey.length > 255 ||
    idempotencyKey.includes("\0")
  ) {
    return { ok: false, code: "INVALID_IDEMPOTENCY_KEY" };
  }

  const token = await accessToken();
  if (!token) return { ok: false, code: "AUTHENTICATION_REQUIRED" };

  try {
    const response = await getClient().mutate<{
      reorderSubmissionMediaV3?: {
        orderedAttachmentIds?: string[];
        replayed?: boolean;
      };
    }>({
      fetchPolicy: "no-cache",
      mutation: REORDER_SUBMISSION_MEDIA_V3,
      variables: { submissionId, attachmentIds, idempotencyKey },
      context: bearerContext(token),
    });
    const ordered = response.data?.reorderSubmissionMediaV3?.orderedAttachmentIds;
    return ordered
      ? {
          ok: true,
          orderedAttachmentIds: ordered,
          replayed: response.data?.reorderSubmissionMediaV3?.replayed ?? false,
        }
      : { ok: false, code: "INVALID_REORDER_RESPONSE" };
  } catch (error) {
    return failure(error, "SUBMISSION_REORDER_MEDIA_FAILED");
  }
}
