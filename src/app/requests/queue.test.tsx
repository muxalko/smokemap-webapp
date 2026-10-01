jest.mock("./actions", () => ({
  approveSubmission: jest.fn(),
  deleteSubmission: jest.fn(),
  loadModerationPreview: jest.fn(),
  loadModerationQueue: jest.fn(),
}));

import { act, fireEvent, render, screen, waitFor } from "@/test/render";

import {
  approveSubmission,
  deleteSubmission,
  loadModerationPreview,
  loadModerationQueue,
} from "./actions";
import { ModerationQueue } from "./queue";
import type { ModerationQueueItem, ModerationQueueResult } from "./types";

const loadQueue = loadModerationQueue as jest.MockedFunction<
  typeof loadModerationQueue
>;
const approve = approveSubmission as jest.MockedFunction<
  typeof approveSubmission
>;
const remove = deleteSubmission as jest.MockedFunction<typeof deleteSubmission>;
const preview = loadModerationPreview as jest.MockedFunction<
  typeof loadModerationPreview
>;

const item: ModerationQueueItem = {
  id: "submission-1",
  name: "Cedar Garden",
  category: { name: "Outdoors" },
  address: {
    properties: { addressString: "1 Cedar Street" },
    geometry: { coordinates: [34.7818, 32.0853] },
  },
  description: "A quiet public garden",
  tags: ["quiet", "trees"],
  website: "https://example.test/garden",
  dateCreated: "2026-09-27T10:00:00Z",
  state: "pending",
  requestedBy: "requester-42",
  attachments: [{ id: "attachment-secret-id", position: 0 }],
};

function page(
  items: ModerationQueueItem[],
  hasNextPage = false,
  nextCursor: string | null = null
): ModerationQueueResult {
  return { ok: true, page: { items, hasNextPage, nextCursor } };
}

beforeEach(() => {
  jest.clearAllMocks();
  loadQueue.mockResolvedValue(page([item]));
  approve.mockResolvedValue({
    ok: true,
    submissionId: item.id,
    replayed: false,
  });
  remove.mockResolvedValue({ ok: true, submissionId: item.id });
  preview.mockResolvedValue({
    ok: true,
    url: "https://private-media.test/transient-preview",
    expiresAt: "2026-09-27T10:05:00Z",
  });
});

it("shows explicit loading and empty states", async () => {
  let resolveQueue: (result: ModerationQueueResult) => void = () => {};
  loadQueue.mockReturnValueOnce(
    new Promise((resolve) => {
      resolveQueue = resolve;
    })
  );
  render(<ModerationQueue canDelete={false} />);
  expect(screen.getByRole("status")).toHaveTextContent(
    "Loading pending submissions"
  );

  await act(() => {
    resolveQueue(page([]));
    return Promise.resolve();
  });
  expect(await screen.findByText("No pending submissions")).toBeInTheDocument();
});

it("renders required review context and fetches only a transient preview on demand", async () => {
  render(<ModerationQueue canDelete={false} />);
  expect(await screen.findByText("Cedar Garden")).toBeInTheDocument();
  expect(screen.getByText("Outdoors")).toBeInTheDocument();
  expect(screen.getByText("1 Cedar Street")).toBeInTheDocument();
  expect(screen.getByText("requester-42")).toBeInTheDocument();
  expect(screen.getByText("quiet")).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: /example.test/ })
  ).toBeInTheDocument();
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
  expect(preview).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole("button", { name: "Load private preview" }));
  const image = await screen.findByRole("img", {
    name: "Submitted attachment 1",
  });
  expect(image).toHaveAttribute(
    "src",
    "https://private-media.test/transient-preview"
  );
  expect(preview).toHaveBeenCalledWith("attachment-secret-id");
  expect(preview).toHaveBeenCalledTimes(1);
});

it("shows moderator and administrator actions according to capability", async () => {
  const { rerender } = render(<ModerationQueue canDelete={false} />);
  expect(
    await screen.findByRole("button", { name: "Approve" })
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Delete permanently" })
  ).not.toBeInTheDocument();

  rerender(<ModerationQueue canDelete />);
  expect(
    await screen.findByRole("button", { name: "Delete permanently" })
  ).toBeInTheDocument();
});

