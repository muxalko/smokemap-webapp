# Production frontend image

The `production` Docker target is the frontend staging release candidate. It
uses the supported Node 22.23.4 and Yarn 1.22.22 toolchain, installs the frozen
lockfile, compiles Next.js standalone output, and runs as fixed UID/GID 10001.
The existing `development` target and hot-reload command are unchanged.

This target is a release building block, not authorization to publish or
deploy an image.

## Public build inputs

Next.js replaces `NEXT_PUBLIC_*` references while compiling browser bundles.
Those values therefore have to be supplied when the image is built, not first
at container startup. The production build fails before compilation unless all
of these inputs pass `src/lib/production-config.js`:

| Input | Required staging value |
| --- | --- |
| `VCS_REF` | Full lowercase 40-hex commit used as the build context |
| `NEXT_PUBLIC_ENVIRONMENT` | `staging` |
| `NEXT_PUBLIC_VERSION` | Exactly the same full commit as `VCS_REF` |
| `NEXT_PUBLIC_BASE_URL` | Public HTTPS application origin, without a path, credentials, query, or fragment |
| `NEXT_PUBLIC_BACKEND` | `/api/smokemap` |
| `NEXT_PUBLIC_GRAPHQL_ENDPOINT` | `/api/smokemap/graphql` |
| `NEXT_PUBLIC_FEATURESERV_ENDPOINT` | `/api/smokemap/locations` |
| `NEXT_PUBLIC_MAP_STYLE` | Public HTTPS style URL without credentials, query, or fragment |
| `NEXT_PUBLIC_LOG_LEVEL` | `trace`, `debug`, `info`, `warn`, `error`, or `fatal` |

The build rejects every secret-like `NEXT_PUBLIC_*` name. `NEXTAUTH_SECRET`,
backend credentials, tokens, passwords, and dotenv files are neither build
arguments nor build-context inputs. Public values and the source revision are
recorded in `production-build.json`; do not put confidential information in
any public input.

Build from a clean commit with the values intended for staging:

```sh
source_sha="$(git rev-parse HEAD)"
test -z "$(git status --porcelain)"
docker build \
  --target production \
  --build-arg "VCS_REF=${source_sha}" \
  --build-arg NEXT_PUBLIC_ENVIRONMENT=staging \
  --build-arg "NEXT_PUBLIC_VERSION=${source_sha}" \
  --build-arg NEXT_PUBLIC_BASE_URL=https://staging.example.com \
  --build-arg NEXT_PUBLIC_BACKEND=/api/smokemap \
  --build-arg NEXT_PUBLIC_GRAPHQL_ENDPOINT=/api/smokemap/graphql \
  --build-arg NEXT_PUBLIC_FEATURESERV_ENDPOINT=/api/smokemap/locations \
  --build-arg NEXT_PUBLIC_MAP_STYLE=https://tiles.openfreemap.org/styles/liberty \
  --build-arg NEXT_PUBLIC_LOG_LEVEL=info \
  --tag "smokemap-frontend:${source_sha}" \
  .
```

The base is the official multi-platform
`node:22.23.4-bookworm-slim` image pinned to index digest
`sha256:de170b39439eb0e5a3444ad7d60b015614a381e10fecae2e30ec9e735122f38d`.
The tag documents the supported version; the digest makes the build input
immutable.

## Runtime contract

The root staging Compose contract may continue to run:

```sh
yarn start --hostname 0.0.0.0 --port 3000
```

Startup compares every public runtime value with the build manifest and fails
closed on drift. It also requires:

| Variable | Runtime contract |
| --- | --- |
| `NODE_ENV` | Exactly `production` |
| `NEXTAUTH_URL` | Same public HTTPS origin as `NEXT_PUBLIC_BASE_URL` |
| `NEXTAUTH_SECRET` | Runtime-only secret of at least 32 characters, injected from the staging secret file |
| `BACKEND_INTERNAL_URL` | Explicit backend origin and port; root PR #111 uses `http://backend:8000` on the private application network |
| `GRAPHQL_INTERNAL_ENDPOINT` | Same backend origin with the exact `/graphql/` path |

The standalone server resolves backend connectivity at request time. Browser
GraphQL, place-list, search, and approved-media calls remain same-origin and
are forwarded only to their established backend paths. Client-supplied
forwarding headers are removed and the trusted internal frontend hop supplies
`X-Forwarded-Proto: https`, matching the TLS/proxy contract introduced by
backend PR #116. Direct server-side authentication and GraphQL calls use the
same header in production. Development continues to use its local defaults.

## Image and source provenance

For every candidate, record:

- the clean, full source commit and the successful CI run URL;
- SHA-256 values for `Dockerfile`, `package.json`, `yarn.lock`, and
  `src/lib/production-config.js`;
- the pinned Node base index digest and the resolved platform manifest digest;
- all non-secret public build inputs;
- the OCI `org.opencontainers.image.revision` label;
- the registry index digest and per-platform manifest digests;
- BuildKit provenance/SBOM attestations, builder identity, and timestamp;
- the production image build/startup result and full-history secret-scan result.

A future publication workflow should build once with
`docker buildx build --provenance=mode=max --sbom=true`, push a commit-addressed
tag, verify the label and attestations, and promote only
`registry.example.com/smokemap/frontend@sha256:<index-digest>`. Never rebuild a
mutable tag per environment. Rollback selects an already verified digest.

## Remaining staging blockers

- Root staging Compose must consume the frontend image by immutable registry
  digest and set `RELEASE_VERSION` to the image's exact source commit.
- The root contract merged in PR #111 still uses backend environment names and
  omissions that do not match backend PR #116 (`DJANGO_ALLOWED_HOSTS`,
  `DJANGO_TRUST_X_FORWARDED_PROTO`, and `POSTGRES_SSLMODE`). That root-owned
  integration issue must be resolved before launch.
- No frontend image has been published, and no registry location, signing
  policy, or promotion workflow is established by this change.
- Tunnel/DNS/Access configuration, independent staging secrets, controlled
  migration, backup/restore, observability, end-to-end smoke tests, and digest
  rollback remain external release gates.

Do not infer deployment readiness from a passing image build.
