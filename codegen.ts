import type { CodegenConfig } from "@graphql-codegen/cli";
import path from "node:path";

const config: CodegenConfig = {
  overwrite: true,
  schema:
    process.env.GRAPHQL_SCHEMA_URL ??
    process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT ??
    path.join(__dirname, "src/graphql/schema.graphql"),
  documents: "src/graphql/queries/**/*.(ts|js|graphql)",
  generates: { 
    // "./src/graphql/__generated__/": {
    //   preset: "client",
    //   presetConfig: {
    //     gqlTagName: "gql",
    //   },
    // },
    "./src/graphql/__generated__/types.ts": {
      plugins: [
        "typescript",
        "typescript-operations",
        "typescript-react-apollo"
      ],
      config: { 
        scalars: {
           ID: {
             input: 'string',
             output: 'string'
           },
           UUID: 'string',
           DateTime: 'Date',
           JSON: '{ [key: string]: any }',
           Upload: 'File'
         },
      },
    },
  },
  // still generate output even if no documents found
  ignoreNoDocuments: true,
};

export default config;
