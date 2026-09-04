import { useState } from "react";
import { v4 as uuid } from "uuid";
import { act, fireEvent, render, screen } from "@/test/render";

import {
  createSubmissionV3,
  editSubmissionV3,
  finalizeSubmissionV3,
  loadSubmissionMediaStateV3,
  reorderSubmissionMediaV3,
  type SubmissionActionResult,
} from "./actions";
import {
  expireMediaUploadIntent,
  mediaAttachmentPreviewV3,
  removeAttachedMedia,
} from "./media-actions";
import {
  createMediaSlotOperation,
  createMediaSlotOperations,
  createResumedMediaSlotOperation,
  runMediaSlot,
  type MediaSlotOperation,
  type MediaSlotResult,
} from "./media-pipeline";
import type { M3SubmissionInput } from "./m3-schema";
import { SubmissionProvider, useSubmission } from "./submission-provider";
import { SubmissionStatus } from "./submission-status";

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

jest.mock("uuid", () => ({
  v4: jest.fn(),
}));

const create = createSubmissionV3 as jest.MockedFunction<
  typeof createSubmissionV3
>;
const finalize = finalizeSubmissionV3 as jest.MockedFunction<
  typeof finalizeSubmissionV3
>;
const editRestoredAction = editSubmissionV3 as jest.MockedFunction<
  typeof editSubmissionV3
>;
const loadResumeState = loadSubmissionMediaStateV3 as jest.MockedFunction<
  typeof loadSubmissionMediaStateV3
>;
const reorderRestoredMediaAction = reorderSubmissionMediaV3 as jest.MockedFunction<
  typeof reorderSubmissionMediaV3
>;
const removeRestoredMediaAction = removeAttachedMedia as jest.MockedFunction<
  typeof removeAttachedMedia
>;
const previewRestoredMediaAction = mediaAttachmentPreviewV3 as jest.MockedFunction<
  typeof mediaAttachmentPreviewV3
>;
const expireMediaUploadIntentAction = expireMediaUploadIntent as jest.MockedFunction<
  typeof expireMediaUploadIntent
>;
const createKey = uuid as jest.MockedFunction<typeof uuid>;
const createMediaOps = createMediaSlotOperations as jest.MockedFunction<
  typeof createMediaSlotOperations
>;
const createMediaOp = createMediaSlotOperation as jest.MockedFunction<
  typeof createMediaSlotOperation
>;
const createResumedMediaOp = createResumedMediaSlotOperation as jest.MockedFunction<
  typeof createResumedMediaSlotOperation
>;
const runMedia = runMediaSlot as jest.MockedFunction<typeof runMediaSlot>;

function fakeMediaOp(slot: number): MediaSlotOperation {
  return {
    file: new File(["content"], `photo-${slot}.png`, { type: "image/png" }),
    slot,
    mimeType: "image/png",
    createIntentKey: `create-${slot}`,
    issueKey: `issue-${slot}`,
    verifyKey: `verify-${slot}`,
    attachKey: `attach-${slot}`,
  };
}

const validInput: M3SubmissionInput = {
  name: "Zero image place",
  categorySlug: "outdoors",
  longitude: -77.0365,
  latitude: 38.8977,
  addressLabel: "Human label",
  tags: ["Quiet patio"],
  description: "A description",
  website: "https://www.smokemap.org/place",
};

function deferred<T>() {
  let resolveDeferred!: (value: T) => void;
  const promise = new Promise<T>((resolve) => {
    resolveDeferred = resolve;
  });
  return { promise, resolve: resolveDeferred };
}

function Controls({
  input = validInput,
  images = [],
}: {
  input?: M3SubmissionInput;
  images?: File[];
}) {
  const { progress, submit, retry } = useSubmission();
  return (
    <>
      <output data-testid="phase">{progress.phase}</output>
      <output data-testid="submission-id">{progress.submissionId}</output>
      <output data-testid="media-index">{progress.mediaIndex}</output>
      <output data-testid="media-count">{progress.mediaCount}</output>
      <output data-testid="failure-operation">
        {progress.failure?.operation}
      </output>
      <output data-testid="failure-code">{progress.failure?.code}</output>
      <button onClick={() => submit(input, images)}>submit</button>
      <button onClick={retry}>retry</button>
    </>
  );
}

function renderFlow(
  input: M3SubmissionInput = validInput,
  images: File[] = []
) {
  return render(
    <SubmissionProvider>
      <Controls input={input} images={images} />
      <SubmissionStatus />
    </SubmissionProvider>
  );
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  window.localStorage.clear();
  createKey
    .mockReturnValueOnce("create-key")
    .mockReturnValueOnce("finalize-key");
  createMediaOps.mockImplementation((files: File[]) =>
    files.map((_file, slot) => fakeMediaOp(slot))
  );
  createMediaOp.mockImplementation((slot: number) => fakeMediaOp(slot));
  runMedia.mockResolvedValue({ ok: true });
  expireMediaUploadIntentAction.mockResolvedValue({
    ok: false,
    code: "MEDIA_STATE_CONFLICT",
  });
});

