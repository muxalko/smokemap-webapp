import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  overwrite: true,
  schema: "http://localhost:8000/graphql/",
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
