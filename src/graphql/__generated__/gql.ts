/* eslint-disable */
import * as types from './graphql';
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 */
const documents = {
    "\nquery GetAllCategories {\n      categories {\n        id\n        name\n        description\n  }\n}\n": types.GetAllCategoriesDocument,
    "\n  query GetAllRequests {\n    requests {\n      id\n      name\n      category {\n        name\n      }\n      address {\n        properties {\n          addressString\n        }\n        geometry {\n          coordinates\n        }\n      }\n      description\n      tags\n    }\n  }\n": types.GetAllRequestsDocument,
    "\n  query GetAllNotApprovedRequests {\n    requestsToApprove {\n      id\n      name\n      category {\n        name\n      }\n      address {\n        properties {\n          addressString\n        }\n        geometry {\n          coordinates\n        }\n      }\n      description\n      tags\n      dateCreated\n      dateUpdated\n      dateApproved\n      approved\n      approvedBy\n      approvedComment\n    }\n  }\n": types.GetAllNotApprovedRequestsDocument,
    "\n  mutation CreateRequest($input: RequestInput!) {\n    createRequest(input: $input) {\n      request {\n        id\n        name\n        category {\n          name\n        }\n        address {\n          properties {\n            addressString\n          }\n          geometry {\n            coordinates\n          }\n        }\n        description\n        tags\n        dateCreated\n      }\n    }\n  }\n": types.CreateRequestDocument,
    "\n  mutation ApproveRequest($id: ID!, $input: RequestApproveInput!) {\n    approveRequest(id: $id, input: $input) {\n      request {\n        id\n        name\n        category {\n          name\n        }\n        address {\n          properties {\n            addressString\n          }\n          geometry {\n            coordinates\n          }\n        }\n        description\n        dateCreated\n        dateUpdated\n        dateApproved\n        approved\n        approvedBy\n        approvedComment\n        tags\n      }\n    }\n  }\n": types.ApproveRequestDocument,
    "\n  mutation DeleteRequest($id: ID!) {\n    deleteRequest(id: $id) {\n      ok\n    }\n  }\n": types.DeleteRequestDocument,
};

/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = gql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function gql(source: string): unknown;

/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\nquery GetAllCategories {\n      categories {\n        id\n        name\n        description\n  }\n}\n"): (typeof documents)["\nquery GetAllCategories {\n      categories {\n        id\n        name\n        description\n  }\n}\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query GetAllRequests {\n    requests {\n      id\n      name\n      category {\n        name\n      }\n      address {\n        properties {\n          addressString\n        }\n        geometry {\n          coordinates\n        }\n      }\n      description\n      tags\n    }\n  }\n"): (typeof documents)["\n  query GetAllRequests {\n    requests {\n      id\n      name\n      category {\n        name\n      }\n      address {\n        properties {\n          addressString\n        }\n        geometry {\n          coordinates\n        }\n      }\n      description\n      tags\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query GetAllNotApprovedRequests {\n    requestsToApprove {\n      id\n      name\n      category {\n        name\n      }\n      address {\n        properties {\n          addressString\n        }\n        geometry {\n          coordinates\n        }\n      }\n      description\n      tags\n      dateCreated\n      dateUpdated\n      dateApproved\n      approved\n      approvedBy\n      approvedComment\n    }\n  }\n"): (typeof documents)["\n  query GetAllNotApprovedRequests {\n    requestsToApprove {\n      id\n      name\n      category {\n        name\n      }\n      address {\n        properties {\n          addressString\n        }\n        geometry {\n          coordinates\n        }\n      }\n      description\n      tags\n      dateCreated\n      dateUpdated\n      dateApproved\n      approved\n      approvedBy\n      approvedComment\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation CreateRequest($input: RequestInput!) {\n    createRequest(input: $input) {\n      request {\n        id\n        name\n        category {\n          name\n        }\n        address {\n          properties {\n            addressString\n          }\n          geometry {\n            coordinates\n          }\n        }\n        description\n        tags\n        dateCreated\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation CreateRequest($input: RequestInput!) {\n    createRequest(input: $input) {\n      request {\n        id\n        name\n        category {\n          name\n        }\n        address {\n          properties {\n            addressString\n          }\n          geometry {\n            coordinates\n          }\n        }\n        description\n        tags\n        dateCreated\n      }\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation ApproveRequest($id: ID!, $input: RequestApproveInput!) {\n    approveRequest(id: $id, input: $input) {\n      request {\n        id\n        name\n        category {\n          name\n        }\n        address {\n          properties {\n            addressString\n          }\n          geometry {\n            coordinates\n          }\n        }\n        description\n        dateCreated\n        dateUpdated\n        dateApproved\n        approved\n        approvedBy\n        approvedComment\n        tags\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation ApproveRequest($id: ID!, $input: RequestApproveInput!) {\n    approveRequest(id: $id, input: $input) {\n      request {\n        id\n        name\n        category {\n          name\n        }\n        address {\n          properties {\n            addressString\n          }\n          geometry {\n            coordinates\n          }\n        }\n        description\n        dateCreated\n        dateUpdated\n        dateApproved\n        approved\n        approvedBy\n        approvedComment\n        tags\n      }\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation DeleteRequest($id: ID!) {\n    deleteRequest(id: $id) {\n      ok\n    }\n  }\n"): (typeof documents)["\n  mutation DeleteRequest($id: ID!) {\n    deleteRequest(id: $id) {\n      ok\n    }\n  }\n"];

export function gql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;