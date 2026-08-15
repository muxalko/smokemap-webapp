This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## NextJS Getting Started

For installing any packages inside the docker container use the following,

```bash
docker compose exec webapp yarn install  maplibre-gl [<package-name>]
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
  ▲ Next.js 13.5.4
  - Local:        http://localhost:3000
  - Network:      http://0.0.0.0:3000
  - Environments: .env.local, .env.development
  - Experiments (use at your own risk):
     · serverActions

 ✓ Ready in 2.1s
```