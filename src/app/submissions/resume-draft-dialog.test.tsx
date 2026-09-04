import { act, fireEvent, render, screen, waitFor } from "@/test/render";

import {
  editSubmissionV3,
  finalizeSubmissionV3,
  loadSubmissionMediaStateV3,
  reorderSubmissionMediaV3,
} from "./actions";
import {
  expireMediaUploadIntent,
  mediaAttachmentPreviewV3,
  removeAttachedMedia,
} from "./media-actions";
import {
  createResumedMediaSlotOperation,
  runMediaSlot,
  type MediaSlotOperation,
} from "./media-pipeline";
import { describeFailure } from "./submission-messages";
import { SubmissionProvider } from "./submission-provider";
import { ResumeDraftDialog } from "./resume-draft-dialog";
import type { CategoryType } from "@/graphql/__generated__/types";

const RESUME_LOCATOR_STORAGE_KEY = "smokemap.m3.submission.locator";

jest.mock("./actions", () => ({
  createSubmissionV3: jest.fn(),
  editSubmissionV3: jest.fn(),
  finalizeSubmissionV3: jest.fn(),
  loadSubmissionMediaStateV3: jest.fn(),
  reorderSubmissionMediaV3: jest.fn(),
}));

jest.mock("./media-actions", () => ({
  expireMediaUploadIntent: jest.fn(),
  mediaAttachmentPreviewV3: jest.fn(),
  removeAttachedMedia: jest.fn(),
}));

jest.mock("./media-pipeline", () => ({
  createMediaSlotOperation: jest.fn(),
  createMediaSlotOperations: jest.fn(),
  createResumedMediaSlotOperation: jest.fn(),
  runMediaSlot: jest.fn(),
}));

const loadResumeState = loadSubmissionMediaStateV3 as jest.MockedFunction<
  typeof loadSubmissionMediaStateV3
>;
const editRestoredAction = editSubmissionV3 as jest.MockedFunction<
  typeof editSubmissionV3
>;
const finalizeAction = finalizeSubmissionV3 as jest.MockedFunction<
  typeof finalizeSubmissionV3
>;
const reorderAction = reorderSubmissionMediaV3 as jest.MockedFunction<
  typeof reorderSubmissionMediaV3
>;
const removeAction = removeAttachedMedia as jest.MockedFunction<
  typeof removeAttachedMedia
>;
const previewAction = mediaAttachmentPreviewV3 as jest.MockedFunction<
  typeof mediaAttachmentPreviewV3
>;
const expireAction = expireMediaUploadIntent as jest.MockedFunction<
  typeof expireMediaUploadIntent
>;
const createResumedOp = createResumedMediaSlotOperation as jest.MockedFunction<
  typeof createResumedMediaSlotOperation
>;
const runMedia = runMediaSlot as jest.MockedFunction<typeof runMediaSlot>;

const categories: CategoryType[] = [
  { id: "1", name: "Outdoors", slug: "outdoors" },
  { id: "2", name: "Indoors", slug: "indoors" },
];

const restoredContent = {
  id: "42",
  state: "draft" as const,
  name: "Resumed place",
  categorySlug: "outdoors",
  longitude: -77.0365,
  latitude: 38.8977,
  addressLabel: "Human label",
  tags: ["Quiet patio"],
  description: "A description",
  website: "https://www.smokemap.org/place",
};

