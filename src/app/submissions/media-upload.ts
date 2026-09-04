export type MediaUploadAuthorizationFields = Record<string, string>;

function buildUploadFormData(
  fields: MediaUploadAuthorizationFields,
  file: File
): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  // The storage provider's POST policy ignores fields appended after the
  // file part, so "file" must always be the last entry.
  formData.append("file", file);
  return formData;
}

export async function postDirectUpload(
  url: string,
  fields: MediaUploadAuthorizationFields,
  file: File
): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: "POST",
      body: buildUploadFormData(fields, file),
    });
    return response.ok;
  } catch {
    return false;
  }
}
