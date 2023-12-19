import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
const defaultOptions = {} as const;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  DateTime: { input: any; output: any; }
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


export const GetAllCategoriesDocument = gql`
    query GetAllCategories {
  categories {
    id
    name
    description
  }
}
    `;

/**
 * __useGetAllCategoriesQuery__
 *
 * To run a query within a React component, call `useGetAllCategoriesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetAllCategoriesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetAllCategoriesQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetAllCategoriesQuery(baseOptions?: Apollo.QueryHookOptions<GetAllCategoriesQuery, GetAllCategoriesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetAllCategoriesQuery, GetAllCategoriesQueryVariables>(GetAllCategoriesDocument, options);
      }
export function useGetAllCategoriesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetAllCategoriesQuery, GetAllCategoriesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetAllCategoriesQuery, GetAllCategoriesQueryVariables>(GetAllCategoriesDocument, options);
        }
export function useGetAllCategoriesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetAllCategoriesQuery, GetAllCategoriesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetAllCategoriesQuery, GetAllCategoriesQueryVariables>(GetAllCategoriesDocument, options);
        }
export type GetAllCategoriesQueryHookResult = ReturnType<typeof useGetAllCategoriesQuery>;
export type GetAllCategoriesLazyQueryHookResult = ReturnType<typeof useGetAllCategoriesLazyQuery>;
export type GetAllCategoriesSuspenseQueryHookResult = ReturnType<typeof useGetAllCategoriesSuspenseQuery>;
export type GetAllCategoriesQueryResult = Apollo.QueryResult<GetAllCategoriesQuery, GetAllCategoriesQueryVariables>;
export const GetAllRequestsDocument = gql`
    query GetAllRequests {
  requests {
    id
    name
    category {
      name
    }
    address {
      properties {
        addressString
      }
      geometry {
        coordinates
      }
    }
    description
    tags
  }
}
    `;

/**
 * __useGetAllRequestsQuery__
 *
 * To run a query within a React component, call `useGetAllRequestsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetAllRequestsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetAllRequestsQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetAllRequestsQuery(baseOptions?: Apollo.QueryHookOptions<GetAllRequestsQuery, GetAllRequestsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetAllRequestsQuery, GetAllRequestsQueryVariables>(GetAllRequestsDocument, options);
      }
export function useGetAllRequestsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetAllRequestsQuery, GetAllRequestsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetAllRequestsQuery, GetAllRequestsQueryVariables>(GetAllRequestsDocument, options);
        }
export function useGetAllRequestsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetAllRequestsQuery, GetAllRequestsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetAllRequestsQuery, GetAllRequestsQueryVariables>(GetAllRequestsDocument, options);
        }
export type GetAllRequestsQueryHookResult = ReturnType<typeof useGetAllRequestsQuery>;
export type GetAllRequestsLazyQueryHookResult = ReturnType<typeof useGetAllRequestsLazyQuery>;
export type GetAllRequestsSuspenseQueryHookResult = ReturnType<typeof useGetAllRequestsSuspenseQuery>;
export type GetAllRequestsQueryResult = Apollo.QueryResult<GetAllRequestsQuery, GetAllRequestsQueryVariables>;
export const GetAllNotApprovedRequestsDocument = gql`
    query GetAllNotApprovedRequests {
  requestsToApprove {
    id
    name
    category {
      name
    }
    address {
      properties {
        addressString
      }
      geometry {
        coordinates
      }
    }
    description
    tags
    dateCreated
    dateUpdated
    dateApproved
    approved
    approvedBy
    approvedComment
  }
}
    `;

/**
 * __useGetAllNotApprovedRequestsQuery__
 *
 * To run a query within a React component, call `useGetAllNotApprovedRequestsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetAllNotApprovedRequestsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetAllNotApprovedRequestsQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetAllNotApprovedRequestsQuery(baseOptions?: Apollo.QueryHookOptions<GetAllNotApprovedRequestsQuery, GetAllNotApprovedRequestsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetAllNotApprovedRequestsQuery, GetAllNotApprovedRequestsQueryVariables>(GetAllNotApprovedRequestsDocument, options);
      }
export function useGetAllNotApprovedRequestsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetAllNotApprovedRequestsQuery, GetAllNotApprovedRequestsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetAllNotApprovedRequestsQuery, GetAllNotApprovedRequestsQueryVariables>(GetAllNotApprovedRequestsDocument, options);
        }
export function useGetAllNotApprovedRequestsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetAllNotApprovedRequestsQuery, GetAllNotApprovedRequestsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetAllNotApprovedRequestsQuery, GetAllNotApprovedRequestsQueryVariables>(GetAllNotApprovedRequestsDocument, options);
        }
export type GetAllNotApprovedRequestsQueryHookResult = ReturnType<typeof useGetAllNotApprovedRequestsQuery>;
export type GetAllNotApprovedRequestsLazyQueryHookResult = ReturnType<typeof useGetAllNotApprovedRequestsLazyQuery>;
export type GetAllNotApprovedRequestsSuspenseQueryHookResult = ReturnType<typeof useGetAllNotApprovedRequestsSuspenseQuery>;
export type GetAllNotApprovedRequestsQueryResult = Apollo.QueryResult<GetAllNotApprovedRequestsQuery, GetAllNotApprovedRequestsQueryVariables>;
export const CreateRequestDocument = gql`
    mutation CreateRequest($input: RequestInput!) {
  createRequest(input: $input) {
    request {
      id
      name
      category {
        name
      }
      address {
        properties {
          addressString
        }
        geometry {
          coordinates
        }
      }
      description
      tags
      dateCreated
    }
  }
}
    `;
export type CreateRequestMutationFn = Apollo.MutationFunction<CreateRequestMutation, CreateRequestMutationVariables>;

/**
 * __useCreateRequestMutation__
 *
 * To run a mutation, you first call `useCreateRequestMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateRequestMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createRequestMutation, { data, loading, error }] = useCreateRequestMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateRequestMutation(baseOptions?: Apollo.MutationHookOptions<CreateRequestMutation, CreateRequestMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateRequestMutation, CreateRequestMutationVariables>(CreateRequestDocument, options);
      }
export type CreateRequestMutationHookResult = ReturnType<typeof useCreateRequestMutation>;
export type CreateRequestMutationResult = Apollo.MutationResult<CreateRequestMutation>;
export type CreateRequestMutationOptions = Apollo.BaseMutationOptions<CreateRequestMutation, CreateRequestMutationVariables>;
export const ApproveRequestDocument = gql`
    mutation ApproveRequest($id: ID!, $input: RequestApproveInput!) {
  approveRequest(id: $id, input: $input) {
    request {
      id
      name
      category {
        name
      }
      address {
        properties {
          addressString
        }
        geometry {
          coordinates
        }
      }
      description
      dateCreated
      dateUpdated
      dateApproved
      approved
      approvedBy
      approvedComment
      tags
    }
  }
}
    `;
export type ApproveRequestMutationFn = Apollo.MutationFunction<ApproveRequestMutation, ApproveRequestMutationVariables>;

/**
 * __useApproveRequestMutation__
 *
 * To run a mutation, you first call `useApproveRequestMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useApproveRequestMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [approveRequestMutation, { data, loading, error }] = useApproveRequestMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useApproveRequestMutation(baseOptions?: Apollo.MutationHookOptions<ApproveRequestMutation, ApproveRequestMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ApproveRequestMutation, ApproveRequestMutationVariables>(ApproveRequestDocument, options);
      }
export type ApproveRequestMutationHookResult = ReturnType<typeof useApproveRequestMutation>;
export type ApproveRequestMutationResult = Apollo.MutationResult<ApproveRequestMutation>;
export type ApproveRequestMutationOptions = Apollo.BaseMutationOptions<ApproveRequestMutation, ApproveRequestMutationVariables>;
export const DeleteRequestDocument = gql`
    mutation DeleteRequest($id: ID!) {
  deleteRequest(id: $id) {
    ok
  }
}
    `;
export type DeleteRequestMutationFn = Apollo.MutationFunction<DeleteRequestMutation, DeleteRequestMutationVariables>;

/**
 * __useDeleteRequestMutation__
 *
 * To run a mutation, you first call `useDeleteRequestMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteRequestMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteRequestMutation, { data, loading, error }] = useDeleteRequestMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteRequestMutation(baseOptions?: Apollo.MutationHookOptions<DeleteRequestMutation, DeleteRequestMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteRequestMutation, DeleteRequestMutationVariables>(DeleteRequestDocument, options);
      }
export type DeleteRequestMutationHookResult = ReturnType<typeof useDeleteRequestMutation>;
export type DeleteRequestMutationResult = Apollo.MutationResult<DeleteRequestMutation>;
export type DeleteRequestMutationOptions = Apollo.BaseMutationOptions<DeleteRequestMutation, DeleteRequestMutationVariables>;