function fakeOp(slot: number, intentId?: string): MediaSlotOperation {
  return {
    slot,
    mimeType: "image/png",
    createIntentKey: `create-${slot}`,
    issueKey: `issue-${slot}`,
    verifyKey: `verify-${slot}`,
    attachKey: `attach-${slot}`,
    ...(intentId ? { intentId } : {}),
  };
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

function renderResumeDialog() {
  return render(
    <SubmissionProvider>
      <ResumeDraftDialog categories={categories} />
    </SubmissionProvider>
  );
}

async function seedRestoredDraft(
  overrides: {
    attachments?: {
      id: string;
      submissionId: string;
      position: number;
      state: string;
      mediaIntentId: string;
    }[];
    mediaIntents?: {
      id: string;
      submissionId: string;
      state: string;
      slot: number | null;
      failureCode: string;
    }[];
    submissionState?: "draft" | "pending";
  } = {}
) {
  window.localStorage.setItem(RESUME_LOCATOR_STORAGE_KEY, "42");
  loadResumeState.mockResolvedValue({
    ok: true,
    state: {
      submission: { ...restoredContent, state: overrides.submissionState ?? "draft" },
      attachments: overrides.attachments ?? [],
      mediaIntents: overrides.mediaIntents ?? [],
    },
  });
  const view = renderResumeDialog();
  await flush();
  return view;
}

beforeEach(() => {
  jest.clearAllMocks();
  window.localStorage.clear();
  previewAction.mockResolvedValue({
    ok: true,
    url: "https://cdn.example.com/photo.jpg",
    expiresAt: "2026-01-01T00:00:00Z",
  });
  expireAction.mockResolvedValue({ ok: false, code: "MEDIA_STATE_CONFLICT" });
});

it("renders nothing when there is no draft to resume", async () => {
  renderResumeDialog();
  await flush();

  expect(loadResumeState).not.toHaveBeenCalled();
  expect(screen.queryByRole("button", { name: /resume draft/i })).toBeNull();
});

it("shows a loading indicator while checking for a saved draft", async () => {
  window.localStorage.setItem(RESUME_LOCATOR_STORAGE_KEY, "42");
  let resolveLoad!: (value: Awaited<ReturnType<typeof loadSubmissionMediaStateV3>>) => void;
  loadResumeState.mockReturnValue(
    new Promise((resolve) => {
      resolveLoad = resolve;
    })
  );
  renderResumeDialog();

  expect(screen.getByRole("status")).toHaveTextContent(
    "Checking for a saved draft…"
  );

  await act(async () => {
    resolveLoad({
      ok: true,
      state: {
        submission: { ...restoredContent },
        attachments: [],
        mediaIntents: [],
      },
    });
    await flush();
  });

  expect(
    screen.getByRole("button", { name: /resume draft/i })
  ).toBeInTheDocument();
});

it("opens with the restored fields pre-filled and shows a photo preview", async () => {
  await seedRestoredDraft({
    attachments: [
      {
        id: "att-0",
        submissionId: "42",
        position: 0,
        state: "attached",
        mediaIntentId: "intent-0",
      },
    ],
  });

  fireEvent.click(screen.getByRole("button", { name: /resume draft/i }));

  expect(screen.getByLabelText("Name")).toHaveValue("Resumed place");
  expect(screen.getByLabelText("Address label (optional)")).toHaveValue(
    "Human label"
  );
  expect(screen.getByLabelText("Description (optional)")).toHaveValue(
    "A description"
  );
  expect(screen.getByLabelText("Website (optional)")).toHaveValue(
    "https://www.smokemap.org/place"
  );
  expect(screen.getByText("Quiet patio")).toBeInTheDocument();

  await waitFor(() => expect(previewAction).toHaveBeenCalledWith("att-0"));
  await waitFor(() =>
    expect(screen.getByRole("img")).toHaveAttribute(
      "src",
      "https://cdn.example.com/photo.jpg"
    )
  );
});

it("saves edited fields without touching the unchanged location", async () => {
  await seedRestoredDraft();
  editRestoredAction.mockResolvedValue({
    ok: true,
    replayed: false,
    submission: { ...restoredContent, name: "Updated place", state: "draft" },
  });

  fireEvent.click(screen.getByRole("button", { name: /resume draft/i }));
  fireEvent.change(screen.getByLabelText("Name"), {
    target: { value: "Updated place" },
  });
  fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
  await flush();

  expect(editRestoredAction).toHaveBeenCalledTimes(1);
  const [submissionId, input] = editRestoredAction.mock.calls[0];
  expect(submissionId).toBe("42");
  expect(input).toEqual(
    expect.objectContaining({
      name: "Updated place",
      longitude: restoredContent.longitude,
      latitude: restoredContent.latitude,
    })
  );
});

it("removes an attached photo", async () => {
  await seedRestoredDraft({
    attachments: [
      {
        id: "att-0",
        submissionId: "42",
        position: 0,
        state: "attached",
        mediaIntentId: "intent-0",
      },
    ],
  });
  removeAction.mockResolvedValue({
    ok: true,
    replayed: false,
    intent: {
      id: "intent-0",
      submissionId: "42",
      state: "cleanup_pending",
      slot: 0,
      failureCode: "",
    },
  });

  fireEvent.click(screen.getByRole("button", { name: /resume draft/i }));
  fireEvent.click(screen.getByRole("button", { name: /remove photo 1/i }));
  await flush();

  expect(removeAction).toHaveBeenCalledWith("intent-0", expect.any(String));
  expect(screen.queryByText("Photo 1")).toBeNull();
});

it("reorders attached photos", async () => {
  await seedRestoredDraft({
    attachments: [
      {
        id: "att-0",
        submissionId: "42",
        position: 0,
        state: "attached",
        mediaIntentId: "intent-0",
      },
      {
        id: "att-1",
        submissionId: "42",
        position: 1,
        state: "attached",
        mediaIntentId: "intent-1",
      },
    ],
  });
  reorderAction.mockResolvedValue({
    ok: true,
    replayed: false,
    orderedAttachmentIds: ["att-1", "att-0"],
  });

  fireEvent.click(screen.getByRole("button", { name: /resume draft/i }));
  fireEvent.click(screen.getByRole("button", { name: /move photo 1 later/i }));
  await flush();

  expect(reorderAction).toHaveBeenCalledWith(
    "42",
    ["att-1", "att-0"],
    expect.any(String)
  );
});

it("requires reselecting a file before retrying an interrupted upload", async () => {
  await seedRestoredDraft({
    mediaIntents: [
      { id: "intent-active", submissionId: "42", state: "issued", slot: 1, failureCode: "" },
    ],
  });
  createResumedOp.mockReturnValue(fakeOp(1, "intent-active"));
  runMedia.mockImplementation((_submissionId, op) => {
    op.attached = true;
    op.attachmentId = "att-new";
    op.intentId = "intent-active";
    return Promise.resolve({ ok: true });
  });

  fireEvent.click(screen.getByRole("button", { name: /resume draft/i }));
  const retryButton = screen.getByRole("button", { name: "Upload and retry" });
  expect(retryButton).toBeDisabled();

  const file = new File(["content"], "photo.png", { type: "image/png" });
  fireEvent.change(
    screen.getByLabelText(/choose the photo again to continue this upload/i),
    { target: { files: [file] } }
  );
  expect(retryButton).toBeEnabled();

  fireEvent.click(retryButton);
  await flush();

  expect(createResumedOp).toHaveBeenCalledWith(
    { id: "intent-active", slot: 1, state: "issued" },
    file
  );
  expect(screen.queryByText(/upload was interrupted/i)).toBeNull();
});

it("shows a permanent failure message for a blocked upload", async () => {
  await seedRestoredDraft({
    mediaIntents: [
      {
        id: "intent-blocked",
        submissionId: "42",
        state: "failed",
        slot: 2,
        failureCode: "MEDIA_UPLOAD_FAILED",
      },
    ],
  });

  fireEvent.click(screen.getByRole("button", { name: /resume draft/i }));

  expect(
    screen.getByText(new RegExp(describeFailure("MEDIA_UPLOAD_FAILED")))
  ).toBeInTheDocument();
});

it("blocks finalizing until interrupted uploads are resolved", async () => {
  await seedRestoredDraft({
    mediaIntents: [
      { id: "intent-active", submissionId: "42", state: "verified", slot: 0, failureCode: "" },
    ],
  });

  fireEvent.click(screen.getByRole("button", { name: /resume draft/i }));
  const finalizeButton = screen.getByRole("button", { name: /finalize for review/i });

  expect(finalizeButton).toBeDisabled();
  expect(finalizeButton).toHaveAttribute(
    "title",
    "Resolve the interrupted photo uploads below before finalizing."
  );
});

it("finalizes a ready draft", async () => {
  await seedRestoredDraft({
    attachments: [
      {
        id: "att-0",
        submissionId: "42",
        position: 0,
        state: "attached",
        mediaIntentId: "intent-0",
      },
    ],
  });
  finalizeAction.mockResolvedValue({
    ok: true,
    submission: { id: "42", state: "pending" },
  });

  fireEvent.click(screen.getByRole("button", { name: /resume draft/i }));
  const finalizeButton = screen.getByRole("button", { name: /finalize for review/i });
  expect(finalizeButton).toBeEnabled();

  fireEvent.click(finalizeButton);
  await flush();

  expect(finalizeAction).toHaveBeenCalledWith("42", expect.any(String));
  expect(screen.queryByRole("button", { name: /resume draft/i })).toBeNull();
});

it("requires a confirmation step before discarding a draft", async () => {
  await seedRestoredDraft();

  fireEvent.click(screen.getByRole("button", { name: /resume draft/i }));
  fireEvent.click(screen.getByRole("button", { name: /discard draft/i }));

  expect(
    screen.getByText(/discard this draft\? this cannot be undone/i)
  ).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /keep draft/i }));

  expect(
    screen.queryByText(/discard this draft\? this cannot be undone/i)
  ).toBeNull();
  expect(screen.getByLabelText("Name")).toHaveValue("Resumed place");
});

