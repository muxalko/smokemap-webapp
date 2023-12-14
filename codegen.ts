import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  overwrite: true,
  schema: process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT,
  documents: "src/graphql/queries/**/*.(ts|js|graphql)",
  generates: {
    "./src/graphql/__generated__/": {
      preset: "client",
      presetConfig: {
        gqlTagName: "gql",
      },
    },
    // "./src/graphql/generated/types.ts": {
    //   plugins: [
    //     "typescript",
    //     "typescript-operations",
    //     "typescript-graphql-request"
    //   ],
    // },
  },
  // still generate output even if no documents found
  // ignoreNoDocuments: true,
};

export default config;
