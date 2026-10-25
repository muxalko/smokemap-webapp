/** @jest-environment node */

import edgeLogger, { redact } from "./edge-logger";

afterEach(() => {
  delete process.env.LOG_LEVEL;
  jest.restoreAllMocks();
});

it("redacts credential-bearing fields at any depth", () => {
  expect(
    redact({
      pathname: "/requests",
      headers: { Authorization: "Bearer secret", cookie: "session=secret" },
      nested: [{ refreshToken: "secret", role: "moderator" }],
      nextauthSecret: "secret",
    })
  ).toEqual({
    pathname: "/requests",
    headers: { Authorization: "[Redacted]", cookie: "[Redacted]" },
    nested: [{ refreshToken: "[Redacted]", role: "moderator" }],
    nextauthSecret: "[Redacted]",
  });
});

it("writes structured lines at or above the configured level", () => {
  process.env.LOG_LEVEL = "debug";
  const log = jest.spyOn(console, "log").mockImplementation(() => {});
  const error = jest.spyOn(console, "error").mockImplementation(() => {});

  edgeLogger.trace({ pathname: "/requests" }, "ignored");
  edgeLogger.debug({ pathname: "/requests", token: "secret" }, "routed");
  edgeLogger.error({}, "failed");

  expect(log).toHaveBeenCalledTimes(1);
  expect(JSON.parse(log.mock.calls[0][0] as string)).toMatchObject({
    severity: "DEBUG",
    msg: "routed",
    pathname: "/requests",
    token: "[Redacted]",
  });
  expect(error).toHaveBeenCalledTimes(1);
});

it("defaults to info when the configured level is unknown", () => {
  process.env.LOG_LEVEL = "verbose";
  const log = jest.spyOn(console, "log").mockImplementation(() => {});

  edgeLogger.debug({}, "hidden");
  edgeLogger.info({}, "shown");

  expect(log).toHaveBeenCalledTimes(1);
});
