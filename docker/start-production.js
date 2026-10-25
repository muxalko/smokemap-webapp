const fs = require("node:fs");
const path = require("node:path");

const productionConfigPath = fs.existsSync(
  path.join(__dirname, "production-config.js")
)
  ? "./production-config"
  : "../src/lib/production-config";
const { validateRuntimeEnvironment } = require(productionConfigPath);

function parseServerArguments(argumentsToParse) {
  const options = {};
  for (let index = 0; index < argumentsToParse.length; index += 1) {
    const argument = argumentsToParse[index];
    if (argument !== "--hostname" && argument !== "--port") {
      throw new Error("Unsupported production server argument");
    }
    const value = argumentsToParse[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error("Missing production server argument value");
    }
    options[argument.slice(2)] = value;
    index += 1;
  }
  return options;
}

function run() {
  const manifestPath = path.join(__dirname, "..", "production-build.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  validateRuntimeEnvironment(process.env, manifest);

  const options = parseServerArguments(process.argv.slice(2));
  if (options.hostname && options.hostname !== "0.0.0.0") {
    throw new Error("Production server hostname must be 0.0.0.0");
  }
  if (options.port && options.port !== "3000") {
    throw new Error("Production server port must be 3000");
  }
  if (options.hostname) process.env.HOSTNAME = options.hostname;
  if (options.port) process.env.PORT = options.port;

  require("../server.js");
}

if (require.main === module) {
  try {
    run();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Startup failed";
    console.error(message);
    process.exitCode = 78;
  }
}

module.exports = { parseServerArguments, run };
