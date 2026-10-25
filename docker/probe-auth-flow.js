// Drives the production image through a real credentials sign-in, the
// authenticated /requests middleware path, and the loadModerationQueue server
// action against docker/probe-backend.js. Run it from the same image so the
// server action ID is read from the build being tested. Cookie values and
// tokens are never printed.
const fs = require("node:fs");
const path = require("node:path");

const frontend = process.argv[2] ?? "http://frontend:3000";
const backend = process.argv[3] ?? "http://backend:8000";
const cookies = new Map();

function fail(message) {
  console.error(`Authenticated probe failed: ${message}`);
  process.exit(1);
}

function remember(response) {
  for (const header of response.headers.getSetCookie()) {
    const [pair] = header.split(";");
    const separator = pair.indexOf("=");
    cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
  }
}

function cookieHeader() {
  return [...cookies].map(([name, value]) => `${name}=${value}`).join("; ");
}

async function request(pathname, init = {}) {
  const response = await fetch(new URL(pathname, frontend), {
    redirect: "manual",
    ...init,
    headers: { cookie: cookieHeader(), ...init.headers },
  });
  remember(response);
  return response;
}

function moderationQueueActionId() {
  const manifest = JSON.parse(
    fs.readFileSync(
      path.join(process.cwd(), ".next/server/server-reference-manifest.json"),
      "utf8"
    )
  );
  const match = Object.entries(manifest.node).find(
    ([, action]) =>
      action.filename === "app/requests/actions.ts" &&
      action.exportedName === "loadModerationQueue"
  );
  if (!match) fail("loadModerationQueue is missing from the action manifest");
  return match[0];
}

async function main() {
  const csrf = await request("/api/auth/csrf");
  if (csrf.status !== 200) fail(`CSRF endpoint returned ${csrf.status}`);
  const { csrfToken } = await csrf.json();

  const signIn = await request("/api/auth/callback/credentials", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      csrfToken,
      email: "moderator@smokemap.test",
      password: "probe-only-password",
      callbackUrl: "/requests",
      json: "true",
    }),
  });
  if (![...cookies.keys()].some((name) => name.endsWith("session-token"))) {
    fail(`sign-in returned ${signIn.status} without a session cookie`);
  }

  const page = await request("/requests");
  const html = await page.text();
  if (page.status !== 200 || !html.includes("Moderation queue")) {
    fail(`authenticated /requests returned ${page.status}`);
  }

  const action = await request("/requests", {
    method: "POST",
    headers: {
      accept: "text/x-component",
      "content-type": "text/plain;charset=UTF-8",
      "next-action": moderationQueueActionId(),
      origin: new URL(frontend).origin,
    },
    body: "[]",
  });
  const result = (await action.text())
    .split("\n")
    .map((row) => {
      try {
        return JSON.parse(row.slice(row.indexOf(":") + 1));
      } catch {
        return null;
      }
    })
    .find((value) => value && typeof value === "object" && "ok" in value);
  if (
    action.status !== 200 ||
    result?.ok !== true ||
    !Array.isArray(result.page?.items) ||
    result.page.hasNextPage !== false
  ) {
    const code = result?.code ?? "no action result";
    fail(`loadModerationQueue returned ${action.status} with ${code}`);
  }

  const observed = await (await fetch(`${backend}/__probe/observed`)).json();
  const queue = observed.filter((entry) => entry.operation === "moderationQueueV4");
  if (queue.length !== 1 || !queue[0].authorized) {
    fail("backend did not receive one authenticated HTTPS queue query");
  }
  const insecure = observed.filter((entry) => entry.redirectedInsecure);
  if (insecure.length) {
    fail(`backend redirected ${insecure.length} non-HTTPS request(s)`);
  }
  console.log("Authenticated sign-in, /requests, and server action passed");
}

main().catch((error) => fail(error instanceof Error ? error.message : "error"));