it("creates and finalizes a zero-image submission before reporting pending", async () => {
  create.mockResolvedValue({
    ok: true,
    submission: { id: "42", state: "draft" },
  });
  finalize.mockResolvedValue({
    ok: true,
    submission: { id: "42", state: "pending" },
  });
  renderFlow();

  fireEvent.click(screen.getByText("submit"));
  await flush();

  expect(create).toHaveBeenCalledWith(
    expect.objectContaining({ name: "Zero image place" }),
    "create-key"
  );
  expect(finalize).toHaveBeenCalledWith("42", "finalize-key");
  expect(screen.getByTestId("phase")).toHaveTextContent("pending");
  expect(screen.getByTestId("submission-id")).toHaveTextContent("42");
});

it("rejects invalid M3 fields before either mutation", () => {
  renderFlow({ ...validInput, longitude: Number.NaN });

  fireEvent.click(screen.getByText("submit"));

  expect(create).not.toHaveBeenCalled();
  expect(finalize).not.toHaveBeenCalled();
  expect(screen.getByTestId("phase")).toHaveTextContent("failed");
  expect(screen.getByTestId("failure-operation")).toHaveTextContent(
    "validation"
  );
});

it("reports create failure and reuses the create key on retry", async () => {
  create
    .mockResolvedValueOnce({ ok: false, code: "SUBMISSION_CREATE_FAILED" })
    .mockResolvedValueOnce({
      ok: true,
      submission: { id: "42", state: "draft" },
    });
  finalize.mockResolvedValue({
    ok: true,
    submission: { id: "42", state: "pending" },
  });
  renderFlow();

  fireEvent.click(screen.getByText("submit"));
  await flush();
  expect(screen.getByTestId("failure-operation")).toHaveTextContent("create");

  fireEvent.click(screen.getByText("retry"));
  await flush();
  expect(create).toHaveBeenCalledTimes(2);
  expect(create.mock.calls[0][1]).toBe("create-key");
  expect(create.mock.calls[1][1]).toBe("create-key");
  expect(finalize).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId("phase")).toHaveTextContent("pending");
});

it("preserves the draft ID when finalization fails", async () => {
  create.mockResolvedValue({
    ok: true,
    submission: { id: "42", state: "draft" },
  });
  finalize.mockResolvedValue({
    ok: false,
    code: "SUBMISSION_FINALIZE_FAILED",
  });
  renderFlow();

  fireEvent.click(screen.getByText("submit"));
  await flush();

  expect(screen.getByTestId("failure-operation")).toHaveTextContent("finalize");
  expect(screen.getByTestId("submission-id")).toHaveTextContent("42");
});

it("retries finalization with the same key without creating another draft", async () => {
  create.mockResolvedValue({
    ok: true,
    submission: { id: "42", state: "draft" },
  });
  finalize
    .mockResolvedValueOnce({
      ok: false,
      code: "SUBMISSION_FINALIZE_FAILED",
    })
    .mockResolvedValueOnce({
      ok: true,
      submission: { id: "42", state: "pending" },
    });
  renderFlow();

  fireEvent.click(screen.getByText("submit"));
  await flush();
  fireEvent.click(screen.getByText("retry"));
  await flush();

  expect(create).toHaveBeenCalledTimes(1);
  expect(finalize).toHaveBeenCalledTimes(2);
  expect(finalize.mock.calls[0]).toEqual(["42", "finalize-key"]);
  expect(finalize.mock.calls[1]).toEqual(["42", "finalize-key"]);
  expect(screen.getByTestId("phase")).toHaveTextContent("pending");
});

it("blocks duplicate submits while create is active", async () => {
  const pendingCreate = deferred<SubmissionActionResult>();
  create.mockReturnValue(pendingCreate.promise);
  finalize.mockResolvedValue({
    ok: true,
    submission: { id: "42", state: "pending" },
  });
  renderFlow();

  fireEvent.click(screen.getByText("submit"));
  fireEvent.click(screen.getByText("submit"));
  expect(create).toHaveBeenCalledTimes(1);

  pendingCreate.resolve({
    ok: true,
    submission: { id: "42", state: "draft" },
  });
  await flush();
  expect(finalize).toHaveBeenCalledTimes(1);
});

it("blocks duplicate submits while finalize is active", async () => {
  const pendingFinalize = deferred<SubmissionActionResult>();
  create.mockResolvedValue({
    ok: true,
    submission: { id: "42", state: "draft" },
  });
  finalize.mockReturnValue(pendingFinalize.promise);
  renderFlow();

  fireEvent.click(screen.getByText("submit"));
  await flush();
  expect(screen.getByTestId("phase")).toHaveTextContent("finalizing");
  fireEvent.click(screen.getByText("submit"));

  expect(create).toHaveBeenCalledTimes(1);
  expect(finalize).toHaveBeenCalledTimes(1);
  pendingFinalize.resolve({
    ok: true,
    submission: { id: "42", state: "pending" },
  });
  await flush();
});

