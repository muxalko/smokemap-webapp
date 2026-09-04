import { validateMediaFiles } from "./media-schema";

function file(type: string, size: number, name = "photo") {
  return new File([new Uint8Array(size)], name, { type });
}

it("accepts zero images", () => {
  expect(validateMediaFiles([])).toBeNull();
});

it("accepts up to three valid images", () => {
  const files = [
    file("image/jpeg", 10),
    file("image/png", 20),
    file("image/webp", 30),
  ];
  expect(validateMediaFiles(files)).toBeNull();
});

it("rejects more than three images", () => {
  const files = [
    file("image/jpeg", 10),
    file("image/jpeg", 10),
    file("image/jpeg", 10),
    file("image/jpeg", 10),
  ];
  expect(validateMediaFiles(files)).toEqual({
    code: "TOO_MANY_MEDIA_FILES",
    field: "images",
  });
});

it.each(["image/gif", "application/pdf", ""])(
  "rejects an unsupported mime type %s",
  (type) => {
    expect(validateMediaFiles([file(type, 10)])).toEqual({
      code: "UNSUPPORTED_MEDIA_TYPE",
      field: "images.0",
    });
  }
);

it("rejects a file over 5,000,000 bytes", () => {
  expect(validateMediaFiles([file("image/png", 5_000_001)])).toEqual({
    code: "MEDIA_TOO_LARGE",
    field: "images.0",
  });
});

it("accepts a file at exactly the 5,000,000 byte limit", () => {
  expect(validateMediaFiles([file("image/png", 5_000_000)])).toBeNull();
});

it("rejects an empty file", () => {
  expect(validateMediaFiles([file("image/png", 0)])).toEqual({
    code: "MEDIA_TOO_LARGE",
    field: "images.0",
  });
});

it("reports the index of the first invalid file", () => {
  expect(
    validateMediaFiles([file("image/png", 10), file("image/gif", 10)])
  ).toEqual({ code: "UNSUPPORTED_MEDIA_TYPE", field: "images.1" });
});