it("discards a draft, best-effort expiring its active intents, after confirming", async () => {
  await seedRestoredDraft({
    mediaIntents: [
      { id: "intent-active", submissionId: "42", state: "verified", slot: 0, failureCode: "" },
    ],
  });

  fireEvent.click(screen.getByRole("button", { name: /resume draft/i }));
  fireEvent.click(screen.getByRole("button", { name: /discard draft/i }));
  fireEvent.click(screen.getByRole("button", { name: /^discard draft$/i }));
  await flush();

  expect(expireAction).toHaveBeenCalledWith("intent-active", expect.any(String));
  expect(window.localStorage.getItem(RESUME_LOCATOR_STORAGE_KEY)).toBeNull();
  expect(screen.queryByRole("button", { name: /resume draft/i })).toBeNull();
});

it("shows a read-only summary for a pending submission and lets the user close it", async () => {
  await seedRestoredDraft({ submissionState: "pending" });

  const trigger = screen.getByRole("button", { name: /submission pending review/i });
  fireEvent.click(trigger);

  expect(screen.getByText(/nothing will be lost/i)).toBeInTheDocument();
  expect(screen.queryByLabelText("Name")).toBeNull();
  expect(screen.queryByRole("button", { name: /save changes/i })).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: /got it/i }));
  await flush();

  expect(screen.queryByRole("button", { name: /submission pending review/i })).toBeNull();
});

it("surfaces a save failure and lets the user dismiss it without losing the draft", async () => {
  await seedRestoredDraft();
  editRestoredAction.mockResolvedValue({
    ok: false,
    code: "SUBMISSION_EDIT_FAILED",
  });

  fireEvent.click(screen.getByRole("button", { name: /resume draft/i }));
  fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
  await flush();

  expect(
    screen.getByText(describeFailure("SUBMISSION_EDIT_FAILED"))
  ).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));

  expect(
    screen.queryByText(describeFailure("SUBMISSION_EDIT_FAILED"))
  ).toBeNull();
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(screen.getByLabelText("Name")).toHaveValue("Resumed place");
});