it("continues safely when the map-owned controls unmount during submission", async () => {
  const pendingCreate = deferred<SubmissionActionResult>();
  create.mockReturnValue(pendingCreate.promise);
  finalize.mockResolvedValue({
    ok: true,
    submission: { id: "42", state: "pending" },
  });

  function NavigationHarness() {
    const [onMap, setOnMap] = useState(true);
    return (
      <SubmissionProvider>
        {onMap ? <Controls /> : <p>another route</p>}
        <SubmissionStatus />
        <button onClick={() => setOnMap(false)}>navigate</button>
      </SubmissionProvider>
    );
  }

  render(<NavigationHarness />);
  fireEvent.click(screen.getByText("submit"));
  fireEvent.click(screen.getByText("navigate"));
  expect(screen.queryByText("submit")).not.toBeInTheDocument();

  pendingCreate.resolve({
    ok: true,
    submission: { id: "42", state: "draft" },
  });
  await flush();

  expect(finalize).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("status")).toHaveAttribute(
    "data-submission-phase",
    "pending"
  );
  expect(screen.getByRole("status")).toHaveTextContent(
    "Submission 42 is pending review"
  );
});

it("allows a new submission after the previous one reaches pending", async () => {
  create.mockResolvedValue({
    ok: true,
    submission: { id: "42", state: "draft" },
  });
  finalize.mockResolvedValue({
    ok: true,
    submission: { id: "42", state: "pending" },
  });
  createKey
    .mockReset()
    .mockReturnValueOnce("create-key-1")
    .mockReturnValueOnce("finalize-key-1")
    .mockReturnValueOnce("create-key-2")
    .mockReturnValueOnce("finalize-key-2");
  renderFlow();

  fireEvent.click(screen.getByText("submit"));
  await flush();
  expect(screen.getByTestId("phase")).toHaveTextContent("pending");

  fireEvent.click(screen.getByText("submit"));
  await flush();

  expect(create).toHaveBeenCalledTimes(2);
  expect(finalize).toHaveBeenCalledTimes(2);
  expect(create.mock.calls[1][1]).toBe("create-key-2");
  expect(screen.getByTestId("phase")).toHaveTextContent("pending");
});

it("does not start finalization after the owning provider is cancelled", async () => {
  const pendingCreate = deferred<SubmissionActionResult>();
  create.mockReturnValue(pendingCreate.promise);
  const view = renderFlow();

  fireEvent.click(screen.getByText("submit"));
  view.unmount();
  pendingCreate.resolve({
    ok: true,
    submission: { id: "42", state: "draft" },
  });
  await flush();

  expect(create).toHaveBeenCalledTimes(1);
  expect(finalize).not.toHaveBeenCalled();
});

