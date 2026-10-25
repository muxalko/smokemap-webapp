// Minimal backend double for the production-image probe. Like Django with
// SECURE_SSL_REDIRECT and a trusted X-Forwarded-Proto header, it redirects any
// request that the frontend hop did not mark as HTTPS. It issues only
// test-only credentials and never logs request headers or bodies.
const http = require("node:http");

const PROBE_EMAIL = "moderator@smokemap.test";
const PROBE_PASSWORD = "probe-only-password";
const PROBE_ACCESS = "probe-only-access-token";
const observed = [];

function json(response, status, body) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

function graphql(request, response, body) {
  let operation;
  try {
    operation = JSON.parse(body);
  } catch {
    return json(response, 400, { errors: [{ message: "Invalid JSON" }] });
  }
  const query = String(operation.query ?? "");
  const authorized =
    request.headers.authorization === `Bearer ${PROBE_ACCESS}`;
  const name = query.includes("tokenAuth")
    ? "tokenAuth"
    : query.includes("moderationQueueV4")
      ? "moderationQueueV4"
      : "unsupported";
  observed.push({ operation: name, authorized });

  if (name === "tokenAuth") {
    const { email, password } = operation.variables ?? {};
    if (email !== PROBE_EMAIL || password !== PROBE_PASSWORD) {
      return json(response, 200, {
        errors: [{ extensions: { code: "INVALID_CREDENTIALS" } }],
      });
    }
    const now = Math.floor(Date.now() / 1000);
    return json(response, 200, {
      data: {
        tokenAuth: {
          payload: { exp: now + 3600, sub: "probe-moderator" },
          token: PROBE_ACCESS,
          refreshExpiresIn: now + 86400,
          refreshToken: "probe-only-refresh-token",
          user: {
            name: "Probe moderator",
            email: PROBE_EMAIL,
            role: "moderator",
            image: null,
          },
        },
      },
    });
  }
  if (name === "moderationQueueV4" && authorized) {
    return json(response, 200, {
      data: {
        moderationQueueV4: {
          __typename: "ModerationQueuePage",
          items: [],
          hasNextPage: false,
          nextCursor: null,
        },
      },
    });
  }
  return json(response, 200, {
    errors: [{ extensions: { code: "FORBIDDEN" } }],
  });
}

http
  .createServer((request, response) => {
    if (request.url === "/__probe/observed") {
      return json(response, 200, observed);
    }
    const proto = request.headers["x-forwarded-proto"];
    if (proto !== "https") {
      observed.push({ path: request.url, redirectedInsecure: true });
      response.writeHead(301, {
        location: `https://${request.headers.host}${request.url}`,
      });
      return response.end();
    }
    if (request.url === "/graphql/" && request.method === "POST") {
      let body = "";
      request.setEncoding("utf8");
      request.on("data", (chunk) => (body += chunk));
      request.on("end", () => graphql(request, response, body));
      return undefined;
    }
    return json(response, 200, { path: request.url, proto });
  })
  .listen(8000, "0.0.0.0");
