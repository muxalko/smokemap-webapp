"use server";

import { revalidatePath } from "next/cache";
import { getClient } from "@/lib/client";
import { getBackendAuth } from "@/lib/auth/get-backend-auth";
import { canHardDelete, canModerate } from "@/lib/auth/permissions";
import type {
  ApproveRequestMutation,
  DeleteRequestMutation,
  GetAllPlacesNamesQuery,
} from "@/graphql/__generated__/types";
import {
  ALL_PLACES_NAMES_QUERY,
  APPROVE_REQUEST,
  DELETE_REQUEST,
  GET_S3_PRESIGNED_URL,
} from "@/graphql/queries/gql";

export class FrontendAuthorizationError extends Error {
  constructor(public readonly code: "AUTHENTICATION_REQUIRED" | "FORBIDDEN") {
    super(code);
    this.name = "FrontendAuthorizationError";
  }
}

async function requireBackendRole(
  allowed: (role: string | undefined) => boolean
) {
  const auth = await getBackendAuth();
  if (!auth?.backendAccess)
    throw new FrontendAuthorizationError("AUTHENTICATION_REQUIRED");
  if (!allowed(auth.role)) throw new FrontendAuthorizationError("FORBIDDEN");
  return auth.backendAccess;
}

function bearerContext(accessToken: string) {
  return { headers: { Authorization: `Bearer ${accessToken}` } };
}

export async function deleteRequest(id: string) {
  const accessToken = await requireBackendRole(canHardDelete);
  const request = await getClient().mutate<DeleteRequestMutation>({
    fetchPolicy: "no-cache",
    mutation: DELETE_REQUEST,
    variables: { id },
    context: bearerContext(accessToken),
  });
  revalidatePath("/requests");
  return request;
}

export async function approveRequest(id: string) {
  if (!id) throw new Error("INVALID_REQUEST_ID");
  const accessToken = await requireBackendRole(canModerate);
  const request = await getClient().mutate<ApproveRequestMutation>({
    fetchPolicy: "no-cache",
    mutation: APPROVE_REQUEST,
    variables: {
      id: Number(id),
      input: { approvedComment: "Manual approval" },
    },
    context: bearerContext(accessToken),
  });
  revalidatePath("/requests");
  return request;
}

export async function getS3PresignedUrl() {
  return getClient().query({
    fetchPolicy: "no-cache",
    query: GET_S3_PRESIGNED_URL,
  });
}

export async function search(searchTerm: string) {
  if (!searchTerm) return [];
  const { data } = await getClient().query<GetAllPlacesNamesQuery>({
    query: ALL_PLACES_NAMES_QUERY,
  });
  return data.placesNames
    ?.filter((name) => name?.toLowerCase().includes(searchTerm.toLowerCase()))
    .slice(0, 10);
}
