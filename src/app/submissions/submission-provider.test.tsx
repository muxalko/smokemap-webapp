import { useState } from "react";
import { v4 as uuid } from "uuid";
import { act, fireEvent, render, screen } from "@/test/render";

import {
  createSubmissionV3,
  finalizeSubmissionV3,
  type SubmissionActionResult,
} from "./actions";
import {
  createMediaSlotOperations,
  runMediaSlot,
  type MediaSlotOperation,
  type MediaSlotResult,
} from "./media-pipeline";
import type { M3SubmissionInput } from "./m3-schema";
import { SubmissionProvider, useSubmission } from "./submission-provider";
import { SubmissionStatus } from "./submission-status";

jest.mock("./actions", () => ({
  createSubmissionV3: jest.fn(),
  finalizeSubmissionV3: jest.fn(),
}));

jest.mock("./media-pipeline", () => ({
  createMediaSlotOperations: jest.fn(),
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
const createKey = uuid as jest.MockedFunction<typeof uuid>;
const createMediaOps = createMediaSlotOperations as jest.MockedFunction<
  typeof createMediaSlotOperations
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
  createKey
    .mockReturnValueOnce("create-key")
    .mockReturnValueOnce("finalize-key");
  createMediaOps.mockImplementation((files: File[]) =>
    files.map((_file, slot) => fakeMediaOp(slot))
  );
  runMedia.mockResolvedValue({ ok: true });
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
