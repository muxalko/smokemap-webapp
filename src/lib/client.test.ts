/** @jest-environment node */

jest.mock("server-only", () => ({}), { virtual: true });
// React's server `cache` only exists in the react-server build; the real
// Apollo link chain built by getClient is what this test exercises.
jest.mock("react", () => ({
  ...jest.requireActual<object>("react"),
  cache: (factory: unknown) => factory,
}));
jest.mock("@/lib/auth/get-backend-auth", () => ({
  getBackendAccessToken: jest.fn(),
}));

import { gql } from "@apollo/client";

import { getBackendAccessToken } from "@/lib/auth/get-backend-auth";
import { getClient } from "./client";

const accessToken = getBackendAccessToken as jest.MockedFunction<
  typeof getBackendAccessToken
>;
const environment = process.env as Record<string, string | undefined>;
const originalNodeEnv = environment.NODE_ENV;
const originalFetch = global.fetch;
const QUERY = gql`
  query Probe {
    __typename
  }
`;

async function outgoingHeaders(
  context?: Record<string, unknown>
): Promise<Record<string, string>> {
  const fetchMock = jest.fn(() =>
    Promise.resolve(
      new Response(JSON.stringify({ data: { __typename: "Query" } }), {
        headers: { "content-type": "application/json" },
      })
    )
  );
  global.fetch = fetchMock as unknown as typeof fetch;

  await getClient().query({ query: QUERY, fetchPolicy: "no-cache", context });

  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [uri, init] = fetchMock.mock.calls[0] as unknown as [
    string,
    RequestInit,
  ];
  expect(uri).toBe("http://backend:8000/graphql/");
  return init.headers as Record<string, string>;
}

beforeEach(() => {
  environment.GRAPHQL_INTERNAL_ENDPOINT = "http://backend:8000/graphql/";
  accessToken.mockResolvedValue(null);
});

afterEach(() => {
  environment.NODE_ENV = originalNodeEnv;
  delete environment.GRAPHQL_INTERNAL_ENDPOINT;
  global.fetch = originalFetch;
  jest.clearAllMocks();
});

it("marks production server GraphQL requests as HTTPS for the backend", async () => {
  environment.NODE_ENV = "production";

  const headers = await outgoingHeaders();

  expect(headers["x-forwarded-proto"]).toBe("https");
  expect(headers.authorization).toBeUndefined();
});

it("keeps the forwarding header beside an explicit action bearer token", async () => {
  environment.NODE_ENV = "production";

  const headers = await outgoingHeaders({
    headers: { Authorization: "Bearer action-token" },
  });

  expect(headers).toMatchObject({
    authorization: "Bearer action-token",
    "x-forwarded-proto": "https",
  });
  expect(accessToken).not.toHaveBeenCalled();
});

it("keeps the forwarding header beside the session bearer token", async () => {
  environment.NODE_ENV = "production";
  accessToken.mockResolvedValue("session-token");

  const headers = await outgoingHeaders();

  expect(headers).toMatchObject({
    authorization: "Bearer session-token",
    "x-forwarded-proto": "https",
  });
});

it.each(["development", "test"])(
  "does not claim HTTPS outside production (%s)",
  async (nodeEnv) => {
    environment.NODE_ENV = nodeEnv;

    const headers = await outgoingHeaders();

    expect(headers["x-forwarded-proto"]).toBeUndefined();
  }
);
