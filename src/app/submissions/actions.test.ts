jest.mock("server-only", () => ({}), { virtual: true });
jest.mock("@/lib/auth/get-backend-auth", () => ({ getBackendAuth: jest.fn() }));
jest.mock("@/lib/client", () => ({ getClient: jest.fn() }));

import { getBackendAuth } from "@/lib/auth/get-backend-auth";
import { getClient } from "@/lib/client";
import {
  createSubmissionV3,
  editSubmissionV3,
  finalizeSubmissionV3,
  loadSubmissionMediaStateV3,
  reorderSubmissionMediaV3,
} from "./actions";

const auth = getBackendAuth as jest.MockedFunction<typeof getBackendAuth>;
const mutate = jest.fn();
const query = jest.fn();
const input = {
  name: "Zero image place",
  categorySlug: "outdoors" as const,
  longitude: -77.0365,
  latitude: 38.8977,
  addressLabel: "Human label",
  tags: [],
  description: "",
  website: "",
};

beforeEach(() => {
  jest.clearAllMocks();
  (getClient as jest.Mock).mockReturnValue({ mutate, query });
  auth.mockResolvedValue({ role: "user", backendAccess: "access" });
});

it("validates create input before reading auth or mutating", async () => {
  await expect(
    createSubmissionV3({ ...input, latitude: 91 }, "create-key")
  ).resolves.toEqual({
    ok: false,
    code: "INVALID_SUBMISSION",
    field: "latitude",
  });
  expect(auth).not.toHaveBeenCalled();
  expect(mutate).not.toHaveBeenCalled();
});

it("requires backend authentication before create", async () => {
  auth.mockResolvedValue(null);
  await expect(createSubmissionV3(input, "create-key")).resolves.toEqual({
    ok: false,
    code: "AUTHENTICATION_REQUIRED",
  });
  expect(mutate).not.toHaveBeenCalled();
});

it("sends create and finalize with the private bearer credential", async () => {
  mutate
    .mockResolvedValueOnce({
      data: {
        createSubmissionV3: { submission: { id: "42", state: "draft" } },
      },
    })
    .mockResolvedValueOnce({
      data: {
        finalizeSubmissionV3: {
          submission: { id: "42", state: "pending" },
        },
      },
    });

  await expect(createSubmissionV3(input, "create-key")).resolves.toEqual({
    ok: true,
    submission: { id: "42", state: "draft" },
  });
  await expect(finalizeSubmissionV3("42", "finalize-key")).resolves.toEqual({
    ok: true,
    submission: { id: "42", state: "pending" },
  });

  expect(mutate).toHaveBeenNthCalledWith(
    1,
    expect.objectContaining({
      variables: {
        input,
        idempotencyKey: "create-key",
      },
      context: { headers: { Authorization: "Bearer access" } },
    })
  );
  expect(mutate).toHaveBeenNthCalledWith(
    2,
    expect.objectContaining({
      variables: { submissionId: "42", idempotencyKey: "finalize-key" },
      context: { headers: { Authorization: "Bearer access" } },
    })
  );
});

describe("editSubmissionV3", () => {
  it("validates input before reading auth or mutating", async () => {
    await expect(
      editSubmissionV3("42", { ...input, latitude: 91 }, "edit-key")
    ).resolves.toEqual({
      ok: false,
      code: "INVALID_SUBMISSION",
      field: "latitude",
    });
    expect(auth).not.toHaveBeenCalled();
    expect(mutate).not.toHaveBeenCalled();
  });

  it("requires backend authentication", async () => {
    auth.mockResolvedValue(null);
    await expect(editSubmissionV3("42", input, "edit-key")).resolves.toEqual({
      ok: false,
      code: "AUTHENTICATION_REQUIRED",
    });
    expect(mutate).not.toHaveBeenCalled();
  });

  it("replaces the draft's content and returns the updated snapshot", async () => {
    mutate.mockResolvedValue({
      data: {
        editSubmissionV3: {
          submission: {
            id: "42",
            state: "draft",
            name: input.name,
            categorySlug: input.categorySlug,
            longitude: input.longitude,
            latitude: input.latitude,
            addressLabel: input.addressLabel,
            tags: [],
            description: null,
            website: null,
          },
          replayed: false,
        },
      },
    });

    await expect(editSubmissionV3("42", input, "edit-key")).resolves.toEqual({
      ok: true,
      replayed: false,
      submission: {
        id: "42",
        state: "draft",
        name: input.name,
        categorySlug: input.categorySlug,
        longitude: input.longitude,
        latitude: input.latitude,
        addressLabel: input.addressLabel,
        tags: [],
        description: null,
        website: null,
      },
    });
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: { submissionId: "42", input, idempotencyKey: "edit-key" },
        context: { headers: { Authorization: "Bearer access" } },
      })
    );
  });

  it("maps a duplicate-on-edit conflict to its code", async () => {
    mutate.mockRejectedValue({
      graphQLErrors: [{ extensions: { code: "DUPLICATE_SUBMISSION" } }],
    });
    await expect(editSubmissionV3("42", input, "edit-key")).resolves.toEqual({
      ok: false,
      code: "DUPLICATE_SUBMISSION",
    });
  });
});

