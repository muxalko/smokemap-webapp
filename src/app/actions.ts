"use server";

import { getClient } from "@/lib/client";
import { GET_S3_PRESIGNED_URL } from "@/graphql/queries/gql";

export async function getS3PresignedUrl() {
  return getClient().query({
    fetchPolicy: "no-cache",
    query: GET_S3_PRESIGNED_URL,
  });
}