it("loads bounded pages once and reports the end without duplicate rows", async () => {
  loadQueue
    .mockResolvedValueOnce(page([item], true, "opaque-next"))
    .mockResolvedValueOnce(page([item], false, null));
  render(<ModerationQueue canDelete={false} />);

  const loadMore = await screen.findByRole("button", {
    name: "Load more submissions",
  });
  fireEvent.click(loadMore);
  fireEvent.click(loadMore);

  expect(
    await screen.findByText("End of moderation queue.")
  ).toBeInTheDocument();
  expect(loadQueue).toHaveBeenNthCalledWith(1, null);
  expect(loadQueue).toHaveBeenNthCalledWith(2, "opaque-next");
  expect(loadQueue).toHaveBeenCalledTimes(2);
  expect(screen.getAllByText("Cedar Garden")).toHaveLength(1);
});

it("confirms approval once with a comment, prevents duplicate actions, and refreshes", async () => {
  let resolveApproval: (
    result: Awaited<ReturnType<typeof approveSubmission>>
  ) => void = () => {};
  approve.mockReturnValueOnce(
    new Promise((resolve) => {
      resolveApproval = resolve;
    })
  );
  loadQueue.mockResolvedValueOnce(page([item])).mockResolvedValueOnce(page([]));
  render(<ModerationQueue canDelete={false} />);

  fireEvent.click(await screen.findByRole("button", { name: "Approve" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm approval" }));
  expect(
    screen.getByText("Enter a review comment before approving.")
  ).toBeInTheDocument();

  fireEvent.change(screen.getByRole("textbox", { name: "Review comment" }), {
    target: { value: "Location and details verified" },
  });
  const confirm = screen.getByRole("button", { name: "Confirm approval" });
  fireEvent.click(confirm);
  fireEvent.click(confirm);
  expect(approve).toHaveBeenCalledTimes(1);
  expect(approve).toHaveBeenCalledWith(
    item.id,
    "Location and details verified",
    expect.any(String)
  );

  await act(() => {
    resolveApproval({ ok: true, submissionId: item.id, replayed: false });
    return Promise.resolve();
  });
  await waitFor(() => expect(loadQueue).toHaveBeenCalledTimes(2));
  expect(await screen.findByText("No pending submissions")).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent(
    "Submission approved and published to the map. The queue has been refreshed."
  );
});

it("requires one administrator confirmation and prevents duplicate deletion", async () => {
  let resolveDeletion: (
    result: Awaited<ReturnType<typeof deleteSubmission>>
  ) => void = () => {};
  remove.mockReturnValueOnce(
    new Promise((resolve) => {
      resolveDeletion = resolve;
    })
  );
  loadQueue.mockResolvedValueOnce(page([item])).mockResolvedValueOnce(page([]));
  render(<ModerationQueue canDelete />);

  fireEvent.click(
    await screen.findByRole("button", { name: "Delete permanently" })
  );
  expect(
    screen.getByRole("heading", { name: "Permanently delete submission?" })
  ).toBeInTheDocument();
  const confirm = screen.getByRole("button", {
    name: "Confirm permanent deletion",
  });
  fireEvent.click(confirm);
  fireEvent.click(confirm);
  expect(remove).toHaveBeenCalledTimes(1);
  expect(remove).toHaveBeenCalledWith(item.id);

  await act(() => {
    resolveDeletion({ ok: true, submissionId: item.id });
    return Promise.resolve();
  });
  await waitFor(() => expect(loadQueue).toHaveBeenCalledTimes(2));
  expect(await screen.findByText("No pending submissions")).toBeInTheDocument();
});

it("shows authorization, queue error, and conflict states explicitly", async () => {
  loadQueue.mockResolvedValueOnce({ ok: false, code: "FORBIDDEN" });
  const { unmount } = render(<ModerationQueue canDelete={false} />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Access denied");
  unmount();

  loadQueue.mockResolvedValueOnce({
    ok: false,
    code: "MODERATION_QUEUE_FAILED",
  });
  const second = render(<ModerationQueue canDelete={false} />);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "could not be loaded"
  );
  second.unmount();

  loadQueue.mockClear();
  loadQueue
    .mockResolvedValueOnce(page([item]))
    .mockResolvedValueOnce(page([item]));
  approve.mockResolvedValueOnce({
    ok: false,
    code: "INVALID_SUBMISSION_STATE",
  });
  render(<ModerationQueue canDelete={false} />);
  fireEvent.click(await screen.findByRole("button", { name: "Approve" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Review comment" }), {
    target: { value: "Reviewed" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Confirm approval" }));
  expect(
    await screen.findByText(/no longer pending.*refreshed/i)
  ).toBeInTheDocument();
  expect(loadQueue).toHaveBeenCalledTimes(2);
});

const otherItem: ModerationQueueItem = {
  ...item,
  id: "submission-2",
  name: "Harbor Deck",
  attachments: [],
};

async function approveFirst(comment = "Verified") {
  const [approveButton] = await screen.findAllByRole("button", {
    name: "Approve",
  });
  fireEvent.click(approveButton);
  fireEvent.change(screen.getByRole("textbox", { name: "Review comment" }), {
    target: { value: comment },
  });
  await act(() => {
    fireEvent.click(screen.getByRole("button", { name: "Confirm approval" }));
    return Promise.resolve();
  });
}

it("keeps the remaining queue usable when the post-approval refresh fails", async () => {
  loadQueue
    .mockResolvedValueOnce(page([item, otherItem]))
    .mockResolvedValueOnce({ ok: false, code: "MODERATION_QUEUE_FAILED" })
    .mockResolvedValueOnce(page([otherItem]));
  render(<ModerationQueue canDelete={false} />);

  await approveFirst();

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "could not be refreshed"
  );
  expect(screen.getByRole("status")).toHaveTextContent(
    /^Submission approved and published to the map\.$/
  );
  expect(screen.queryByText("Cedar Garden")).not.toBeInTheDocument();
  expect(screen.getByText("Harbor Deck")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Approve" })).toBeEnabled();

  await act(() => {
    fireEvent.click(screen.getByRole("button", { name: "Retry refresh" }));
    return Promise.resolve();
  });
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(loadQueue).toHaveBeenCalledTimes(3);
  expect(screen.getByText("Harbor Deck")).toBeInTheDocument();
});

it("keeps state intact after a failed review and allows a retry", async () => {
  loadQueue.mockResolvedValueOnce(page([item])).mockResolvedValueOnce(page([]));
  approve.mockResolvedValueOnce({
    ok: false,
    code: "SUBMISSION_APPROVE_FAILED",
  });
  render(<ModerationQueue canDelete={false} />);

  await approveFirst("Verified on site");

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "No successful change was assumed"
  );
  expect(screen.getByRole("textbox", { name: "Review comment" })).toHaveValue(
    "Verified on site"
  );
  expect(loadQueue).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("status")).not.toBeInTheDocument();

  await act(() => {
    fireEvent.click(screen.getByRole("button", { name: "Confirm approval" }));
    return Promise.resolve();
  });
  expect(screen.getByText("No pending submissions")).toBeInTheDocument();
  expect(approve).toHaveBeenCalledTimes(2);
  expect(approve.mock.calls[0][2]).toBe(approve.mock.calls[1][2]);
});

it("keeps a conflicting submission when the conflict refresh fails", async () => {
  loadQueue
    .mockResolvedValueOnce(page([item]))
    .mockResolvedValueOnce({ ok: false, code: "MODERATION_QUEUE_FAILED" });
  approve.mockResolvedValueOnce({ ok: false, code: "DUPLICATE_SUBMISSION" });
  render(<ModerationQueue canDelete={false} />);

  await approveFirst();

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "could not be refreshed"
  );
  expect(screen.getByRole("status")).toHaveTextContent(
    /^Approval conflicts with an existing nearby place\. The submission was not changed\.$/
  );
  expect(screen.getByText("Cedar Garden")).toBeInTheDocument();
});

it("reports a confirmed deletion even when the refresh needs a new session", async () => {
  loadQueue
    .mockResolvedValueOnce(page([item]))
    .mockResolvedValueOnce({ ok: false, code: "AUTHENTICATION_REQUIRED" });
  render(<ModerationQueue canDelete />);

  fireEvent.click(
    await screen.findByRole("button", { name: "Delete permanently" })
  );
  await act(() => {
    fireEvent.click(
      screen.getByRole("button", { name: "Confirm permanent deletion" })
    );
    return Promise.resolve();
  });

  expect(screen.getByRole("alert")).toHaveTextContent(
    "Your session expired"
  );
  expect(screen.getByRole("status")).toHaveTextContent(
    "Submission permanently deleted."
  );
});
