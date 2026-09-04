import { sha256Hex } from "./media-crypto";

// jsdom does not implement Blob/File#arrayBuffer; polyfill it via FileReader
// so this suite can exercise the real production code path.
beforeAll(() => {
  if (!File.prototype.arrayBuffer) {
    File.prototype.arrayBuffer = function arrayBuffer(this: File) {
      return new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(this);
      });
    };
  }
});

const originalCrypto = globalThis.crypto;

afterEach(() => {
  Object.defineProperty(globalThis, "crypto", {
    value: originalCrypto,
    configurable: true,
  });
});

function stubDigest(hexByte: number) {
  const digest = jest.fn().mockResolvedValue(new Uint8Array([hexByte]).buffer);
  Object.defineProperty(globalThis, "crypto", {
    value: { subtle: { digest } },
    configurable: true,
  });
  return digest;
}

it("hashes the exact bytes of the file as lowercase hex", async () => {
  const digest = stubDigest(0x0a);
  const file = new File(["hello"], "photo.png", { type: "image/png" });

  const hex = await sha256Hex(file);

  expect(hex).toBe("0a");
  expect(digest).toHaveBeenCalledWith("SHA-256", expect.any(ArrayBuffer));
});

it("pads single hex digits", async () => {
  stubDigest(0x00);
  const file = new File(["x"], "photo.png", { type: "image/png" });
  await expect(sha256Hex(file)).resolves.toBe("00");
});
