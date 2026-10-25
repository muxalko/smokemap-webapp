/** @jest-environment node */

const {
  validateBackendConnectivity,
  validateBuildEnvironment,
  validateRuntimeEnvironment,
} = require("./production-config");

const REVISION = "0123456789abcdef0123456789abcdef01234567";

function buildEnvironment(overrides = {}) {
  return {
    VCS_REF: REVISION,
    NEXT_PUBLIC_ENVIRONMENT: "staging",
    NEXT_PUBLIC_VERSION: REVISION,
    NEXT_PUBLIC_BASE_URL: "https://staging.smokemap.test",
    NEXT_PUBLIC_BACKEND: "/api/smokemap",
    NEXT_PUBLIC_GRAPHQL_ENDPOINT: "/api/smokemap/graphql",
    NEXT_PUBLIC_FEATURESERV_ENDPOINT: "/api/smokemap/locations",
    NEXT_PUBLIC_MAP_STYLE: "https://tiles.openfreemap.org/styles/liberty",
    NEXT_PUBLIC_LOG_LEVEL: "info",
    ...overrides,
  };
}

function runtimeEnvironment(overrides = {}) {
  return {
    ...buildEnvironment(),
    NODE_ENV: "production",
    NEXTAUTH_URL: "https://staging.smokemap.test",
    NEXTAUTH_SECRET: "test-only-nextauth-secret-32-chars",
    BACKEND_INTERNAL_URL: "http://backend:8000",
    GRAPHQL_INTERNAL_ENDPOINT: "http://backend:8000/graphql/",
    ...overrides,
  };
}

it("accepts and records only the required public staging build inputs", () => {
  expect(validateBuildEnvironment(buildEnvironment())).toEqual({
    schemaVersion: 1,
    sourceRevision: REVISION,
    public: expect.objectContaining({
      NEXT_PUBLIC_ENVIRONMENT: "staging",
      NEXT_PUBLIC_GRAPHQL_ENDPOINT: "/api/smokemap/graphql",
    }),
  });
});

it("requires immutable source provenance and exact same-origin routes", () => {
  expect(() =>
    validateBuildEnvironment(buildEnvironment({ VCS_REF: "0123456" }))
  ).toThrow("Invalid VCS_REF");
  expect(() =>
    validateBuildEnvironment(
      buildEnvironment({
        NEXT_PUBLIC_GRAPHQL_ENDPOINT: "https://backend.test/graphql/",
      })
    )
  ).toThrow("Invalid NEXT_PUBLIC_GRAPHQL_ENDPOINT");
});

it("rejects public secret variables without echoing their values", () => {
  const secret = "must-never-appear-in-an-error";
  let error;
  try {
    validateBuildEnvironment(
      buildEnvironment({ NEXT_PUBLIC_API_TOKEN: secret })
    );
  } catch (caught) {
    error = caught;
  }
  expect(error).toBeInstanceOf(Error);
  expect(error.message).toContain("Invalid NEXT_PUBLIC_API_TOKEN");
  expect(error.message).not.toContain(secret);
});

it("rejects non-public or credential-bearing staging URLs", () => {
  expect(() =>
    validateBuildEnvironment(
      buildEnvironment({ NEXT_PUBLIC_BASE_URL: "http://localhost:3000" })
    )
  ).toThrow("Invalid NEXT_PUBLIC_BASE_URL");
  expect(() =>
    validateBuildEnvironment(
      buildEnvironment({
        NEXT_PUBLIC_MAP_STYLE: "https://token@tiles.example.test/style",
      })
    )
  ).toThrow("Invalid NEXT_PUBLIC_MAP_STYLE");
});

it("accepts the root staging Compose backend service contract", () => {
  const manifest = validateBuildEnvironment(buildEnvironment());
  expect(validateRuntimeEnvironment(runtimeEnvironment(), manifest)).toEqual({
    backendOrigin: "http://backend:8000",
    graphqlEndpoint: "http://backend:8000/graphql/",
  });
});

it("fails startup when public runtime inputs do not match the image", () => {
  const manifest = validateBuildEnvironment(buildEnvironment());
  expect(() =>
    validateRuntimeEnvironment(
      runtimeEnvironment({ NEXT_PUBLIC_LOG_LEVEL: "debug" }),
      manifest
    )
  ).toThrow("Invalid NEXT_PUBLIC_LOG_LEVEL");
});

it("requires GraphQL to use the validated internal backend origin", () => {
  expect(() =>
    validateBackendConnectivity(
      runtimeEnvironment({
        GRAPHQL_INTERNAL_ENDPOINT: "http://other-backend:8000/graphql/",
      })
    )
  ).toThrow("Invalid GRAPHQL_INTERNAL_ENDPOINT");
  expect(() =>
    validateBackendConnectivity(
      runtimeEnvironment({ BACKEND_INTERNAL_URL: "http://localhost:8000" })
    )
  ).toThrow("Invalid BACKEND_INTERNAL_URL");
});
