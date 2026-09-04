import { act, fireEvent, render, screen, waitFor } from "@/test/render";

import {
  createSubmissionV3,
  finalizeSubmissionV3,
  loadSubmissionMediaStateV3,
} from "@/app/submissions/actions";
import {
  createMediaSlotOperations,
  runMediaSlot,
} from "@/app/submissions/media-pipeline";
import { SubmissionProvider } from "@/app/submissions/submission-provider";
import type { CategoryType } from "@/graphql/__generated__/types";
import RequestReactForm from "./request-react-form";

jest.mock("@/app/submissions/actions", () => ({
  createSubmissionV3: jest.fn(),
  editSubmissionV3: jest.fn(),
  finalizeSubmissionV3: jest.fn(),
  loadSubmissionMediaStateV3: jest.fn(),
  reorderSubmissionMediaV3: jest.fn(),
}));

jest.mock("@/app/submissions/media-actions", () => ({
  expireMediaUploadIntent: jest.fn(),
  mediaAttachmentPreviewV3: jest.fn(),
  removeAttachedMedia: jest.fn(),
}));

jest.mock("@/app/submissions/media-pipeline", () => ({
  createMediaSlotOperation: jest.fn(),
  createMediaSlotOperations: jest.fn(() => []),
  createResumedMediaSlotOperation: jest.fn(),
  runMediaSlot: jest.fn(),
}));

// Radix's Popover (via cmdk's Command) reads element size and scroll
// behavior that jsdom does not implement; without these the category
// combobox never opens in tests.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
beforeAll(() => {
  (global as unknown as { ResizeObserver: unknown }).ResizeObserver =
    ResizeObserverStub;
  Element.prototype.scrollIntoView = jest.fn();
});

const categories: CategoryType[] = [
  { id: "1", name: "Outdoors", slug: "outdoors" },
  { id: "2", name: "Indoors", slug: "indoors" },
];

const createAction = createSubmissionV3 as jest.MockedFunction<
  typeof createSubmissionV3
>;
const finalizeAction = finalizeSubmissionV3 as jest.MockedFunction<
  typeof finalizeSubmissionV3
>;
const loadResumeState = loadSubmissionMediaStateV3 as jest.MockedFunction<
  typeof loadSubmissionMediaStateV3
>;
const createMediaOps = createMediaSlotOperations as jest.MockedFunction<
  typeof createMediaSlotOperations
>;
const runMedia = runMediaSlot as jest.MockedFunction<typeof runMediaSlot>;

function renderForm() {
  return render(
    <SubmissionProvider>
      <RequestReactForm
        authenticated
        categories={categories}
        enableTracking={() => {}}
        crosshairPosition={[1, 2]}
      />
    </SubmissionProvider>
  );
}

async function selectCategory(name: string) {
  fireEvent.click(screen.getByRole("combobox"));
  fireEvent.click(await screen.findByText(name));
}

// Mirrors the order a real user fills the dialog in: name, then category,
// then the location round trip (which closes and reopens the dialog before
// the final submit) - the sequence that originally let a stale category
// linger past a reset.
async function fillSubmissionForm(name: string, categoryName: string) {
  fireEvent.click(screen.getByRole("button", { name: "+" }));
  fireEvent.change(screen.getByPlaceholderText("Place name"), {
    target: { value: name },
  });
  await selectCategory(categoryName);
  fireEvent.click(screen.getByText("Choose location on map"));
  fireEvent.click(
    screen.getByRole("button", { name: "Confirm submission location" })
  );
  fireEvent.click(screen.getByRole("checkbox"));
}

function submitButton() {
  return screen.getByRole("button", { name: "Submit for review" });
}

beforeEach(() => {
  window.localStorage.clear();
  jest.clearAllMocks();
  loadResumeState.mockResolvedValue({ ok: false, code: "NOT_FOUND" });
  createMediaOps.mockReturnValue([]);
});

test("clears the selected category after a zero-image submission and requires a fresh pick before resubmitting", async () => {
  createAction
    .mockResolvedValueOnce({ ok: true, submission: { id: "s1" } } as never)
    .mockResolvedValueOnce({ ok: true, submission: { id: "s2" } } as never);
  finalizeAction
    .mockResolvedValueOnce({ ok: true, submission: { id: "s1" } } as never)
    .mockResolvedValueOnce({ ok: true, submission: { id: "s2" } } as never);

  renderForm();

  await fillSubmissionForm("First Place", "Outdoors");
  await waitFor(() => expect(submitButton()).not.toBeDisabled());

  fireEvent.click(submitButton());
  await waitFor(() =>
    expect(
      screen.queryByRole("dialog", { name: "Submit a place" })
    ).not.toBeInTheDocument()
  );
  expect(createAction).toHaveBeenCalledTimes(1);
  expect(createAction.mock.calls[0][0]).toMatchObject({
    categorySlug: "outdoors",
  });

  // Reopening for a second submission must not inherit the prior category:
  // the combobox shows the placeholder again and submit stays disabled...
  fireEvent.click(screen.getByRole("button", { name: "+" }));
  expect(screen.getByRole("combobox")).toHaveTextContent("Select category");
  fireEvent.change(screen.getByPlaceholderText("Place name"), {
    target: { value: "Second Place" },
  });
  fireEvent.click(screen.getByText("Choose location on map"));
  fireEvent.click(
    screen.getByRole("button", { name: "Confirm submission location" })
  );
  fireEvent.click(screen.getByRole("checkbox"));
  expect(submitButton()).toBeDisabled();

  // ...until the user picks a category again, which then submits correctly.
  await selectCategory("Indoors");
  await waitFor(() => expect(submitButton()).not.toBeDisabled());

  fireEvent.click(submitButton());
  await waitFor(() => expect(createAction).toHaveBeenCalledTimes(2));
  expect(createAction.mock.calls[1][0]).toMatchObject({
    name: "Second Place",
    categorySlug: "indoors",
  });
});

test("clears the selected category after a submission with attached media", async () => {
  createAction.mockResolvedValue({
    ok: true,
    submission: { id: "s1" },
  } as never);
  finalizeAction.mockResolvedValue({
    ok: true,
    submission: { id: "s1" },
  } as never);
  createMediaOps.mockReturnValue([
    {
      file: new File(["content"], "photo.png", { type: "image/png" }),
      slot: 0,
      mimeType: "image/png",
      createIntentKey: "create-0",
      issueKey: "issue-0",
      verifyKey: "verify-0",
      attachKey: "attach-0",
    },
  ]);
  runMedia.mockResolvedValue({ ok: true });

  renderForm();

  await fillSubmissionForm("Place With Photo", "Outdoors");
  await waitFor(() => expect(submitButton()).not.toBeDisabled());

  await act(async () => {
    fireEvent.click(submitButton());
    await Promise.resolve();
  });
  await waitFor(() =>
    expect(
      screen.queryByRole("dialog", { name: "Submit a place" })
    ).not.toBeInTheDocument()
  );

  fireEvent.click(screen.getByRole("button", { name: "+" }));
  expect(screen.getByRole("combobox")).toHaveTextContent("Select category");
  expect(submitButton()).toBeDisabled();
});
