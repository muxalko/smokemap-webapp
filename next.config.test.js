/** @jest-environment node */

const loadCustomRoutes = require("next/dist/lib/load-custom-routes").default;
const {
  prepareDestination,
} = require("next/dist/shared/lib/router/utils/prepare-destination");
const {
  getPathMatch,
} = require("next/dist/shared/lib/router/utils/path-match");
const nextConfig = require("./next.config");

function matchRoute(route, pathname) {
  return getPathMatch(route.source, {
    strict: true,
    removeUnnamedParams: true,
  })(pathname);
}

function routeDestination(route, params) {
  return prepareDestination({
    appendParamsToQuery: !("permanent" in route),
    destination: route.destination,
    params,
    query: {},
  }).parsedDestination;
}

async function resolveCustomRoute(pathname) {
  const routes = await loadCustomRoutes(nextConfig);

  for (const redirect of routes.redirects) {
    const params = matchRoute(redirect, pathname);
    if (params) {
      return {
        type: "redirect",
        destination: routeDestination(redirect, params),
      };
    }
  }

  for (const rewrite of routes.rewrites.afterFiles) {
    const params = matchRoute(rewrite, pathname);
    if (params) {
      return {
        type: "rewrite",
        destination: routeDestination(rewrite, params),
      };
    }
  }

  return null;
}

it("builds a standalone server for the production image", () => {
  expect(nextConfig.output).toBe("standalone");
});

it("leaves media paths with either slash form for the runtime proxy", async () => {
  await expect(
    resolveCustomRoute("/api/v1/media/4dcf22a0-opaque/")
  ).resolves.toBeNull();
  await expect(
    resolveCustomRoute("/api/v1/media/4dcf22a0-opaque")
  ).resolves.toBeNull();
});

it("retains unrelated trailing-slash redirects", async () => {
  await expect(resolveCustomRoute("/places/42/")).resolves.toMatchObject({
    type: "redirect",
    destination: {
      pathname: "/places/42",
    },
  });
});
