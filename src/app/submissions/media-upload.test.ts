import { installFetchMock, jsonResponse } from "@/test/network";
import { postDirectUpload } from "./media-upload";

it("posts a fresh multipart form with the storage fields and the file appended last", async () => {
  const fetchMock = installFetchMock();
  fetchMock.mockResolvedValue(jsonResponse({}, 204));
  const file = new File(["content"], "photo.png", { type: "image/png" });

  const ok = await postDirectUpload(
    "https://storage.invalid/upload",
    { key: "submission-media/42/abc", policy: "p", signature: "s" },
    file
  );

  expect(ok).toBe(true);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe("https://storage.invalid/upload");
  expect(init?.method).toBe("POST");
  const body = init?.body as FormData;
  expect(body).toBeInstanceOf(FormData);
  const keys = Array.from(body.keys());
  expect(keys).toEqual(["key", "policy", "signature", "file"]);
  expect(body.get("key")).toBe("submission-media/42/abc");
  expect(body.get("file")).toBe(file);
});

it("builds a new FormData on every call instead of reusing one", async () => {
  const fetchMock = installFetchMock();
  fetchMock.mockResolvedValue(jsonResponse({}, 204));
  const file = new File(["content"], "photo.png", { type: "image/png" });
  const fields = { key: "k" };

  await postDirectUpload("https://storage.invalid/upload", fields, file);
  await postDirectUpload("https://storage.invalid/upload", fields, file);

  const [firstBody] = fetchMock.mock.calls[0].slice(1) as [RequestInit];
  const [secondBody] = fetchMock.mock.calls[1].slice(1) as [RequestInit];
  expect(firstBody.body).not.toBe(secondBody.body);
});

it("returns false when the storage response is not ok", async () => {
  const fetchMock = installFetchMock();
  fetchMock.mockResolvedValue(jsonResponse({}, 403));
  const file = new File(["content"], "photo.png", { type: "image/png" });

  await expect(
    postDirectUpload("https://storage.invalid/upload", { key: "k" }, file)
  ).resolves.toBe(false);
});

it("returns false when the network request throws", async () => {
  const fetchMock = installFetchMock();
  fetchMock.mockRejectedValue(new Error("network down"));
  const file = new File(["content"], "photo.png", { type: "image/png" });

  await expect(
    postDirectUpload("https://storage.invalid/upload", { key: "k" }, file)
  ).resolves.toBe(false);
});
