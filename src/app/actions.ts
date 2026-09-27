"use server";

import { getClient } from "@/lib/client";
import type { GetAllPlacesNamesQuery } from "@/graphql/__generated__/types";
import {
  ALL_PLACES_NAMES_QUERY,
  GET_S3_PRESIGNED_URL,
} from "@/graphql/queries/gql";

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
