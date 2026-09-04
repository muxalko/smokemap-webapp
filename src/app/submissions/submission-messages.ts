const FAILURE_MESSAGES: Record<string, string> = {
  AUTHENTICATION_REQUIRED:
    "Your session is no longer active. Sign in and retry.",
  DUPLICATE_SUBMISSION: "A matching place or submission already exists nearby.",
  IDEMPOTENCY_CONFLICT: "This retry no longer matches the original operation.",
  INVALID_SUBMISSION: "Review the highlighted submission fields and try again.",
  MEDIA_NOT_READY: "The submission cannot be finalized while media is pending.",
  NOT_FOUND: "That draft could not be found. It may have already been finalized.",
  SUBMISSION_CREATE_FAILED:
    "The draft could not be created. You can safely retry.",
  SUBMISSION_EDIT_FAILED:
    "The changes could not be saved. You can safely retry.",
  SUBMISSION_FINALIZE_FAILED:
    "The draft was saved but could not be finalized. Retrying will not create another draft.",
  SUBMISSION_MEDIA_STATE_FAILED:
    "Your saved draft could not be loaded right now.",
  SUBMISSION_REORDER_MEDIA_FAILED:
    "The photo order could not be saved. You can safely retry.",
  TOO_MANY_MEDIA_FILES: "Choose at most 3 photos.",
  UNSUPPORTED_MEDIA_TYPE: "Photos must be JPEG, PNG, or WebP.",
  MEDIA_TOO_LARGE: "Each photo must be 5 MB or smaller.",
  MEDIA_LIMIT_REACHED: "This submission already has three photos.",
  MEDIA_SLOT_CONFLICT: "A photo slot conflict occurred. You can safely retry.",
  MEDIA_DIGEST_CONFLICT: "That photo is already attached to this submission.",
  MEDIA_INTENT_EXPIRED:
    "The photo upload window expired. You can safely retry.",
  MEDIA_REMOVE_FAILED: "The photo could not be removed. You can safely retry.",
  MEDIA_FILE_REQUIRED: "Choose a photo to continue this upload.",
  UPLOAD_AUTHORIZATION_EXPIRED:
    "The photo upload window expired. You can safely retry.",
  MEDIA_STORAGE_UNAVAILABLE:
    "Photo storage is temporarily unavailable. You can safely retry.",
  MEDIA_UPLOAD_FAILED: "The photo upload failed. You can safely retry.",
  MEDIA_VERIFICATION_FAILED:
    "The uploaded photo could not be verified. You can safely retry.",
  MEDIA_PREVIEW_FAILED: "The photo preview could not be loaded.",
};

const DEFAULT_FAILURE_MESSAGE =
  "That could not be completed. You can safely retry.";

export function describeFailure(code: string | undefined): string {
  return FAILURE_MESSAGES[code ?? ""] ?? DEFAULT_FAILURE_MESSAGE;
}

export { FAILURE_MESSAGES };
