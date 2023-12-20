import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  overwrite: true,
  schema: "http://192.168.56.5:8000/graphql/",
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
    },
  },
  // still generate output even if no documents found
  ignoreNoDocuments: true,
};

export default config;
