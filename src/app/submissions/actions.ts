"use server";

import type { ApolloError } from "@apollo/client";

import { getBackendAuth } from "@/lib/auth/get-backend-auth";
import { getClient } from "@/lib/client";
import {
  CREATE_SUBMISSION_V3,
  FINALIZE_SUBMISSION_V3,
} from "@/graphql/queries/gql";
import {
  M3SubmissionSchema,
  type M3SubmissionInput,
  type ValidatedM3SubmissionInput,
} from "./m3-schema";

export type SubmissionSnapshot = { id: string; state: "draft" | "pending" };
export type SubmissionActionResult =
  | { ok: true; submission: SubmissionSnapshot }
  | { ok: false; code: string; field?: string };

function failure(error: unknown, fallbackCode: string): SubmissionActionResult {
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