describe("loadSubmissionMediaStateV3", () => {
  it("rejects a missing submission id before reading auth", async () => {
    await expect(loadSubmissionMediaStateV3("")).resolves.toEqual({
      ok: false,
      code: "INVALID_SUBMISSION_ID",
    });
    expect(auth).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });

  it("requires backend authentication", async () => {
    auth.mockResolvedValue(null);
    await expect(loadSubmissionMediaStateV3("42")).resolves.toEqual({
      ok: false,
      code: "AUTHENTICATION_REQUIRED",
    });
    expect(query).not.toHaveBeenCalled();
  });

  it("returns the owner-safe resume state with the bearer credential", async () => {
    const state = {
      submission: {
        id: "42",
        state: "draft" as const,
        name: input.name,
        categorySlug: input.categorySlug,
        longitude: input.longitude,
        latitude: input.latitude,
        addressLabel: input.addressLabel,
        tags: [],
        description: null,
        website: null,
      },
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
          id: "intent-1",
          submissionId: "42",
          state: "issued",
          slot: 1,
          failureCode: "",
        },
      ],
    };
    query.mockResolvedValue({ data: { submissionMediaStateV3: state } });

    await expect(loadSubmissionMediaStateV3("42")).resolves.toEqual({
      ok: true,
      state,
    });
    expect(query).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: { submissionId: "42" },
        context: { headers: { Authorization: "Bearer access" } },
      })
    );
  });

  it("maps a missing or foreign submission to NOT_FOUND", async () => {
    query.mockRejectedValue({
      graphQLErrors: [{ extensions: { code: "NOT_FOUND" } }],
    });
    await expect(loadSubmissionMediaStateV3("42")).resolves.toEqual({
      ok: false,
      code: "NOT_FOUND",
    });
  });

  it("falls back to NOT_FOUND when the response carries no submission", async () => {
    query.mockResolvedValue({ data: {} });
    await expect(loadSubmissionMediaStateV3("42")).resolves.toEqual({
      ok: false,
      code: "NOT_FOUND",
    });
  });
});

describe("reorderSubmissionMediaV3", () => {
  it("rejects an empty attachment id list before reading auth", async () => {
    await expect(
      reorderSubmissionMediaV3("42", [], "reorder-key")
    ).resolves.toEqual({
      ok: false,
      code: "INVALID_SUBMISSION",
      field: "attachmentIds",
    });
    expect(auth).not.toHaveBeenCalled();
    expect(mutate).not.toHaveBeenCalled();
  });

  it("requires backend authentication", async () => {
    auth.mockResolvedValue(null);
    await expect(
      reorderSubmissionMediaV3("42", ["att-0"], "reorder-key")
    ).resolves.toEqual({ ok: false, code: "AUTHENTICATION_REQUIRED" });
    expect(mutate).not.toHaveBeenCalled();
  });

  it("returns the applied permutation with the bearer credential", async () => {
    mutate.mockResolvedValue({
      data: {
        reorderSubmissionMediaV3: {
          orderedAttachmentIds: ["att-1", "att-0"],
          replayed: false,
        },
      },
    });

    await expect(
      reorderSubmissionMediaV3("42", ["att-1", "att-0"], "reorder-key")
    ).resolves.toEqual({
      ok: true,
      replayed: false,
      orderedAttachmentIds: ["att-1", "att-0"],
    });
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: {
          submissionId: "42",
          attachmentIds: ["att-1", "att-0"],
          idempotencyKey: "reorder-key",
        },
        context: { headers: { Authorization: "Bearer access" } },
      })
    );
  });

  it("maps a partial or foreign attachment set to its code", async () => {
    mutate.mockRejectedValue({
      graphQLErrors: [{ extensions: { code: "INVALID_SUBMISSION", field: "attachment_ids" } }],
    });
    await expect(
      reorderSubmissionMediaV3("42", ["att-0"], "reorder-key")
    ).resolves.toEqual({
      ok: false,
      code: "INVALID_SUBMISSION",
      field: "attachment_ids",
    });
  });
});
