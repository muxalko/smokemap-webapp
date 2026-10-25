const fs = require("node:fs");
const net = require("node:net");

const PUBLIC_BUILD_VARIABLES = [
  "NEXT_PUBLIC_ENVIRONMENT",
  "NEXT_PUBLIC_VERSION",
  "NEXT_PUBLIC_BASE_URL",
  "NEXT_PUBLIC_BACKEND",
  "NEXT_PUBLIC_GRAPHQL_ENDPOINT",
  "NEXT_PUBLIC_FEATURESERV_ENDPOINT",
  "NEXT_PUBLIC_MAP_STYLE",
  "NEXT_PUBLIC_LOG_LEVEL",
];

const SECRET_LIKE_PUBLIC_NAME =
  /(?:SECRET|TOKEN|PASSWORD|PRIVATE|CREDENTIAL|API_KEY|ACCESS_KEY)/i;

function invalid(name, reason) {
  return new Error(`Invalid ${name}: ${reason}`);
}

function required(environment, name) {
  const value = environment[name];
  if (typeof value !== "string" || value.length === 0) {
    throw invalid(name, "a non-empty value is required");
  }
  if (value !== value.trim()) {
    throw invalid(name, "leading or trailing whitespace is not allowed");
  }
  return value;
}

function normalizedHostname(hostname) {
  return hostname.toLowerCase().replace(/^\[|\]$/g, "");
}

function isForbiddenHost(hostname) {
  const host = normalizedHostname(hostname);
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "0.0.0.0" ||
    host === "::" ||
    host === "::1" ||
    host.startsWith("127.") ||
    host.startsWith("169.254.") ||
    host.startsWith("fe80:")
  ) {
    return true;
  }
  return false;
}

