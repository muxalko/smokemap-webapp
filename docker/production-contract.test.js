/** @jest-environment node */

const fs = require("node:fs");

const dockerfile = fs.readFileSync("Dockerfile", "utf8");
const dockerignore = fs.readFileSync(".dockerignore", "utf8");
const nextConfig = require("../next.config");
const { parseServerArguments } = require("./start-production");

it("pins the supported Node and Yarn build and keeps development intact", () => {
  expect(dockerfile).toContain(
    "node:22.23.4-bookworm-slim@sha256:de170b39439eb0e5a3444ad7d60b015614a381e10fecae2e30ec9e735122f38d"
  );
  expect(dockerfile).toContain("yarn --version | grep -Fx '1.22.22'");
  expect(dockerfile).toContain("yarn install --frozen-lockfile --non-interactive");
  expect(dockerfile).toContain("FROM dependencies AS development");
  expect(dockerfile).toContain(
    'CMD ["yarn", "dev", "--hostname", "0.0.0.0", "--port", "3000"]'
  );
});

it("uses a standalone fixed non-root production target", () => {
  expect(nextConfig.output).toBe("standalone");
  expect(dockerfile).toContain("AS production");
  expect(dockerfile).toContain("USER 10001:10001");
  expect(dockerfile).toContain("/app/.next/standalone ./");
  expect(dockerfile).toContain(
    'CMD ["yarn", "start", "--hostname", "0.0.0.0", "--port", "3000"]'
  );
});

it("does not accept secret build arguments or dotenv build context", () => {
  const buildArguments = [...dockerfile.matchAll(/^ARG\s+([^=\s]+)/gm)].map(
    (match) => match[1]
  );
  expect(buildArguments).not.toEqual(
    expect.arrayContaining([
      "NEXTAUTH_SECRET",
      "TOKEN",
      "PASSWORD",
      "CREDENTIAL",
    ])
  );
  expect(dockerignore).toMatch(/^\.env\*$/m);
});

it("accepts only the root staging Compose server argument shape", () => {
  expect(
    parseServerArguments(["--hostname", "0.0.0.0", "--port", "3000"])
  ).toEqual({ hostname: "0.0.0.0", port: "3000" });
  expect(() => parseServerArguments(["--inspect", "0.0.0.0"])).toThrow(
    "Unsupported production server argument"
  );
});
