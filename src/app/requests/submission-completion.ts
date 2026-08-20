import type { RequestType } from "@/graphql/__generated__/types";

export function completeWithoutImages(
  images: File[],
  request: RequestType,
  complete: (request: RequestType) => void
): boolean {
  if (images.length !== 0) return false;
  complete(request);
  return true;
}