function isPrivateIpv4(hostname) {
  if (net.isIP(hostname) !== 4) return false;
  const [first, second] = hostname.split(".").map(Number);
  return (
    first === 10 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

function parsedUrl(name, value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw invalid(name, "a valid URL is required");
  }
  if (parsed.username || parsed.password) {
    throw invalid(name, "URL credentials are not allowed");
  }
  if (isForbiddenHost(parsed.hostname)) {
    throw invalid(name, "loopback, wildcard, and link-local hosts are not allowed");
  }
  return parsed;
}

function publicHttpsUrl(name, value, originOnly) {
  const parsed = parsedUrl(name, value);
  if (parsed.protocol !== "https:") {
    throw invalid(name, "HTTPS is required");
  }
  const hostname = normalizedHostname(parsed.hostname);
  if (net.isIP(hostname) === 0) {
    if (!parsed.hostname.includes(".") || parsed.hostname.endsWith(".local")) {
      throw invalid(name, "a public hostname is required");
    }
  } else if (isPrivateIpv4(hostname)) {
    throw invalid(name, "a public hostname is required");
  }
  if (parsed.hash || parsed.search) {
    throw invalid(name, "query strings and fragments are not allowed");
  }
  if (originOnly && parsed.pathname !== "/") {
    throw invalid(name, "the URL must contain only an origin");
  }
  return parsed;
}

function validateNoPublicSecrets(environment) {
  for (const name of Object.keys(environment)) {
    if (name.startsWith("NEXT_PUBLIC_") && SECRET_LIKE_PUBLIC_NAME.test(name)) {
      throw invalid(name, "secret-bearing public variables are forbidden");
    }
  }
}

function validateBuildEnvironment(environment) {
  validateNoPublicSecrets(environment);

  const sourceRevision = required(environment, "VCS_REF");
  if (!/^[0-9a-f]{40}$/.test(sourceRevision)) {
    throw invalid("VCS_REF", "the full lowercase 40-hex source SHA is required");
  }

  const publicValues = Object.fromEntries(
    PUBLIC_BUILD_VARIABLES.map((name) => [name, required(environment, name)])
  );

  if (publicValues.NEXT_PUBLIC_ENVIRONMENT !== "staging") {
    throw invalid("NEXT_PUBLIC_ENVIRONMENT", "the value must be staging");
  }
  if (publicValues.NEXT_PUBLIC_VERSION !== sourceRevision) {
    throw invalid("NEXT_PUBLIC_VERSION", "the value must equal VCS_REF");
  }
  publicHttpsUrl(
    "NEXT_PUBLIC_BASE_URL",
    publicValues.NEXT_PUBLIC_BASE_URL,
    true
  );
  publicHttpsUrl(
    "NEXT_PUBLIC_MAP_STYLE",
    publicValues.NEXT_PUBLIC_MAP_STYLE,
    false
  );

  const fixedPaths = {
    NEXT_PUBLIC_BACKEND: "/api/smokemap",
    NEXT_PUBLIC_GRAPHQL_ENDPOINT: "/api/smokemap/graphql",
    NEXT_PUBLIC_FEATURESERV_ENDPOINT: "/api/smokemap/locations",
  };
  for (const [name, expected] of Object.entries(fixedPaths)) {
    if (publicValues[name] !== expected) {
      throw invalid(name, "the same-origin staging path is required");
    }
  }

  if (
    !["trace", "debug", "info", "warn", "error", "fatal"].includes(
      publicValues.NEXT_PUBLIC_LOG_LEVEL
    )
  ) {
    throw invalid("NEXT_PUBLIC_LOG_LEVEL", "an allowed log level is required");
  }

  return {
    schemaVersion: 1,
    sourceRevision,
    public: publicValues,
  };
}

function validateBackendUrl(environment) {
  const value = required(environment, "BACKEND_INTERNAL_URL");
  const parsed = parsedUrl("BACKEND_INTERNAL_URL", value);
  if (
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash ||
    !parsed.port
  ) {
    throw invalid(
      "BACKEND_INTERNAL_URL",
      "an explicit origin and port are required"
    );
  }
  if (parsed.protocol === "http:") {
    const hostname = normalizedHostname(parsed.hostname);
    const privateHost =
      !hostname.includes(".") ||
      hostname.endsWith(".internal") ||
      isPrivateIpv4(hostname);
    if (!privateHost) {
      throw invalid(
        "BACKEND_INTERNAL_URL",
        "plain HTTP is allowed only on a private service network"
      );
    }
  } else if (parsed.protocol !== "https:") {
    throw invalid("BACKEND_INTERNAL_URL", "HTTP or HTTPS is required");
  }
  return parsed;
}

function validateRuntimeEnvironment(environment, manifest) {
  if (
    !manifest ||
    manifest.schemaVersion !== 1 ||
    typeof manifest.sourceRevision !== "string" ||
    !manifest.public
  ) {
    throw invalid("production-build.json", "a supported manifest is required");
  }

  if (environment.NODE_ENV !== "production") {
    throw invalid("NODE_ENV", "the value must be production");
  }
  validateNoPublicSecrets(environment);
  for (const name of PUBLIC_BUILD_VARIABLES) {
    if (required(environment, name) !== manifest.public[name]) {
      throw invalid(name, "the runtime value does not match the built image");
    }
  }

  const nextAuthUrl = publicHttpsUrl(
    "NEXTAUTH_URL",
    required(environment, "NEXTAUTH_URL"),
    true
  );
  if (nextAuthUrl.href !== new URL(manifest.public.NEXT_PUBLIC_BASE_URL).href) {
    throw invalid("NEXTAUTH_URL", "the value must match NEXT_PUBLIC_BASE_URL");
  }
  if (required(environment, "NEXTAUTH_SECRET").length < 32) {
    throw invalid("NEXTAUTH_SECRET", "at least 32 characters are required");
  }

  return validateBackendConnectivity(environment);
}

function validateBackendConnectivity(environment) {
  const backend = validateBackendUrl(environment);
  const graphql = parsedUrl(
    "GRAPHQL_INTERNAL_ENDPOINT",
    required(environment, "GRAPHQL_INTERNAL_ENDPOINT")
  );
  if (
    graphql.origin !== backend.origin ||
    graphql.pathname !== "/graphql/" ||
    graphql.search ||
    graphql.hash
  ) {
    throw invalid(
      "GRAPHQL_INTERNAL_ENDPOINT",
      "the backend origin with the /graphql/ path is required"
    );
  }
  return {
    backendOrigin: backend.origin,
    graphqlEndpoint: graphql.href,
  };
}

function runCommand() {
  const command = process.argv[2];
  if (command !== "validate-build") {
    throw new Error("Unknown production configuration command");
  }
  const manifest = validateBuildEnvironment(process.env);
  const outputPath = process.argv[3];
  if (!outputPath) {
    throw new Error("Production build manifest output path is required");
  }
  fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o644,
  });
  console.log("Validated production build configuration");
}

if (require.main === module) {
  try {
    runCommand();
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Validation failed");
    process.exitCode = 78;
  }
}

module.exports = {
  PUBLIC_BUILD_VARIABLES,
  validateBackendConnectivity,
  validateBuildEnvironment,
  validateRuntimeEnvironment,
};
