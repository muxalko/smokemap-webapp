This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

The server-side authentication and future identity-provider boundary is
documented in [`docs/AUTHENTICATION.md`](docs/AUTHENTICATION.md).

## Tests

The supported frontend toolchain is Node 22.23.4 (pinned in `.nvmrc`) with
Yarn 1.22.22. Next.js and `eslint-config-next` are deliberately aligned at
15.5.28, the maintained Next.js 15 line selected as the bounded upgrade from
the legacy Next.js 13 baseline. Install exactly what `yarn.lock` records:

```sh
nvm use
yarn install --frozen-lockfile
```

Run the canonical local checks from this repository:

```sh
yarn typecheck
yarn lint
yarn test:ci
yarn build
yarn codegen:check
```

The workspace-level `make check` and `make test` commands run the corresponding
checks in the existing Compose container.

For a focused frontend test run in that container:

```sh
docker compose exec -T frontend yarn test:ci
```

`test:ci` exits after one deterministic run and fails when tests fail or when
Jest discovers no tests. `codegen:check` regenerates the checked-in GraphQL
types from `src/graphql/schema.graphql` and fails if they drift. Pull requests
and pushes to `development` install the frozen lockfile with the `.nvmrc`
runtime, then run typecheck, lint, unit tests, a production build, and the
codegen drift check. CI also scans the full Git history with Gitleaks and
redacts any detected values.

## Viewport map data

The map requests the backend's bounded GeoJSON contract through the same-origin
`/api/smokemap/locations` browser route. Initial load and settled pan or zoom
changes send the visible `bbox` and integer `zoom`. Requests are debounced;
superseded requests are aborted and sequence-guarded so stale responses cannot
replace the current viewport. Loading, refreshing, empty, and error overlays
leave the MapLibre instance mounted, and request failures provide a retry
action.

## Place search

The map search box calls the backend's bounded `GET /api/v1/places/search/`
contract through the same-origin `/api/smokemap/places/search` browser route.
Queries are normalized like the backend (NFKC, collapsed whitespace, lower
case); fewer than 2 or more than 100 characters never send a request. Settled
input is debounced, each request asks for at most 10 results (the backend caps
`limit` at 20), and superseded requests are aborted and cannot replace newer
results. The combobox shows explicit idle, too-short, loading, empty, error
(with retry) and result states, supports ArrowUp/ArrowDown, Enter and Escape,
and selecting a result flies the map to it and opens its details. No search
path downloads the full place-name collection.

## NextJS Getting Started

For installing any packages inside the docker container use the following,

```bash
docker compose exec webapp yarn install maplibre-gl [<package-name>]
```

Also, if u get any `ModuleNotFoundError` use the same command in order to install the missing one inside container.

## Running in VM

```bash
$ yarn dev --hostname 0.0.0.0 --port 3000
yarn run v1.22.21
$ graphql-codegen --config codegen.ts
✔ Parse Configuration
✔ Generate outputs
$ next dev --hostname 0.0.0.0 --port 3000
  ▲ Next.js 15.5.28
  - Local:        http://localhost:3000
  - Network:      http://0.0.0.0:3000
  - Environments: .env.local, .env.development
  - Experiments (use at your own risk):
     · serverActions

 ✓ Ready in 2.1s
```