describe("live media uploads", () => {
  const photoOne = new File(["one"], "one.png", { type: "image/png" });
  const photoTwo = new File(["two"], "two.png", { type: "image/png" });

  beforeEach(() => {
    create.mockResolvedValue({
      ok: true,
      submission: { id: "42", state: "draft" },
    });
    finalize.mockResolvedValue({
      ok: true,
      submission: { id: "42", state: "pending" },
    });
  });

  it("rejects more than three images before creating a submission", async () => {
    const tooMany = [photoOne, photoTwo, photoOne, photoTwo];
    renderFlow(validInput, tooMany);

    fireEvent.click(screen.getByText("submit"));
    await flush();

    expect(create).not.toHaveBeenCalled();
    expect(createMediaOps).not.toHaveBeenCalled();
    expect(screen.getByTestId("phase")).toHaveTextContent("failed");
    expect(screen.getByTestId("failure-operation")).toHaveTextContent(
      "validation"
    );
    expect(screen.getByTestId("failure-code")).toHaveTextContent(
      "TOO_MANY_MEDIA_FILES"
    );
  });

  it("runs media slots for every selected image, in order, before finalizing", async () => {
    const order: number[] = [];
    runMedia.mockImplementation((_submissionId, op) => {
      order.push(op.slot);
      return Promise.resolve({ ok: true });
    });
    renderFlow(validInput, [photoOne, photoTwo]);

    fireEvent.click(screen.getByText("submit"));
    await flush();

    expect(createMediaOps).toHaveBeenCalledWith([photoOne, photoTwo]);
    expect(order).toEqual([0, 1]);
    expect(runMedia.mock.calls[0][0]).toBe("42");
    expect(runMedia.mock.calls[1][0]).toBe("42");
    expect(finalize).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("phase")).toHaveTextContent("pending");
  });

  it("submits and finalizes a full three-image submission", async () => {
    const photoThree = new File(["three"], "three.png", { type: "image/png" });
    const order: number[] = [];
    runMedia.mockImplementation((_submissionId, op) => {
      order.push(op.slot);
      return Promise.resolve({ ok: true });
    });
    renderFlow(validInput, [photoOne, photoTwo, photoThree]);

    fireEvent.click(screen.getByText("submit"));
    await flush();

    expect(createMediaOps).toHaveBeenCalledWith([
      photoOne,
      photoTwo,
      photoThree,
    ]);
    expect(order).toEqual([0, 1, 2]);
    expect(runMedia).toHaveBeenCalledTimes(3);
    expect(finalize).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("phase")).toHaveTextContent("pending");
  });

  it("does not finalize until every image has been attached", async () => {
    let resolveFirst!: (value: MediaSlotResult) => void;
    runMedia
      .mockImplementationOnce(
        () =>
          new Promise<MediaSlotResult>((resolve) => {
            resolveFirst = resolve;
          })
      )
      .mockResolvedValueOnce({ ok: true });
    renderFlow(validInput, [photoOne, photoTwo]);

    fireEvent.click(screen.getByText("submit"));
    await flush();

    expect(runMedia).toHaveBeenCalledTimes(1);
    expect(finalize).not.toHaveBeenCalled();

    resolveFirst({ ok: true });
    await flush();

    expect(runMedia).toHaveBeenCalledTimes(2);
    expect(finalize).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("phase")).toHaveTextContent("pending");
  });

  it("shows the upload/verify/attach phase with the media index and count", async () => {
    const pendingMedia = deferred<MediaSlotResult>();
    runMedia.mockImplementation((_submissionId, _op, onPhase) => {
      onPhase("verifying");
      return pendingMedia.promise;
    });
    renderFlow(validInput, [photoOne, photoTwo]);

    fireEvent.click(screen.getByText("submit"));
    await flush();

    expect(screen.getByTestId("phase")).toHaveTextContent("verifying");
    expect(screen.getByTestId("media-index")).toHaveTextContent("0");
    expect(screen.getByTestId("media-count")).toHaveTextContent("2");

    pendingMedia.resolve({ ok: true });
    await flush();
  });

  it("stops before finalizing when a media slot fails, preserving the submission id", async () => {
    runMedia.mockResolvedValue({
      ok: false,
      failure: {
        operation: "media_verify",
        code: "MEDIA_VERIFICATION_FAILED",
        slot: 0,
      },
    });
    renderFlow(validInput, [photoOne]);

    fireEvent.click(screen.getByText("submit"));
    await flush();

    expect(finalize).not.toHaveBeenCalled();
    expect(screen.getByTestId("phase")).toHaveTextContent("failed");
    expect(screen.getByTestId("submission-id")).toHaveTextContent("42");
    expect(screen.getByTestId("failure-operation")).toHaveTextContent(
      "media_verify"
    );
    expect(screen.getByTestId("failure-code")).toHaveTextContent(
      "MEDIA_VERIFICATION_FAILED"
    );
  });

  it("resumes only the unattached image on retry, without redoing an already-attached one", async () => {
    let slotOneAttempts = 0;
    runMedia.mockImplementation((_submissionId, op) => {
      if (op.slot === 0) {
        op.attached = true;
        return Promise.resolve({ ok: true });
      }
      slotOneAttempts += 1;
      if (slotOneAttempts === 1) {
        return Promise.resolve({
          ok: false,
          failure: {
            operation: "media_upload" as const,
            code: "MEDIA_UPLOAD_FAILED",
            slot: 1,
          },
        });
      }
      op.attached = true;
      return Promise.resolve({ ok: true });
    });
    renderFlow(validInput, [photoOne, photoTwo]);

    fireEvent.click(screen.getByText("submit"));
    await flush();

    expect(screen.getByTestId("phase")).toHaveTextContent("failed");
    expect(create).toHaveBeenCalledTimes(1);
    expect(runMedia).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByText("retry"));
    await flush();

    expect(create).toHaveBeenCalledTimes(1);
    expect(runMedia).toHaveBeenCalledTimes(3);
    expect(runMedia.mock.calls[2][1].slot).toBe(1);
    expect(finalize).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("phase")).toHaveTextContent("pending");
  });

  it("blocks duplicate submits while a media slot is uploading", async () => {
    const pendingMedia = deferred<MediaSlotResult>();
    runMedia.mockReturnValue(pendingMedia.promise);
    renderFlow(validInput, [photoOne]);

    fireEvent.click(screen.getByText("submit"));
    await flush();
    fireEvent.click(screen.getByText("submit"));

    expect(create).toHaveBeenCalledTimes(1);
    expect(runMedia).toHaveBeenCalledTimes(1);

    pendingMedia.resolve({ ok: true });
    await flush();
    expect(finalize).toHaveBeenCalledTimes(1);
  });

  it("continues media work when the map-owned controls unmount during navigation", async () => {
    const pendingMedia = deferred<MediaSlotResult>();
    runMedia.mockReturnValue(pendingMedia.promise);

    function MediaNavigationHarness() {
      const [onMap, setOnMap] = useState(true);
      return (
        <SubmissionProvider>
          {onMap ? <Controls images={[photoOne]} /> : <p>another route</p>}
          <SubmissionStatus />
          <button onClick={() => setOnMap(false)}>navigate</button>
        </SubmissionProvider>
      );
    }

    render(<MediaNavigationHarness />);
    fireEvent.click(screen.getByText("submit"));
    await flush();
    expect(runMedia).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText("navigate"));
    expect(screen.queryByText("submit")).not.toBeInTheDocument();
    pendingMedia.resolve({ ok: true });
    await flush();

    expect(finalize).toHaveBeenCalledWith("42", "finalize-key");
    expect(screen.getByRole("status")).toHaveAttribute(
      "data-submission-phase",
      "pending"
    );
  });
});

