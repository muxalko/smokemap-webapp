/* eslint-disable */
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /**
   * The `DateTime` scalar type represents a DateTime
   * value as specified by
   * [iso8601](https://en.wikipedia.org/wiki/ISO_8601).
   */
  DateTime: { input: any; output: any; }
  /**
   * The `GenericScalar` scalar type represents a generic
   * GraphQL scalar value that could be:
   * String, Boolean, Int, Float, List or Object.
   */
  GenericScalar: { input: any; output: any; }
};

export type AddressProperties = {
  __typename?: 'AddressProperties';
  addressString: Scalars['String']['output'];
  placeSet: Array<PlaceType>;
  requestSet: Array<RequestType>;
};

export type AddressType = {
  __typename?: 'AddressType';
  bbox?: Maybe<Scalars['GenericScalar']['output']>;
  geometry: GeometryObjectType;
  id: Scalars['ID']['output'];
  properties?: Maybe<AddressProperties>;
  type?: Maybe<Scalars['String']['output']>;
};

export type ApproveRequest = {
  __typename?: 'ApproveRequest';
  request?: Maybe<RequestType>;
};

export type CategoryType = {
  __typename?: 'CategoryType';
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

export type CreateCategory = {
  __typename?: 'CreateCategory';
  category?: Maybe<CategoryType>;
};

export type CreateRequest = {
  __typename?: 'CreateRequest';
  request?: Maybe<RequestType>;
};

export type DeleteRequest = {
  __typename?: 'DeleteRequest';
  ok?: Maybe<Scalars['Boolean']['output']>;
};

/**
 *
 * `GeometryObjectType` represents a pair of values:
 * - Geometry `type`
 * - Geometry `coordinates`
 *
 */
export type GeometryObjectType = {
  __typename?: 'GeometryObjectType';
  coordinates?: Maybe<Scalars['GenericScalar']['output']>;
  type?: Maybe<Scalars['String']['output']>;
};

export type Mutation = {
  __typename?: 'Mutation';
  approveRequest?: Maybe<ApproveRequest>;
  createCategory?: Maybe<CreateCategory>;
  createRequest?: Maybe<CreateRequest>;
  deleteRequest?: Maybe<DeleteRequest>;
  updateCategory?: Maybe<UpdateCategory>;
  updateRequest?: Maybe<UpdateRequest>;
};


export type MutationApproveRequestArgs = {
  id?: InputMaybe<Scalars['ID']['input']>;
  input: RequestApproveInput;
};


export type MutationCreateCategoryArgs = {
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
};


export type MutationCreateRequestArgs = {
  input: RequestInput;
};


export type MutationDeleteRequestArgs = {
  id?: InputMaybe<Scalars['ID']['input']>;
};


export type MutationUpdateCategoryArgs = {
  description?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
};


export type MutationUpdateRequestArgs = {
  id?: InputMaybe<Scalars['ID']['input']>;
  input: RequestInput;
};

export type PlaceType = {
  __typename?: 'PlaceType';
  address: AddressType;
  category: CategoryType;
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  tags: Array<TagType>;
};

export type Query = {
  __typename?: 'Query';
  addresses?: Maybe<Array<Maybe<AddressType>>>;
  categories?: Maybe<Array<Maybe<CategoryType>>>;
  places?: Maybe<Array<Maybe<PlaceType>>>;
  requests?: Maybe<Array<Maybe<RequestType>>>;
  requestsById?: Maybe<RequestType>;
  requestsByName?: Maybe<RequestType>;
  requestsToApprove?: Maybe<Array<Maybe<RequestType>>>;
  tags?: Maybe<Array<Maybe<TagType>>>;
};


export type QueryRequestsByIdArgs = {
  id?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryRequestsByNameArgs = {
  name?: InputMaybe<Scalars['String']['input']>;
};

export type RequestApproveInput = {
  approvedBy?: InputMaybe<Scalars['String']['input']>;
  approvedComment?: InputMaybe<Scalars['String']['input']>;
};

export type RequestInput = {
  addressString?: InputMaybe<Scalars['String']['input']>;
  category?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

export type RequestType = {
  __typename?: 'RequestType';
  address: AddressType;
  approved: Scalars['Boolean']['output'];
  approvedBy?: Maybe<Scalars['String']['output']>;
  approvedComment?: Maybe<Scalars['String']['output']>;
  category: CategoryType;
  dateApproved?: Maybe<Scalars['DateTime']['output']>;
  dateCreated: Scalars['DateTime']['output'];
  dateUpdated: Scalars['DateTime']['output'];
  description: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  tags: Array<Maybe<Scalars['String']['output']>>;
};

export type TagType = {
  __typename?: 'TagType';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

export type UpdateCategory = {
  __typename?: 'UpdateCategory';
  category?: Maybe<CategoryType>;
};

export type UpdateRequest = {
  __typename?: 'UpdateRequest';
  request?: Maybe<RequestType>;
};

export type GetAllCategoriesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetAllCategoriesQuery = { __typename?: 'Query', categories?: Array<{ __typename?: 'CategoryType', id: string, name: string, description?: string | null } | null> | null };

export type GetAllRequestsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetAllRequestsQuery = { __typename?: 'Query', requests?: Array<{ __typename?: 'RequestType', id: string, name: string, description: string, tags: Array<string | null>, category: { __typename?: 'CategoryType', name: string }, address: { __typename?: 'AddressType', properties?: { __typename?: 'AddressProperties', addressString: string } | null, geometry: { __typename?: 'GeometryObjectType', coordinates?: any | null } } } | null> | null };

export type GetAllNotApprovedRequestsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetAllNotApprovedRequestsQuery = { __typename?: 'Query', requestsToApprove?: Array<{ __typename?: 'RequestType', id: string, name: string, description: string, tags: Array<string | null>, dateCreated: any, dateUpdated: any, dateApproved?: any | null, approved: boolean, approvedBy?: string | null, approvedComment?: string | null, category: { __typename?: 'CategoryType', name: string }, address: { __typename?: 'AddressType', properties?: { __typename?: 'AddressProperties', addressString: string } | null, geometry: { __typename?: 'GeometryObjectType', coordinates?: any | null } } } | null> | null };

export type CreateRequestMutationVariables = Exact<{
  input: RequestInput;
}>;


export type CreateRequestMutation = { __typename?: 'Mutation', createRequest?: { __typename?: 'CreateRequest', request?: { __typename?: 'RequestType', id: string, name: string, description: string, tags: Array<string | null>, dateCreated: any, category: { __typename?: 'CategoryType', name: string }, address: { __typename?: 'AddressType', properties?: { __typename?: 'AddressProperties', addressString: string } | null, geometry: { __typename?: 'GeometryObjectType', coordinates?: any | null } } } | null } | null };

export type ApproveRequestMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: RequestApproveInput;
}>;


export type ApproveRequestMutation = { __typename?: 'Mutation', approveRequest?: { __typename?: 'ApproveRequest', request?: { __typename?: 'RequestType', id: string, name: string, description: string, dateCreated: any, dateUpdated: any, dateApproved?: any | null, approved: boolean, approvedBy?: string | null, approvedComment?: string | null, tags: Array<string | null>, category: { __typename?: 'CategoryType', name: string }, address: { __typename?: 'AddressType', properties?: { __typename?: 'AddressProperties', addressString: string } | null, geometry: { __typename?: 'GeometryObjectType', coordinates?: any | null } } } | null } | null };

export type DeleteRequestMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteRequestMutation = { __typename?: 'Mutation', deleteRequest?: { __typename?: 'DeleteRequest', ok?: boolean | null } | null };


export const GetAllCategoriesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetAllCategories"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"categories"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}}]}}]}}]} as unknown as DocumentNode<GetAllCategoriesQuery, GetAllCategoriesQueryVariables>;
export const GetAllRequestsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetAllRequests"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"requests"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"category"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"address"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"properties"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addressString"}}]}},{"kind":"Field","name":{"kind":"Name","value":"geometry"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"coordinates"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}}]}}]}}]} as unknown as DocumentNode<GetAllRequestsQuery, GetAllRequestsQueryVariables>;
export const GetAllNotApprovedRequestsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetAllNotApprovedRequests"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"requestsToApprove"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"category"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"address"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"properties"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addressString"}}]}},{"kind":"Field","name":{"kind":"Name","value":"geometry"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"coordinates"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"dateCreated"}},{"kind":"Field","name":{"kind":"Name","value":"dateUpdated"}},{"kind":"Field","name":{"kind":"Name","value":"dateApproved"}},{"kind":"Field","name":{"kind":"Name","value":"approved"}},{"kind":"Field","name":{"kind":"Name","value":"approvedBy"}},{"kind":"Field","name":{"kind":"Name","value":"approvedComment"}}]}}]}}]} as unknown as DocumentNode<GetAllNotApprovedRequestsQuery, GetAllNotApprovedRequestsQueryVariables>;
export const CreateRequestDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateRequest"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"RequestInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createRequest"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"request"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"category"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"address"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"properties"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addressString"}}]}},{"kind":"Field","name":{"kind":"Name","value":"geometry"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"coordinates"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}},{"kind":"Field","name":{"kind":"Name","value":"dateCreated"}}]}}]}}]}}]} as unknown as DocumentNode<CreateRequestMutation, CreateRequestMutationVariables>;
export const ApproveRequestDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ApproveRequest"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"RequestApproveInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"approveRequest"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"request"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"category"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"address"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"properties"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addressString"}}]}},{"kind":"Field","name":{"kind":"Name","value":"geometry"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"coordinates"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"dateCreated"}},{"kind":"Field","name":{"kind":"Name","value":"dateUpdated"}},{"kind":"Field","name":{"kind":"Name","value":"dateApproved"}},{"kind":"Field","name":{"kind":"Name","value":"approved"}},{"kind":"Field","name":{"kind":"Name","value":"approvedBy"}},{"kind":"Field","name":{"kind":"Name","value":"approvedComment"}},{"kind":"Field","name":{"kind":"Name","value":"tags"}}]}}]}}]}}]} as unknown as DocumentNode<ApproveRequestMutation, ApproveRequestMutationVariables>;
export const DeleteRequestDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteRequest"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteRequest"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ok"}}]}}]}}]} as unknown as DocumentNode<DeleteRequestMutation, DeleteRequestMutationVariables>;