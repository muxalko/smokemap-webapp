export const MAX_MEDIA_FILES = 3;
export const MAX_MEDIA_BYTES = 5_000_000;
export const ALLOWED_MEDIA_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export type MediaValidationFailure = {
  code: "TOO_MANY_MEDIA_FILES" | "UNSUPPORTED_MEDIA_TYPE" | "MEDIA_TOO_LARGE";
  field: string;
};

export function validateMediaFiles(
  files: File[]
): MediaValidationFailure | null {
  if (files.length > MAX_MEDIA_FILES) {
    return { code: "TOO_MANY_MEDIA_FILES", field: "images" };
  }
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    if (!ALLOWED_MEDIA_MIME_TYPES.has(file.type)) {
      return { code: "UNSUPPORTED_MEDIA_TYPE", field: `images.${index}` };
    }
    if (file.size < 1 || file.size > MAX_MEDIA_BYTES) {
      return { code: "MEDIA_TOO_LARGE", field: `images.${index}` };
    }
  }
  return null;
}