describe("resuming a draft or pending submission", () => {
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

  function ResumeControls() {
    const {
      resumeStatus,
      restored,
      resumeAction,
      resumeActive,
      editRestored,
      replaceRestoredMedia,
      retryRestoredMedia,
      removeRestoredMedia,
      reorderRestoredMedia,
      finalizeRestored,
      discardRestored,
      dismissResumeAction,
      previewRestoredMedia,
    } = useSubmission();
    const [previewResult, setPreviewResult] = useState("");
    return (
      <>
        <output data-testid="resume-status">{resumeStatus}</output>
        <output data-testid="resume-phase">{resumeAction.phase}</output>
        <output data-testid="resume-failure-op">
          {resumeAction.failure?.operation}
        </output>
        <output data-testid="resume-failure-code">
          {resumeAction.failure?.code}
        </output>
        <output data-testid="resume-active">{String(resumeActive)}</output>
        <output data-testid="restored-name">{restored?.input.name}</output>
        <output data-testid="restored-attachments">
          {restored?.attachments
            .map((attachment) => `${attachment.position}:${attachment.attachmentId}`)
            .join(",")}
        </output>
        <output data-testid="restored-active-intents">
          {restored?.activeIntents
            .map((intent) => `${intent.slot}:${intent.intentId}:${intent.state}`)
            .join(",")}
        </output>
        <output data-testid="restored-blocked-intents">
          {restored?.blockedIntents
            .map((intent) => `${intent.slot}:${intent.intentId}:${intent.state}`)
            .join(",")}
        </output>
        <output data-testid="preview-result">{previewResult}</output>
        <button
          onClick={() =>
            editRestored({ ...validInput, name: "Edited name" })
          }
        >
          editRestored
        </button>
        <button
          onClick={() =>
            replaceRestoredMedia(
              new File(["x"], "x.png", { type: "image/png" })
            )
          }
        >
          replaceRestoredMedia
        </button>
        <button
          onClick={() =>
            retryRestoredMedia(
              "intent-active",
              new File(["y"], "y.png", { type: "image/png" })
            )
          }
        >
          retryRestoredMedia
        </button>
        <button onClick={() => retryRestoredMedia("intent-active")}>
          retryRestoredMediaNoFile
        </button>
        <button onClick={() => removeRestoredMedia("att-0")}>
          removeRestoredMedia
        </button>
        <button onClick={() => reorderRestoredMedia(["att-2", "att-0"])}>
          reorderRestoredMedia
        </button>
        <button onClick={() => finalizeRestored()}>finalizeRestored</button>
        <button onClick={() => discardRestored()}>discardRestored</button>
        <button onClick={() => dismissResumeAction()}>
          dismissResumeAction
        </button>
        <button
          onClick={() => {
            void previewRestoredMedia("att-0").then((result) =>
              setPreviewResult(result.ok ? result.url : result.code)
            );
          }}
        >
          previewRestoredMedia
        </button>
      </>
    );
  }

  function renderResumeFlow() {
    return render(
      <SubmissionProvider>
        <ResumeControls />
        <SubmissionStatus />
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
        submission: {
          ...restoredContent,
          state: overrides.submissionState ?? "draft",
        },
        attachments: overrides.attachments ?? [],
        mediaIntents: overrides.mediaIntents ?? [],
      },
    });
    const view = renderResumeFlow();
    await flush();
    return view;
  }

  it("does nothing when no locator has been stored", async () => {
    renderResumeFlow();
    await flush();

    expect(loadResumeState).not.toHaveBeenCalled();
    expect(screen.getByTestId("resume-status")).toHaveTextContent("idle");
  });

  it("recovers a draft and its media state from a stored locator", async () => {
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
      mediaIntents: [
        {
          id: "intent-active",
          submissionId: "42",
          state: "issued",
          slot: 1,
          failureCode: "",
        },
      ],
    });

    expect(loadResumeState).toHaveBeenCalledWith("42");
    expect(screen.getByTestId("resume-status")).toHaveTextContent("ready");
    expect(screen.getByTestId("restored-name")).toHaveTextContent(
      "Resumed place"
    );
    expect(screen.getByTestId("restored-attachments")).toHaveTextContent(
      "0:att-0"
    );
    expect(screen.getByTestId("restored-active-intents")).toHaveTextContent(
      "1:intent-active:issued"
    );
  });

  it("clears the locator when the draft can no longer be resumed", async () => {
    window.localStorage.setItem(RESUME_LOCATOR_STORAGE_KEY, "stale");
    loadResumeState.mockResolvedValue({ ok: false, code: "NOT_FOUND" });

    renderResumeFlow();
    await flush();

    expect(screen.getByTestId("resume-status")).toHaveTextContent(
      "not_found"
    );
    expect(
      window.localStorage.getItem(RESUME_LOCATOR_STORAGE_KEY)
    ).toBeNull();
  });

  it("keeps the locator when the resume check fails transiently, not because the draft is gone", async () => {
    window.localStorage.setItem(RESUME_LOCATOR_STORAGE_KEY, "42");
    loadResumeState.mockResolvedValue({
      ok: false,
      code: "AUTHENTICATION_REQUIRED",
    });

    renderResumeFlow();
    await flush();

    expect(screen.getByTestId("resume-status")).toHaveTextContent("error");
    expect(window.localStorage.getItem(RESUME_LOCATOR_STORAGE_KEY)).toBe(
      "42"
    );
  });

  it("persists the locator once the draft is created, while finalization is still pending", async () => {
    create.mockResolvedValue({
      ok: true,
      submission: { id: "77", state: "draft" },
    });
    const pendingFinalize = deferred<Awaited<ReturnType<typeof finalize>>>();
    finalize.mockReturnValue(pendingFinalize.promise);
    renderFlow();

    fireEvent.click(screen.getByText("submit"));
    await flush();

    expect(
      window.localStorage.getItem(RESUME_LOCATOR_STORAGE_KEY)
    ).toBe("77");

    pendingFinalize.resolve({
      ok: true,
      submission: { id: "77", state: "pending" },
    });
    await flush();
  });

  it("clears the locator once a brand-new submission finalizes, so it is never re-offered as a resumable draft", async () => {
    create.mockResolvedValue({
      ok: true,
      submission: { id: "77", state: "draft" },
    });
    finalize.mockResolvedValue({
      ok: true,
      submission: { id: "77", state: "pending" },
    });
    renderFlow();

    fireEvent.click(screen.getByText("submit"));
    await flush();

    expect(
      window.localStorage.getItem(RESUME_LOCATOR_STORAGE_KEY)
    ).toBeNull();
  });

  it("edits the restored draft's content", async () => {
    await seedRestoredDraft();
    editRestoredAction.mockResolvedValue({
      ok: true,
      replayed: false,
      submission: { ...restoredContent, name: "Edited name" },
    });

    fireEvent.click(screen.getByText("editRestored"));
    await flush();

    expect(editRestoredAction).toHaveBeenCalledWith(
      "42",
      expect.objectContaining({ name: "Edited name" }),
      expect.any(String)
    );
    expect(screen.getByTestId("restored-name")).toHaveTextContent(
      "Edited name"
    );
    expect(screen.getByTestId("resume-phase")).toHaveTextContent("idle");
  });

  it("surfaces an edit failure without discarding the restored draft", async () => {
    await seedRestoredDraft();
    editRestoredAction.mockResolvedValue({
      ok: false,
      code: "DUPLICATE_SUBMISSION",
    });

    fireEvent.click(screen.getByText("editRestored"));
    await flush();

    expect(screen.getByTestId("resume-phase")).toHaveTextContent("failed");
    expect(screen.getByTestId("resume-failure-op")).toHaveTextContent(
      "resume_edit"
    );
    expect(screen.getByTestId("resume-failure-code")).toHaveTextContent(
      "DUPLICATE_SUBMISSION"
    );
    expect(screen.getByTestId("restored-name")).toHaveTextContent(
      "Resumed place"
    );
  });

  it("uploads a replacement photo into the next free slot", async () => {
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
    runMedia.mockImplementation((_submissionId, op) => {
      op.attached = true;
      op.attachmentId = "att-1";
      return Promise.resolve({ ok: true });
    });

    fireEvent.click(screen.getByText("replaceRestoredMedia"));
    await flush();

    expect(createMediaOp).toHaveBeenCalledWith(1, expect.any(File));
    expect(screen.getByTestId("restored-attachments")).toHaveTextContent(
      "0:att-0,1:att-1"
    );
    expect(screen.getByTestId("resume-phase")).toHaveTextContent("idle");
  });

  it("rejects a replacement photo once all three slots are occupied", async () => {
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
        {
          id: "att-2",
          submissionId: "42",
          position: 2,
          state: "attached",
          mediaIntentId: "intent-2",
        },
      ],
    });

    fireEvent.click(screen.getByText("replaceRestoredMedia"));
    await flush();

    expect(createMediaOp).not.toHaveBeenCalled();
    expect(screen.getByTestId("resume-phase")).toHaveTextContent("failed");
    expect(screen.getByTestId("resume-failure-code")).toHaveTextContent(
      "TOO_MANY_MEDIA_FILES"
    );
  });

  it("continues an active intent recovered from resume with a reselected file", async () => {
    await seedRestoredDraft({
      mediaIntents: [
        {
          id: "intent-active",
          submissionId: "42",
          state: "issued",
          slot: 1,
          failureCode: "",
        },
      ],
    });
    createResumedMediaOp.mockReturnValue(fakeMediaOp(1));
    runMedia.mockImplementation((_submissionId, op) => {
      op.attached = true;
      op.attachmentId = "att-1";
      return Promise.resolve({ ok: true });
    });

    fireEvent.click(screen.getByText("retryRestoredMedia"));
    await flush();

    expect(createResumedMediaOp).toHaveBeenCalledWith(
      { id: "intent-active", slot: 1, state: "issued" },
      expect.any(File)
    );
    expect(screen.getByTestId("restored-active-intents")).toHaveTextContent(
      ""
    );
    expect(screen.getByTestId("restored-attachments")).toHaveTextContent(
      "1:att-1"
    );
  });

  it("surfaces a reselect failure when an unverified active intent has no file yet", async () => {
    await seedRestoredDraft({
      mediaIntents: [
        {
          id: "intent-active",
          submissionId: "42",
          state: "issued",
          slot: 1,
          failureCode: "",
        },
      ],
    });
    createResumedMediaOp.mockReturnValue(fakeMediaOp(1));
    runMedia.mockResolvedValue({
      ok: false,
      failure: { operation: "media_reselect", code: "MEDIA_FILE_REQUIRED", slot: 1 },
    });

    fireEvent.click(screen.getByText("retryRestoredMediaNoFile"));
    await flush();

    expect(screen.getByTestId("resume-failure-op")).toHaveTextContent(
      "media_reselect"
    );
    expect(screen.getByTestId("resume-failure-code")).toHaveTextContent(
      "MEDIA_FILE_REQUIRED"
    );
  });

  it("removes an attached photo and frees its position", async () => {
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
    removeRestoredMediaAction.mockResolvedValue({
      ok: true,
      replayed: false,
      intent: {
        id: "intent-0",
        submissionId: "42",
        state: "cleanup_pending",
        slot: 0,
        failureCode: "media_removed",
      },
    });

    fireEvent.click(screen.getByText("removeRestoredMedia"));
    await flush();

    expect(removeRestoredMediaAction).toHaveBeenCalledWith(
      "intent-0",
      expect.any(String)
    );
    expect(screen.getByTestId("restored-attachments")).toHaveTextContent("");
    // The freed intent is still `cleanup_pending` server-side, not gone: it
    // must keep blocking finalization until the backend's own cleanup path
    // retires it, matching finalizeSubmissionV3's allowed intent states.
    expect(screen.getByTestId("restored-blocked-intents")).toHaveTextContent(
      "0:intent-0:cleanup_pending"
    );
  });

  it("reuses the same idempotency key when a remove is retried after a failure", async () => {
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
    createKey.mockReset();
    createKey.mockReturnValue("remove-key-1");
    removeRestoredMediaAction.mockResolvedValueOnce({
      ok: false,
      code: "MEDIA_REMOVE_FAILED",
    });

    fireEvent.click(screen.getByText("removeRestoredMedia"));
    await flush();

    expect(removeRestoredMediaAction).toHaveBeenNthCalledWith(
      1,
      "intent-0",
      "remove-key-1"
    );

    removeRestoredMediaAction.mockResolvedValueOnce({
      ok: true,
      replayed: false,
      intent: {
        id: "intent-0",
        submissionId: "42",
        state: "cleanup_pending",
        slot: 0,
        failureCode: "media_removed",
      },
    });
    fireEvent.click(screen.getByText("removeRestoredMedia"));
    await flush();

    // A retry of the *same* logical remove must reuse the key a lost
    // response never confirmed - a fresh key here would replay as a new
    // operation and, had the first attempt actually succeeded server-side,
    // surface a spurious "only attached media can be removed" conflict.
    expect(removeRestoredMediaAction).toHaveBeenNthCalledWith(
      2,
      "intent-0",
      "remove-key-1"
    );
  });

  it("blocks finalization while a removed-but-uncleaned intent remains", async () => {
    await seedRestoredDraft({
      mediaIntents: [
        {
          id: "intent-0",
          submissionId: "42",
          state: "cleanup_pending",
          slot: 0,
          failureCode: "media_removed",
        },
      ],
    });

    fireEvent.click(screen.getByText("finalizeRestored"));
    await flush();

    expect(finalize).not.toHaveBeenCalled();
  });

  it("reuses the same idempotency key when finalize is retried after a failure", async () => {
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
    createKey.mockReset();
    createKey.mockReturnValue("finalize-key-1");
    finalize.mockResolvedValueOnce({
      ok: false,
      code: "SUBMISSION_FINALIZE_FAILED",
    });

    fireEvent.click(screen.getByText("finalizeRestored"));
    await flush();

    expect(finalize).toHaveBeenNthCalledWith(1, "42", "finalize-key-1");

    finalize.mockResolvedValueOnce({
      ok: true,
      submission: { id: "42", state: "pending" },
    });
    fireEvent.click(screen.getByText("finalizeRestored"));
    await flush();

    expect(finalize).toHaveBeenNthCalledWith(2, "42", "finalize-key-1");
  });

  it("discards the restored draft and reaps its active media intents server-side", async () => {
    await seedRestoredDraft({
      mediaIntents: [
        {
          id: "intent-active",
          submissionId: "42",
          state: "issued",
          slot: 1,
          failureCode: "",
        },
      ],
    });

    fireEvent.click(screen.getByText("discardRestored"));
    await flush();

    expect(expireMediaUploadIntentAction).toHaveBeenCalledWith(
      "intent-active",
      expect.any(String)
    );
    expect(screen.getByTestId("resume-status")).toHaveTextContent("idle");
  });

  it("moves an intent to blocked, rather than leaving it retryable, once a resumed verify reports it terminally failed", async () => {
    await seedRestoredDraft({
      mediaIntents: [
        {
          id: "intent-active",
          submissionId: "42",
          state: "verified",
          slot: 1,
          failureCode: "",
        },
      ],
    });
    createResumedMediaOp.mockReturnValue({
      ...fakeMediaOp(1),
      intentId: "intent-active",
      verified: true,
      uploaded: true,
      issuedOnce: true,
    });
    runMedia.mockResolvedValue({
      ok: false,
      failure: {
        operation: "media_attach",
        code: "MEDIA_INTENT_EXPIRED",
        slot: 1,
      },
    });

    fireEvent.click(screen.getByText("retryRestoredMediaNoFile"));
    await flush();

    expect(screen.getByTestId("restored-active-intents")).toHaveTextContent(
      ""
    );
    expect(screen.getByTestId("restored-blocked-intents")).toHaveTextContent(
      "1:intent-active:cleanup_pending"
    );
  });

  it("reorders the retained attachments to match the requested sequence", async () => {
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
          id: "att-2",
          submissionId: "42",
          position: 1,
          state: "attached",
          mediaIntentId: "intent-2",
        },
      ],
    });
    reorderRestoredMediaAction.mockResolvedValue({
      ok: true,
      replayed: false,
      orderedAttachmentIds: ["att-2", "att-0"],
    });

    fireEvent.click(screen.getByText("reorderRestoredMedia"));
    await flush();

    expect(reorderRestoredMediaAction).toHaveBeenCalledWith(
      "42",
      ["att-2", "att-0"],
      expect.any(String)
    );
    expect(screen.getByTestId("restored-attachments")).toHaveTextContent(
      "0:att-2,1:att-0"
    );
  });

  it("blocks finalization while an active intent remains unresolved", async () => {
    await seedRestoredDraft({
      mediaIntents: [
        {
          id: "intent-active",
          submissionId: "42",
          state: "issued",
          slot: 1,
          failureCode: "",
        },
      ],
    });

    fireEvent.click(screen.getByText("finalizeRestored"));
    await flush();

    expect(finalize).not.toHaveBeenCalled();
  });

  it("finalizes the restored draft, clears the locator, and hands off to the pending status", async () => {
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
    finalize.mockResolvedValue({
      ok: true,
      submission: { id: "42", state: "pending" },
    });

    fireEvent.click(screen.getByText("finalizeRestored"));
    await flush();

    expect(finalize).toHaveBeenCalledWith("42", expect.any(String));
    expect(
      screen.getByText("Submission 42 is pending review.")
    ).toBeInTheDocument();
    expect(screen.getByTestId("resume-status")).toHaveTextContent("idle");
    expect(
      window.localStorage.getItem(RESUME_LOCATOR_STORAGE_KEY)
    ).toBeNull();
  });

  it("discards the restored draft locally without contacting the backend", async () => {
    await seedRestoredDraft();

    fireEvent.click(screen.getByText("discardRestored"));

    expect(screen.getByTestId("resume-status")).toHaveTextContent("idle");
    expect(screen.getByTestId("restored-name")).toHaveTextContent("");
    expect(
      window.localStorage.getItem(RESUME_LOCATOR_STORAGE_KEY)
    ).toBeNull();
    expect(editRestoredAction).not.toHaveBeenCalled();
  });

  it("requests a short-lived private preview URL for an attachment", async () => {
    await seedRestoredDraft();
    previewRestoredMediaAction.mockResolvedValue({
      ok: true,
      url: "https://storage.invalid/preview",
      expiresAt: "2026-01-01T00:10:00Z",
    });

    fireEvent.click(screen.getByText("previewRestoredMedia"));
    await flush();

    expect(previewRestoredMediaAction).toHaveBeenCalledWith("att-0");
    expect(screen.getByTestId("preview-result")).toHaveTextContent(
      "https://storage.invalid/preview"
    );
  });

  it("blocks content and media mutations on a submission that is already pending review", async () => {
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
      submissionState: "pending",
    });

    fireEvent.click(screen.getByText("editRestored"));
    fireEvent.click(screen.getByText("removeRestoredMedia"));
    fireEvent.click(screen.getByText("replaceRestoredMedia"));
    fireEvent.click(screen.getByText("finalizeRestored"));
    await flush();

    expect(editRestoredAction).not.toHaveBeenCalled();
    expect(removeRestoredMediaAction).not.toHaveBeenCalled();
    expect(createMediaOp).not.toHaveBeenCalled();
    expect(finalize).not.toHaveBeenCalled();
  });

  it("blocks a second resume action while one is already in flight", async () => {
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
    const pendingRemove = deferred<Awaited<ReturnType<typeof removeAttachedMedia>>>();
    removeRestoredMediaAction.mockReturnValue(pendingRemove.promise);

    fireEvent.click(screen.getByText("removeRestoredMedia"));
    fireEvent.click(screen.getByText("removeRestoredMedia"));

    expect(removeRestoredMediaAction).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("resume-active")).toHaveTextContent("true");

    pendingRemove.resolve({
      ok: true,
      replayed: false,
      intent: {
        id: "intent-0",
        submissionId: "42",
        state: "cleanup_pending",
        slot: 0,
        failureCode: "media_removed",
      },
    });
    await flush();

    expect(screen.getByTestId("resume-active")).toHaveTextContent("false");
  });

  it("ignores a resume action's outcome after the provider unmounts", async () => {
    const view = await seedRestoredDraft({
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
    const pendingRemove = deferred<Awaited<ReturnType<typeof removeAttachedMedia>>>();
    removeRestoredMediaAction.mockReturnValue(pendingRemove.promise);

    fireEvent.click(screen.getByText("removeRestoredMedia"));
    view.unmount();

    pendingRemove.resolve({
      ok: true,
      replayed: false,
      intent: {
        id: "intent-0",
        submissionId: "42",
        state: "cleanup_pending",
        slot: 0,
        failureCode: "media_removed",
      },
    });
    await flush();
  });

  it("dismisses a failed resume action without discarding the restored draft", async () => {
    await seedRestoredDraft();
    editRestoredAction.mockResolvedValue({
      ok: false,
      code: "SUBMISSION_EDIT_FAILED",
    });
    fireEvent.click(screen.getByText("editRestored"));
    await flush();
    expect(screen.getByTestId("resume-phase")).toHaveTextContent("failed");

    fireEvent.click(screen.getByText("dismissResumeAction"));

    expect(screen.getByTestId("resume-phase")).toHaveTextContent("idle");
    expect(screen.getByTestId("restored-name")).toHaveTextContent(
      "Resumed place"
    );
  });
});
