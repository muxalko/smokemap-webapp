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
  /**
   * The `DateTime` scalar type represents a DateTime
   * value as specified by
   * [iso8601](https://en.wikipedia.org/wiki/ISO_8601).
   */
  DateTime: { input: Date; output: Date; }
  /**
   * The `GenericScalar` scalar type represents a generic
   * GraphQL scalar value that could be:
   * String, Boolean, Int, Float, List or Object.
   */
  GenericScalar: { input: any; output: any; }
  /**
   * Allows use of a JSON String for input / output from the GraphQL schema.
   *
   * Use of this type is *not recommended* as you lose the benefits of having a defined, static
   * schema (one of the key benefits of GraphQL).
   */
  JSONString: { input: any; output: any; }
  /**
   * Leverages the internal Python implementation of UUID (uuid.UUID) to provide native UUID objects
   * in fields, resolvers and input.
   */
  UUID: { input: string; output: string; }
};

export type AddressProperties = {
  __typename?: 'AddressProperties';
  addressString?: Maybe<Scalars['String']['output']>;
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

export type ApproveSubmissionV4 = {
  __typename?: 'ApproveSubmissionV4';
  place: PlaceType;
  replayed: Scalars['Boolean']['output'];
  submission: RequestType;
};

export type AttachVerifiedMedia = {
  __typename?: 'AttachVerifiedMedia';
  attachment: ManagedMediaAttachmentType;
  replayed: Scalars['Boolean']['output'];
};

export type CategoryType = {
  __typename?: 'CategoryType';
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  slug: Scalars['String']['output'];
};

export type CleanupMediaUploadIntent = {
  __typename?: 'CleanupMediaUploadIntent';
  deleted: Scalars['Boolean']['output'];
  intent: MediaUploadIntentType;
  replayed: Scalars['Boolean']['output'];
};

export type CreateImage = {
  __typename?: 'CreateImage';
  image?: Maybe<ImageType>;
};

export type CreateMediaUploadIntent = {
  __typename?: 'CreateMediaUploadIntent';
  intent: MediaUploadIntentType;
  replayed: Scalars['Boolean']['output'];
};

export type CreateMediaUploadIntentInput = {
  declaredByteSize: Scalars['Int']['input'];
  declaredSha256: Scalars['String']['input'];
  mimeType: Scalars['String']['input'];
  originalFilename?: InputMaybe<Scalars['String']['input']>;
  slot?: InputMaybe<Scalars['Int']['input']>;
  submissionId: Scalars['ID']['input'];
};

export type CreateRequest = {
  __typename?: 'CreateRequest';
  request?: Maybe<RequestType>;
};

export type CreateSubmissionV3 = {
  __typename?: 'CreateSubmissionV3';
  replayed: Scalars['Boolean']['output'];
  submission: RequestType;
};

export type DeleteRequest = {
  __typename?: 'DeleteRequest';
  ok?: Maybe<Scalars['Boolean']['output']>;
};

export type EditSubmissionV3 = {
  __typename?: 'EditSubmissionV3';
  replayed: Scalars['Boolean']['output'];
  submission: SubmissionV3SnapshotType;
};

export type ExpireMediaUploadIntent = {
  __typename?: 'ExpireMediaUploadIntent';
  intent: MediaUploadIntentType;
  replayed: Scalars['Boolean']['output'];
};

export type FinalizeSubmissionV3 = {
  __typename?: 'FinalizeSubmissionV3';
  replayed: Scalars['Boolean']['output'];
  submission: SubmissionV3SnapshotType;
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

export type ImageInput = {
  metadata?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  requestId?: InputMaybe<Scalars['String']['input']>;
  url?: InputMaybe<Scalars['String']['input']>;
};

export type ImageType = {
  __typename?: 'ImageType';
  id: Scalars['ID']['output'];
  metadata?: Maybe<Scalars['JSONString']['output']>;
  name: Scalars['String']['output'];
  url: Scalars['String']['output'];
};

export type IssueMediaUploadIntent = {
  __typename?: 'IssueMediaUploadIntent';
  intent: MediaUploadIntentType;
  replayed: Scalars['Boolean']['output'];
  upload: MediaUploadAuthorization;
};

export type ManagedMediaAttachmentType = {
  __typename?: 'ManagedMediaAttachmentType';
  attachedAt?: Maybe<Scalars['DateTime']['output']>;
  byteSize?: Maybe<Scalars['Int']['output']>;
  detectedMime: Scalars['String']['output'];
  height?: Maybe<Scalars['Int']['output']>;
  id: Scalars['ID']['output'];
  mediaIntentId: Scalars['ID']['output'];
  position?: Maybe<Scalars['Int']['output']>;
  state: Scalars['String']['output'];
  submissionId: Scalars['ID']['output'];
  width?: Maybe<Scalars['Int']['output']>;
};

/** A short-lived, exact-object GET capability. Never a bucket, key, or credential. */
export type MediaPreviewAuthorization = {
  __typename?: 'MediaPreviewAuthorization';
  expiresAt: Scalars['DateTime']['output'];
  url: Scalars['String']['output'];
};

export type MediaUploadAuthorization = {
  __typename?: 'MediaUploadAuthorization';
  expiresAt: Scalars['DateTime']['output'];
  fields: Scalars['GenericScalar']['output'];
  url: Scalars['String']['output'];
};

export type MediaUploadIntentType = {
  __typename?: 'MediaUploadIntentType';
  absoluteExpiresAt: Scalars['DateTime']['output'];
  attachedAt?: Maybe<Scalars['DateTime']['output']>;
  cleanupAttempts: Scalars['Int']['output'];
  cleanupNextAttemptAt?: Maybe<Scalars['DateTime']['output']>;
  createdAt: Scalars['DateTime']['output'];
  declaredByteSize: Scalars['Int']['output'];
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  detectedMime: Scalars['String']['output'];
  expectedMime: Scalars['String']['output'];
  failureCode: Scalars['String']['output'];
  height?: Maybe<Scalars['Int']['output']>;
  id: Scalars['UUID']['output'];
  presignExpiresAt?: Maybe<Scalars['DateTime']['output']>;
  serverByteSize?: Maybe<Scalars['Int']['output']>;
  slot: Scalars['Int']['output'];
  state: Scalars['String']['output'];
  submissionId: Scalars['ID']['output'];
  verificationAttempts: Scalars['Int']['output'];
  verifiedAt?: Maybe<Scalars['DateTime']['output']>;
  width?: Maybe<Scalars['Int']['output']>;
};

/** Minimum safe identity needed to preview one queued attachment. */
export type ModerationMediaAttachmentV4 = {
  __typename?: 'ModerationMediaAttachmentV4';
  id: Scalars['ID']['output'];
  position: Scalars['Int']['output'];
};

export type ModerationQueuePageV4 = {
  __typename?: 'ModerationQueuePageV4';
  hasNextPage: Scalars['Boolean']['output'];
  items: Array<RequestType>;
  nextCursor?: Maybe<Scalars['String']['output']>;
};

export type Mutation = {
  __typename?: 'Mutation';
  approveRequest?: Maybe<ApproveRequest>;
  approveSubmissionV4?: Maybe<ApproveSubmissionV4>;
  attachVerifiedMedia?: Maybe<AttachVerifiedMedia>;
  cleanupMediaUploadIntent?: Maybe<CleanupMediaUploadIntent>;
  createImage?: Maybe<CreateImage>;
  createMediaUploadIntent?: Maybe<CreateMediaUploadIntent>;
  createRequest?: Maybe<CreateRequest>;
  createSubmissionV3?: Maybe<CreateSubmissionV3>;
  deleteRequest?: Maybe<DeleteRequest>;
  editSubmissionV3?: Maybe<EditSubmissionV3>;
  expireMediaUploadIntent?: Maybe<ExpireMediaUploadIntent>;
  finalizeSubmissionV3?: Maybe<FinalizeSubmissionV3>;
  issueMediaUploadIntent?: Maybe<IssueMediaUploadIntent>;
  refreshToken?: Maybe<Refresh>;
  rejectSubmissionV4?: Maybe<RejectSubmissionV4>;
  removeAttachedMedia?: Maybe<RemoveAttachedMedia>;
  renewMediaUploadIntent?: Maybe<RenewMediaUploadIntent>;
  reorderSubmissionMediaV3?: Maybe<ReorderSubmissionMediaV3>;
  revokePublicMediaV4?: Maybe<RevokePublicMediaV4>;
  revokeToken?: Maybe<Revoke>;
  tokenAuth?: Maybe<ObtainJsonWebToken>;
  verifyMediaUploadIntent?: Maybe<VerifyMediaUploadIntent>;
  verifyToken?: Maybe<Verify>;
  withdrawSubmissionV4?: Maybe<WithdrawSubmissionV4>;
};


export type MutationApproveRequestArgs = {
  id?: InputMaybe<Scalars['ID']['input']>;
  input: RequestApproveInput;
};


export type MutationApproveSubmissionV4Args = {
  idempotencyKey: Scalars['String']['input'];
  input?: InputMaybe<ReviewSubmissionV4Input>;
  submissionId: Scalars['ID']['input'];
};


export type MutationAttachVerifiedMediaArgs = {
  idempotencyKey: Scalars['String']['input'];
  intentId: Scalars['ID']['input'];
};


export type MutationCleanupMediaUploadIntentArgs = {
  idempotencyKey: Scalars['String']['input'];
  intentId: Scalars['ID']['input'];
};


export type MutationCreateImageArgs = {
  input: ImageInput;
};


export type MutationCreateMediaUploadIntentArgs = {
  idempotencyKey: Scalars['String']['input'];
  input: CreateMediaUploadIntentInput;
};


export type MutationCreateRequestArgs = {
  input: RequestInput;
};


export type MutationCreateSubmissionV3Args = {
  idempotencyKey: Scalars['String']['input'];
  input: SubmissionV3Input;
};


export type MutationDeleteRequestArgs = {
  id?: InputMaybe<Scalars['ID']['input']>;
};


export type MutationEditSubmissionV3Args = {
  idempotencyKey: Scalars['String']['input'];
  input: SubmissionV3Input;
  submissionId: Scalars['ID']['input'];
};


export type MutationExpireMediaUploadIntentArgs = {
  idempotencyKey: Scalars['String']['input'];
  intentId: Scalars['ID']['input'];
};


export type MutationFinalizeSubmissionV3Args = {
  idempotencyKey: Scalars['String']['input'];
  submissionId: Scalars['ID']['input'];
};


export type MutationIssueMediaUploadIntentArgs = {
  idempotencyKey: Scalars['String']['input'];
  intentId: Scalars['ID']['input'];
};


export type MutationRefreshTokenArgs = {
  refreshToken?: InputMaybe<Scalars['String']['input']>;
};


export type MutationRejectSubmissionV4Args = {
  idempotencyKey: Scalars['String']['input'];
  input?: InputMaybe<ReviewSubmissionV4Input>;
  submissionId: Scalars['ID']['input'];
};


export type MutationRemoveAttachedMediaArgs = {
  idempotencyKey: Scalars['String']['input'];
  intentId: Scalars['ID']['input'];
};


export type MutationRenewMediaUploadIntentArgs = {
  idempotencyKey: Scalars['String']['input'];
  intentId: Scalars['ID']['input'];
};


export type MutationReorderSubmissionMediaV3Args = {
  attachmentIds: Array<Scalars['ID']['input']>;
  idempotencyKey: Scalars['String']['input'];
  submissionId: Scalars['ID']['input'];
};


export type MutationRevokePublicMediaV4Args = {
  idempotencyKey: Scalars['String']['input'];
  publicId: Scalars['UUID']['input'];
};


export type MutationRevokeTokenArgs = {
  refreshToken?: InputMaybe<Scalars['String']['input']>;
};


export type MutationTokenAuthArgs = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
};


export type MutationVerifyMediaUploadIntentArgs = {
  idempotencyKey: Scalars['String']['input'];
  intentId: Scalars['ID']['input'];
};


export type MutationVerifyTokenArgs = {
  token: Scalars['String']['input'];
};


export type MutationWithdrawSubmissionV4Args = {
  idempotencyKey: Scalars['String']['input'];
  submissionId: Scalars['ID']['input'];
};

export type ObtainJsonWebToken = {
  __typename?: 'ObtainJSONWebToken';
  payload: Scalars['GenericScalar']['output'];
  refreshExpiresIn: Scalars['Int']['output'];
  refreshToken: Scalars['String']['output'];
  token: Scalars['String']['output'];
  user?: Maybe<UserType>;
};

export type PlaceType = {
  __typename?: 'PlaceType';
  address: AddressType;
  category: CategoryType;
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  imageSet: Array<ImageType>;
  media: Array<PublicMediaRenditionType>;
  name: Scalars['String']['output'];
  tags: Array<TagType>;
  website?: Maybe<Scalars['String']['output']>;
};

export type PublicMediaRenditionType = {
  __typename?: 'PublicMediaRenditionType';
  byteSize: Scalars['Int']['output'];
  height: Scalars['Int']['output'];
  mimeType: Scalars['String']['output'];
  position: Scalars['Int']['output'];
  publicId: Scalars['UUID']['output'];
  url: Scalars['String']['output'];
  width: Scalars['Int']['output'];
};

export type Query = {
  __typename?: 'Query';
  addresses?: Maybe<Array<Maybe<AddressType>>>;
  categories?: Maybe<Array<Maybe<CategoryType>>>;
  images?: Maybe<Array<Maybe<ImageType>>>;
  mediaAttachmentPreviewV3?: Maybe<MediaPreviewAuthorization>;
  moderationQueueV4: ModerationQueuePageV4;
  placeById?: Maybe<PlaceType>;
  /** @deprecated Unbounded; use GET /api/v1/places/search/ for name search or GET /api/v1/places/ for viewport reads. */
  places?: Maybe<Array<Maybe<PlaceType>>>;
  placesByName?: Maybe<Array<Maybe<PlaceType>>>;
  placesNames?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  placesStartwithName?: Maybe<Array<Maybe<PlaceType>>>;
  requestById?: Maybe<RequestType>;
  requests?: Maybe<Array<Maybe<RequestType>>>;
  requestsByName?: Maybe<RequestType>;
  requestsToApprove?: Maybe<Array<Maybe<RequestType>>>;
  s3PresignedUrl?: Maybe<Scalars['JSONString']['output']>;
  submissionMediaStateV3?: Maybe<SubmissionMediaStateType>;
  tags?: Maybe<Array<Maybe<TagType>>>;
};


export type QueryMediaAttachmentPreviewV3Args = {
  attachmentId: Scalars['ID']['input'];
};


export type QueryModerationQueueV4Args = {
  after?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryPlaceByIdArgs = {
  id?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryPlacesByNameArgs = {
  name?: InputMaybe<Scalars['String']['input']>;
};


export type QueryPlacesStartwithNameArgs = {
  name?: InputMaybe<Scalars['String']['input']>;
};


export type QueryRequestByIdArgs = {
  id?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryRequestsByNameArgs = {
  name?: InputMaybe<Scalars['String']['input']>;
};


export type QuerySubmissionMediaStateV3Args = {
  submissionId: Scalars['ID']['input'];
};

export type Refresh = {
  __typename?: 'Refresh';
  payload: Scalars['GenericScalar']['output'];
  refreshExpiresIn: Scalars['Int']['output'];
  refreshToken: Scalars['String']['output'];
  token: Scalars['String']['output'];
};

export type RejectSubmissionV4 = {
  __typename?: 'RejectSubmissionV4';
  replayed: Scalars['Boolean']['output'];
  submission: RequestType;
};

export type RemoveAttachedMedia = {
  __typename?: 'RemoveAttachedMedia';
  intent: MediaUploadIntentType;
  replayed: Scalars['Boolean']['output'];
};

export type RenewMediaUploadIntent = {
  __typename?: 'RenewMediaUploadIntent';
  intent: MediaUploadIntentType;
  replayed: Scalars['Boolean']['output'];
  upload: MediaUploadAuthorization;
};

export type ReorderSubmissionMediaV3 = {
  __typename?: 'ReorderSubmissionMediaV3';
  orderedAttachmentIds: Array<Scalars['ID']['output']>;
  replayed: Scalars['Boolean']['output'];
};

export type RequestApproveInput = {
  approvedComment?: InputMaybe<Scalars['String']['input']>;
};

export type RequestInput = {
  addressString?: InputMaybe<Scalars['String']['input']>;
  category?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  website?: InputMaybe<Scalars['String']['input']>;
};

export type RequestType = {
  __typename?: 'RequestType';
  address: AddressType;
  approved: Scalars['Boolean']['output'];
  /** Deprecated compatibility field containing the reviewer ID. */
  approvedBy?: Maybe<Scalars['String']['output']>;
  approvedComment?: Maybe<Scalars['String']['output']>;
  /** Pending managed attachment identities in display order. Use each ID with mediaAttachmentPreviewV3; storage metadata is never exposed. */
  attachments: Array<ModerationMediaAttachmentV4>;
  category: CategoryType;
  dateApproved?: Maybe<Scalars['DateTime']['output']>;
  dateCreated: Scalars['DateTime']['output'];
  dateUpdated: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  /** Deprecated compatibility field containing the owner ID. */
  requestedBy?: Maybe<Scalars['String']['output']>;
  state: Scalars['String']['output'];
  tags: Array<Scalars['String']['output']>;
  website?: Maybe<Scalars['String']['output']>;
};

export type ReviewSubmissionV4Input = {
  comment?: InputMaybe<Scalars['String']['input']>;
};

export type Revoke = {
  __typename?: 'Revoke';
  revoked: Scalars['Int']['output'];
};

export type RevokePublicMediaV4 = {
  __typename?: 'RevokePublicMediaV4';
  publicId: Scalars['UUID']['output'];
  replayed: Scalars['Boolean']['output'];
  state: Scalars['String']['output'];
};

/** Owner-safe resume read model: no bucket, key, credential, or owner id. */
export type SubmissionMediaStateType = {
  __typename?: 'SubmissionMediaStateType';
  attachments: Array<ManagedMediaAttachmentType>;
  mediaIntents: Array<MediaUploadIntentType>;
  submission: SubmissionV3SnapshotType;
};

export type SubmissionV3Input = {
  addressLabel?: InputMaybe<Scalars['String']['input']>;
  categorySlug: Scalars['String']['input'];
  description?: InputMaybe<Scalars['String']['input']>;
  latitude: Scalars['Float']['input'];
  longitude: Scalars['Float']['input'];
  name: Scalars['String']['input'];
  tags?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  website?: InputMaybe<Scalars['String']['input']>;
};

export type SubmissionV3SnapshotType = {
  __typename?: 'SubmissionV3SnapshotType';
  addressLabel?: Maybe<Scalars['String']['output']>;
  categorySlug: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  latitude: Scalars['Float']['output'];
  longitude: Scalars['Float']['output'];
  name: Scalars['String']['output'];
  state: Scalars['String']['output'];
  tags: Array<Scalars['String']['output']>;
  website?: Maybe<Scalars['String']['output']>;
};

export type TagType = {
  __typename?: 'TagType';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

export type UserType = {
  __typename?: 'UserType';
  email: Scalars['String']['output'];
  image: Scalars['String']['output'];
  name: Scalars['String']['output'];
  role?: Maybe<Scalars['String']['output']>;
};

export type Verify = {
  __typename?: 'Verify';
  payload: Scalars['GenericScalar']['output'];
};

export type VerifyMediaUploadIntent = {
  __typename?: 'VerifyMediaUploadIntent';
  intent: MediaUploadIntentType;
  replayed: Scalars['Boolean']['output'];
};

export type WithdrawSubmissionV4 = {
  __typename?: 'WithdrawSubmissionV4';
  replayed: Scalars['Boolean']['output'];
  submission: RequestType;
};

export type GetAllCategoriesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetAllCategoriesQuery = { __typename?: 'Query', categories?: Array<{ __typename?: 'CategoryType', id: string, slug: string, name: string, description?: string | null } | null> | null };

export type CreateSubmissionV3MutationVariables = Exact<{
  input: SubmissionV3Input;
  idempotencyKey: Scalars['String']['input'];
}>;


export type CreateSubmissionV3Mutation = { __typename?: 'Mutation', createSubmissionV3?: { __typename?: 'CreateSubmissionV3', submission: { __typename?: 'RequestType', id: string, state: string } } | null };

export type FinalizeSubmissionV3MutationVariables = Exact<{
  submissionId: Scalars['ID']['input'];
  idempotencyKey: Scalars['String']['input'];
}>;


export type FinalizeSubmissionV3Mutation = { __typename?: 'Mutation', finalizeSubmissionV3?: { __typename?: 'FinalizeSubmissionV3', submission: { __typename?: 'SubmissionV3SnapshotType', id: string, state: string } } | null };

export type CreateMediaUploadIntentMutationVariables = Exact<{
  idempotencyKey: Scalars['String']['input'];
  input: CreateMediaUploadIntentInput;
}>;


export type CreateMediaUploadIntentMutation = { __typename?: 'Mutation', createMediaUploadIntent?: { __typename?: 'CreateMediaUploadIntent', replayed: boolean, intent: { __typename?: 'MediaUploadIntentType', id: string, submissionId: string, state: string, slot: number, failureCode: string } } | null };

export type IssueMediaUploadIntentMutationVariables = Exact<{
  intentId: Scalars['ID']['input'];
  idempotencyKey: Scalars['String']['input'];
}>;


export type IssueMediaUploadIntentMutation = { __typename?: 'Mutation', issueMediaUploadIntent?: { __typename?: 'IssueMediaUploadIntent', replayed: boolean, intent: { __typename?: 'MediaUploadIntentType', id: string, submissionId: string, state: string, slot: number, failureCode: string }, upload: { __typename?: 'MediaUploadAuthorization', url: string, fields: any, expiresAt: Date } } | null };

export type RenewMediaUploadIntentMutationVariables = Exact<{
  intentId: Scalars['ID']['input'];
  idempotencyKey: Scalars['String']['input'];
}>;


export type RenewMediaUploadIntentMutation = { __typename?: 'Mutation', renewMediaUploadIntent?: { __typename?: 'RenewMediaUploadIntent', replayed: boolean, intent: { __typename?: 'MediaUploadIntentType', id: string, submissionId: string, state: string, slot: number, failureCode: string }, upload: { __typename?: 'MediaUploadAuthorization', url: string, fields: any, expiresAt: Date } } | null };

export type VerifyMediaUploadIntentMutationVariables = Exact<{
  intentId: Scalars['ID']['input'];
  idempotencyKey: Scalars['String']['input'];
}>;


export type VerifyMediaUploadIntentMutation = { __typename?: 'Mutation', verifyMediaUploadIntent?: { __typename?: 'VerifyMediaUploadIntent', replayed: boolean, intent: { __typename?: 'MediaUploadIntentType', id: string, submissionId: string, state: string, slot: number, failureCode: string } } | null };

export type AttachVerifiedMediaMutationVariables = Exact<{
  intentId: Scalars['ID']['input'];
  idempotencyKey: Scalars['String']['input'];
}>;


export type AttachVerifiedMediaMutation = { __typename?: 'Mutation', attachVerifiedMedia?: { __typename?: 'AttachVerifiedMedia', replayed: boolean, attachment: { __typename?: 'ManagedMediaAttachmentType', id: string, submissionId: string, position?: number | null, state: string } } | null };

export type RemoveAttachedMediaMutationVariables = Exact<{
  intentId: Scalars['ID']['input'];
  idempotencyKey: Scalars['String']['input'];
}>;


export type RemoveAttachedMediaMutation = { __typename?: 'Mutation', removeAttachedMedia?: { __typename?: 'RemoveAttachedMedia', replayed: boolean, intent: { __typename?: 'MediaUploadIntentType', id: string, submissionId: string, state: string, slot: number, failureCode: string } } | null };

export type ExpireMediaUploadIntentMutationVariables = Exact<{
  intentId: Scalars['ID']['input'];
  idempotencyKey: Scalars['String']['input'];
}>;


export type ExpireMediaUploadIntentMutation = { __typename?: 'Mutation', expireMediaUploadIntent?: { __typename?: 'ExpireMediaUploadIntent', replayed: boolean, intent: { __typename?: 'MediaUploadIntentType', id: string, submissionId: string, state: string, slot: number, failureCode: string } } | null };

export type MediaAttachmentPreviewV3QueryVariables = Exact<{
  attachmentId: Scalars['ID']['input'];
}>;


export type MediaAttachmentPreviewV3Query = { __typename?: 'Query', mediaAttachmentPreviewV3?: { __typename?: 'MediaPreviewAuthorization', url: string, expiresAt: Date } | null };

export type SubmissionV3SnapshotFieldsFragment = { __typename?: 'SubmissionV3SnapshotType', id: string, state: string, name: string, categorySlug: string, longitude: number, latitude: number, addressLabel?: string | null, tags: Array<string>, description?: string | null, website?: string | null };

export type EditSubmissionV3MutationVariables = Exact<{
  submissionId: Scalars['ID']['input'];
  idempotencyKey: Scalars['String']['input'];
  input: SubmissionV3Input;
}>;


export type EditSubmissionV3Mutation = { __typename?: 'Mutation', editSubmissionV3?: { __typename?: 'EditSubmissionV3', replayed: boolean, submission: { __typename?: 'SubmissionV3SnapshotType', id: string, state: string, name: string, categorySlug: string, longitude: number, latitude: number, addressLabel?: string | null, tags: Array<string>, description?: string | null, website?: string | null } } | null };

export type ReorderSubmissionMediaV3MutationVariables = Exact<{
  submissionId: Scalars['ID']['input'];
  idempotencyKey: Scalars['String']['input'];
  attachmentIds: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
}>;


export type ReorderSubmissionMediaV3Mutation = { __typename?: 'Mutation', reorderSubmissionMediaV3?: { __typename?: 'ReorderSubmissionMediaV3', orderedAttachmentIds: Array<string>, replayed: boolean } | null };

export type SubmissionMediaStateV3QueryVariables = Exact<{
  submissionId: Scalars['ID']['input'];
}>;


export type SubmissionMediaStateV3Query = { __typename?: 'Query', submissionMediaStateV3?: { __typename?: 'SubmissionMediaStateType', submission: { __typename?: 'SubmissionV3SnapshotType', id: string, state: string, name: string, categorySlug: string, longitude: number, latitude: number, addressLabel?: string | null, tags: Array<string>, description?: string | null, website?: string | null }, attachments: Array<{ __typename?: 'ManagedMediaAttachmentType', id: string, submissionId: string, position?: number | null, state: string, mediaIntentId: string }>, mediaIntents: Array<{ __typename?: 'MediaUploadIntentType', id: string, submissionId: string, state: string, slot: number, failureCode: string }> } | null };

export type GetAllRequestsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetAllRequestsQuery = { __typename?: 'Query', requests?: Array<{ __typename?: 'RequestType', id: string, name: string, description?: string | null, tags: Array<string>, category: { __typename?: 'CategoryType', name: string }, address: { __typename?: 'AddressType', properties?: { __typename?: 'AddressProperties', addressString?: string | null } | null, geometry: { __typename?: 'GeometryObjectType', coordinates?: any | null } } } | null> | null };

export type ModerationQueueV4QueryVariables = Exact<{
  first: Scalars['Int']['input'];
  after?: InputMaybe<Scalars['String']['input']>;
}>;


export type ModerationQueueV4Query = { __typename?: 'Query', moderationQueueV4: { __typename?: 'ModerationQueuePageV4', hasNextPage: boolean, nextCursor?: string | null, items: Array<{ __typename?: 'RequestType', id: string, name: string, description?: string | null, tags: Array<string>, website?: string | null, dateCreated: Date, state: string, requestedBy?: string | null, category: { __typename?: 'CategoryType', name: string }, address: { __typename?: 'AddressType', properties?: { __typename?: 'AddressProperties', addressString?: string | null } | null, geometry: { __typename?: 'GeometryObjectType', coordinates?: any | null } }, attachments: Array<{ __typename?: 'ModerationMediaAttachmentV4', id: string, position: number }> }> } };

export type CreateRequestMutationVariables = Exact<{
  input: RequestInput;
}>;


export type CreateRequestMutation = { __typename?: 'Mutation', createRequest?: { __typename?: 'CreateRequest', request?: { __typename?: 'RequestType', id: string, name: string, description?: string | null, tags: Array<string>, dateCreated: Date, category: { __typename?: 'CategoryType', name: string }, address: { __typename?: 'AddressType', properties?: { __typename?: 'AddressProperties', addressString?: string | null } | null, geometry: { __typename?: 'GeometryObjectType', coordinates?: any | null } } } | null } | null };

export type ApproveSubmissionV4MutationVariables = Exact<{
  submissionId: Scalars['ID']['input'];
  idempotencyKey: Scalars['String']['input'];
  input: ReviewSubmissionV4Input;
}>;


export type ApproveSubmissionV4Mutation = { __typename?: 'Mutation', approveSubmissionV4?: { __typename?: 'ApproveSubmissionV4', replayed: boolean, submission: { __typename?: 'RequestType', id: string, state: string }, place: { __typename?: 'PlaceType', id: string } } | null };

export type DeleteRequestMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteRequestMutation = { __typename?: 'Mutation', deleteRequest?: { __typename?: 'DeleteRequest', ok?: boolean | null } | null };

export type GetS3PresignedUrlQueryVariables = Exact<{ [key: string]: never; }>;


export type GetS3PresignedUrlQuery = { __typename?: 'Query', s3PresignedUrl?: any | null };

export type CreateImageMutationVariables = Exact<{
  input: ImageInput;
}>;


export type CreateImageMutation = { __typename?: 'Mutation', createImage?: { __typename?: 'CreateImage', image?: { __typename?: 'ImageType', name: string, url: string } | null } | null };

export type GetPlaceByIdQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetPlaceByIdQuery = { __typename?: 'Query', placeById?: { __typename?: 'PlaceType', id: string, name: string, description?: string | null, address: { __typename?: 'AddressType', properties?: { __typename?: 'AddressProperties', addressString?: string | null } | null, geometry: { __typename?: 'GeometryObjectType', coordinates?: any | null } }, category: { __typename?: 'CategoryType', name: string }, media: Array<{ __typename?: 'PublicMediaRenditionType', publicId: string, url: string, position: number, mimeType: string, byteSize: number, width: number, height: number }> } | null };

export type LoginMutationVariables = Exact<{
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
}>;


export type LoginMutation = { __typename?: 'Mutation', tokenAuth?: { __typename?: 'ObtainJSONWebToken', payload: any, token: string, refreshExpiresIn: number, refreshToken: string, user?: { __typename?: 'UserType', name: string, email: string, role?: string | null, image: string } | null } | null };

export type SilentTokenRefreshMutationVariables = Exact<{ [key: string]: never; }>;


export type SilentTokenRefreshMutation = { __typename?: 'Mutation', refreshToken?: { __typename?: 'Refresh', payload: any, token: string, refreshExpiresIn: number, refreshToken: string } | null };

export const SubmissionV3SnapshotFieldsFragmentDoc = gql`
    fragment SubmissionV3SnapshotFields on SubmissionV3SnapshotType {
  id
  state
  name
  categorySlug
  longitude
  latitude
  addressLabel
  tags
  description
  website
}
    `;
export const GetAllCategoriesDocument = gql`
    query GetAllCategories {
  categories {
    id
    slug
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
export const CreateSubmissionV3Document = gql`
    mutation CreateSubmissionV3($input: SubmissionV3Input!, $idempotencyKey: String!) {
  createSubmissionV3(input: $input, idempotencyKey: $idempotencyKey) {
    submission {
      id
      state
    }
  }
}
    `;
export type CreateSubmissionV3MutationFn = Apollo.MutationFunction<CreateSubmissionV3Mutation, CreateSubmissionV3MutationVariables>;

/**
 * __useCreateSubmissionV3Mutation__
 *
 * To run a mutation, you first call `useCreateSubmissionV3Mutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateSubmissionV3Mutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createSubmissionV3Mutation, { data, loading, error }] = useCreateSubmissionV3Mutation({
 *   variables: {
 *      input: // value for 'input'
 *      idempotencyKey: // value for 'idempotencyKey'
 *   },
 * });
 */
export function useCreateSubmissionV3Mutation(baseOptions?: Apollo.MutationHookOptions<CreateSubmissionV3Mutation, CreateSubmissionV3MutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateSubmissionV3Mutation, CreateSubmissionV3MutationVariables>(CreateSubmissionV3Document, options);
      }
export type CreateSubmissionV3MutationHookResult = ReturnType<typeof useCreateSubmissionV3Mutation>;
export type CreateSubmissionV3MutationResult = Apollo.MutationResult<CreateSubmissionV3Mutation>;
export type CreateSubmissionV3MutationOptions = Apollo.BaseMutationOptions<CreateSubmissionV3Mutation, CreateSubmissionV3MutationVariables>;
export const FinalizeSubmissionV3Document = gql`
    mutation FinalizeSubmissionV3($submissionId: ID!, $idempotencyKey: String!) {
  finalizeSubmissionV3(
    submissionId: $submissionId
    idempotencyKey: $idempotencyKey
  ) {
    submission {
      id
      state
    }
  }
}
    `;
export type FinalizeSubmissionV3MutationFn = Apollo.MutationFunction<FinalizeSubmissionV3Mutation, FinalizeSubmissionV3MutationVariables>;

/**
 * __useFinalizeSubmissionV3Mutation__
 *
 * To run a mutation, you first call `useFinalizeSubmissionV3Mutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useFinalizeSubmissionV3Mutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [finalizeSubmissionV3Mutation, { data, loading, error }] = useFinalizeSubmissionV3Mutation({
 *   variables: {
 *      submissionId: // value for 'submissionId'
 *      idempotencyKey: // value for 'idempotencyKey'
 *   },
 * });
 */
export function useFinalizeSubmissionV3Mutation(baseOptions?: Apollo.MutationHookOptions<FinalizeSubmissionV3Mutation, FinalizeSubmissionV3MutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<FinalizeSubmissionV3Mutation, FinalizeSubmissionV3MutationVariables>(FinalizeSubmissionV3Document, options);
      }
export type FinalizeSubmissionV3MutationHookResult = ReturnType<typeof useFinalizeSubmissionV3Mutation>;
export type FinalizeSubmissionV3MutationResult = Apollo.MutationResult<FinalizeSubmissionV3Mutation>;
export type FinalizeSubmissionV3MutationOptions = Apollo.BaseMutationOptions<FinalizeSubmissionV3Mutation, FinalizeSubmissionV3MutationVariables>;
export const CreateMediaUploadIntentDocument = gql`
    mutation CreateMediaUploadIntent($idempotencyKey: String!, $input: CreateMediaUploadIntentInput!) {
  createMediaUploadIntent(idempotencyKey: $idempotencyKey, input: $input) {
    intent {
      id
      submissionId
      state
      slot
      failureCode
    }
    replayed
  }
}
    `;
export type CreateMediaUploadIntentMutationFn = Apollo.MutationFunction<CreateMediaUploadIntentMutation, CreateMediaUploadIntentMutationVariables>;

/**
 * __useCreateMediaUploadIntentMutation__
 *
 * To run a mutation, you first call `useCreateMediaUploadIntentMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateMediaUploadIntentMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createMediaUploadIntentMutation, { data, loading, error }] = useCreateMediaUploadIntentMutation({
 *   variables: {
 *      idempotencyKey: // value for 'idempotencyKey'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateMediaUploadIntentMutation(baseOptions?: Apollo.MutationHookOptions<CreateMediaUploadIntentMutation, CreateMediaUploadIntentMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateMediaUploadIntentMutation, CreateMediaUploadIntentMutationVariables>(CreateMediaUploadIntentDocument, options);
      }
export type CreateMediaUploadIntentMutationHookResult = ReturnType<typeof useCreateMediaUploadIntentMutation>;
export type CreateMediaUploadIntentMutationResult = Apollo.MutationResult<CreateMediaUploadIntentMutation>;
export type CreateMediaUploadIntentMutationOptions = Apollo.BaseMutationOptions<CreateMediaUploadIntentMutation, CreateMediaUploadIntentMutationVariables>;
export const IssueMediaUploadIntentDocument = gql`
    mutation IssueMediaUploadIntent($intentId: ID!, $idempotencyKey: String!) {
  issueMediaUploadIntent(intentId: $intentId, idempotencyKey: $idempotencyKey) {
    intent {
      id
      submissionId
      state
      slot
      failureCode
    }
    upload {
      url
      fields
      expiresAt
    }
    replayed
  }
}
    `;
export type IssueMediaUploadIntentMutationFn = Apollo.MutationFunction<IssueMediaUploadIntentMutation, IssueMediaUploadIntentMutationVariables>;

/**
 * __useIssueMediaUploadIntentMutation__
 *
 * To run a mutation, you first call `useIssueMediaUploadIntentMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useIssueMediaUploadIntentMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [issueMediaUploadIntentMutation, { data, loading, error }] = useIssueMediaUploadIntentMutation({
 *   variables: {
 *      intentId: // value for 'intentId'
 *      idempotencyKey: // value for 'idempotencyKey'
 *   },
 * });
 */
export function useIssueMediaUploadIntentMutation(baseOptions?: Apollo.MutationHookOptions<IssueMediaUploadIntentMutation, IssueMediaUploadIntentMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<IssueMediaUploadIntentMutation, IssueMediaUploadIntentMutationVariables>(IssueMediaUploadIntentDocument, options);
      }
export type IssueMediaUploadIntentMutationHookResult = ReturnType<typeof useIssueMediaUploadIntentMutation>;
export type IssueMediaUploadIntentMutationResult = Apollo.MutationResult<IssueMediaUploadIntentMutation>;
export type IssueMediaUploadIntentMutationOptions = Apollo.BaseMutationOptions<IssueMediaUploadIntentMutation, IssueMediaUploadIntentMutationVariables>;
export const RenewMediaUploadIntentDocument = gql`
    mutation RenewMediaUploadIntent($intentId: ID!, $idempotencyKey: String!) {
  renewMediaUploadIntent(intentId: $intentId, idempotencyKey: $idempotencyKey) {
    intent {
      id
      submissionId
      state
      slot
      failureCode
    }
    upload {
      url
      fields
      expiresAt
    }
    replayed
  }
}
    `;
export type RenewMediaUploadIntentMutationFn = Apollo.MutationFunction<RenewMediaUploadIntentMutation, RenewMediaUploadIntentMutationVariables>;

/**
 * __useRenewMediaUploadIntentMutation__
 *
 * To run a mutation, you first call `useRenewMediaUploadIntentMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRenewMediaUploadIntentMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [renewMediaUploadIntentMutation, { data, loading, error }] = useRenewMediaUploadIntentMutation({
 *   variables: {
 *      intentId: // value for 'intentId'
 *      idempotencyKey: // value for 'idempotencyKey'
 *   },
 * });
 */
export function useRenewMediaUploadIntentMutation(baseOptions?: Apollo.MutationHookOptions<RenewMediaUploadIntentMutation, RenewMediaUploadIntentMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RenewMediaUploadIntentMutation, RenewMediaUploadIntentMutationVariables>(RenewMediaUploadIntentDocument, options);
      }
export type RenewMediaUploadIntentMutationHookResult = ReturnType<typeof useRenewMediaUploadIntentMutation>;
export type RenewMediaUploadIntentMutationResult = Apollo.MutationResult<RenewMediaUploadIntentMutation>;
export type RenewMediaUploadIntentMutationOptions = Apollo.BaseMutationOptions<RenewMediaUploadIntentMutation, RenewMediaUploadIntentMutationVariables>;
export const VerifyMediaUploadIntentDocument = gql`
    mutation VerifyMediaUploadIntent($intentId: ID!, $idempotencyKey: String!) {
  verifyMediaUploadIntent(intentId: $intentId, idempotencyKey: $idempotencyKey) {
    intent {
      id
      submissionId
      state
      slot
      failureCode
    }
    replayed
  }
}
    `;
export type VerifyMediaUploadIntentMutationFn = Apollo.MutationFunction<VerifyMediaUploadIntentMutation, VerifyMediaUploadIntentMutationVariables>;

/**
 * __useVerifyMediaUploadIntentMutation__
 *
 * To run a mutation, you first call `useVerifyMediaUploadIntentMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useVerifyMediaUploadIntentMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [verifyMediaUploadIntentMutation, { data, loading, error }] = useVerifyMediaUploadIntentMutation({
 *   variables: {
 *      intentId: // value for 'intentId'
 *      idempotencyKey: // value for 'idempotencyKey'
 *   },
 * });
 */
export function useVerifyMediaUploadIntentMutation(baseOptions?: Apollo.MutationHookOptions<VerifyMediaUploadIntentMutation, VerifyMediaUploadIntentMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<VerifyMediaUploadIntentMutation, VerifyMediaUploadIntentMutationVariables>(VerifyMediaUploadIntentDocument, options);
      }
export type VerifyMediaUploadIntentMutationHookResult = ReturnType<typeof useVerifyMediaUploadIntentMutation>;
export type VerifyMediaUploadIntentMutationResult = Apollo.MutationResult<VerifyMediaUploadIntentMutation>;
export type VerifyMediaUploadIntentMutationOptions = Apollo.BaseMutationOptions<VerifyMediaUploadIntentMutation, VerifyMediaUploadIntentMutationVariables>;
export const AttachVerifiedMediaDocument = gql`
    mutation AttachVerifiedMedia($intentId: ID!, $idempotencyKey: String!) {
  attachVerifiedMedia(intentId: $intentId, idempotencyKey: $idempotencyKey) {
    attachment {
      id
      submissionId
      position
      state
    }
    replayed
  }
}
    `;
export type AttachVerifiedMediaMutationFn = Apollo.MutationFunction<AttachVerifiedMediaMutation, AttachVerifiedMediaMutationVariables>;

/**
 * __useAttachVerifiedMediaMutation__
 *
 * To run a mutation, you first call `useAttachVerifiedMediaMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAttachVerifiedMediaMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [attachVerifiedMediaMutation, { data, loading, error }] = useAttachVerifiedMediaMutation({
 *   variables: {
 *      intentId: // value for 'intentId'
 *      idempotencyKey: // value for 'idempotencyKey'
 *   },
 * });
 */
export function useAttachVerifiedMediaMutation(baseOptions?: Apollo.MutationHookOptions<AttachVerifiedMediaMutation, AttachVerifiedMediaMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<AttachVerifiedMediaMutation, AttachVerifiedMediaMutationVariables>(AttachVerifiedMediaDocument, options);
      }
export type AttachVerifiedMediaMutationHookResult = ReturnType<typeof useAttachVerifiedMediaMutation>;
export type AttachVerifiedMediaMutationResult = Apollo.MutationResult<AttachVerifiedMediaMutation>;
export type AttachVerifiedMediaMutationOptions = Apollo.BaseMutationOptions<AttachVerifiedMediaMutation, AttachVerifiedMediaMutationVariables>;
export const RemoveAttachedMediaDocument = gql`
    mutation RemoveAttachedMedia($intentId: ID!, $idempotencyKey: String!) {
  removeAttachedMedia(intentId: $intentId, idempotencyKey: $idempotencyKey) {
    intent {
      id
      submissionId
      state
      slot
      failureCode
    }
    replayed
  }
}
    `;
export type RemoveAttachedMediaMutationFn = Apollo.MutationFunction<RemoveAttachedMediaMutation, RemoveAttachedMediaMutationVariables>;

/**
 * __useRemoveAttachedMediaMutation__
 *
 * To run a mutation, you first call `useRemoveAttachedMediaMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRemoveAttachedMediaMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [removeAttachedMediaMutation, { data, loading, error }] = useRemoveAttachedMediaMutation({
 *   variables: {
 *      intentId: // value for 'intentId'
 *      idempotencyKey: // value for 'idempotencyKey'
 *   },
 * });
 */
export function useRemoveAttachedMediaMutation(baseOptions?: Apollo.MutationHookOptions<RemoveAttachedMediaMutation, RemoveAttachedMediaMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RemoveAttachedMediaMutation, RemoveAttachedMediaMutationVariables>(RemoveAttachedMediaDocument, options);
      }
export type RemoveAttachedMediaMutationHookResult = ReturnType<typeof useRemoveAttachedMediaMutation>;
export type RemoveAttachedMediaMutationResult = Apollo.MutationResult<RemoveAttachedMediaMutation>;
export type RemoveAttachedMediaMutationOptions = Apollo.BaseMutationOptions<RemoveAttachedMediaMutation, RemoveAttachedMediaMutationVariables>;
export const ExpireMediaUploadIntentDocument = gql`
    mutation ExpireMediaUploadIntent($intentId: ID!, $idempotencyKey: String!) {
  expireMediaUploadIntent(intentId: $intentId, idempotencyKey: $idempotencyKey) {
    intent {
      id
      submissionId
      state
      slot
      failureCode
    }
    replayed
  }
}
    `;
export type ExpireMediaUploadIntentMutationFn = Apollo.MutationFunction<ExpireMediaUploadIntentMutation, ExpireMediaUploadIntentMutationVariables>;

/**
 * __useExpireMediaUploadIntentMutation__
 *
 * To run a mutation, you first call `useExpireMediaUploadIntentMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useExpireMediaUploadIntentMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [expireMediaUploadIntentMutation, { data, loading, error }] = useExpireMediaUploadIntentMutation({
 *   variables: {
 *      intentId: // value for 'intentId'
 *      idempotencyKey: // value for 'idempotencyKey'
 *   },
 * });
 */
export function useExpireMediaUploadIntentMutation(baseOptions?: Apollo.MutationHookOptions<ExpireMediaUploadIntentMutation, ExpireMediaUploadIntentMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ExpireMediaUploadIntentMutation, ExpireMediaUploadIntentMutationVariables>(ExpireMediaUploadIntentDocument, options);
      }
export type ExpireMediaUploadIntentMutationHookResult = ReturnType<typeof useExpireMediaUploadIntentMutation>;
export type ExpireMediaUploadIntentMutationResult = Apollo.MutationResult<ExpireMediaUploadIntentMutation>;
export type ExpireMediaUploadIntentMutationOptions = Apollo.BaseMutationOptions<ExpireMediaUploadIntentMutation, ExpireMediaUploadIntentMutationVariables>;
export const MediaAttachmentPreviewV3Document = gql`
    query MediaAttachmentPreviewV3($attachmentId: ID!) {
  mediaAttachmentPreviewV3(attachmentId: $attachmentId) {
    url
    expiresAt
  }
}
    `;

/**
 * __useMediaAttachmentPreviewV3Query__
 *
 * To run a query within a React component, call `useMediaAttachmentPreviewV3Query` and pass it any options that fit your needs.
 * When your component renders, `useMediaAttachmentPreviewV3Query` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMediaAttachmentPreviewV3Query({
 *   variables: {
 *      attachmentId: // value for 'attachmentId'
 *   },
 * });
 */
export function useMediaAttachmentPreviewV3Query(baseOptions: Apollo.QueryHookOptions<MediaAttachmentPreviewV3Query, MediaAttachmentPreviewV3QueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MediaAttachmentPreviewV3Query, MediaAttachmentPreviewV3QueryVariables>(MediaAttachmentPreviewV3Document, options);
      }
export function useMediaAttachmentPreviewV3LazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MediaAttachmentPreviewV3Query, MediaAttachmentPreviewV3QueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MediaAttachmentPreviewV3Query, MediaAttachmentPreviewV3QueryVariables>(MediaAttachmentPreviewV3Document, options);
        }
export function useMediaAttachmentPreviewV3SuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<MediaAttachmentPreviewV3Query, MediaAttachmentPreviewV3QueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<MediaAttachmentPreviewV3Query, MediaAttachmentPreviewV3QueryVariables>(MediaAttachmentPreviewV3Document, options);
        }
export type MediaAttachmentPreviewV3QueryHookResult = ReturnType<typeof useMediaAttachmentPreviewV3Query>;
export type MediaAttachmentPreviewV3LazyQueryHookResult = ReturnType<typeof useMediaAttachmentPreviewV3LazyQuery>;
export type MediaAttachmentPreviewV3SuspenseQueryHookResult = ReturnType<typeof useMediaAttachmentPreviewV3SuspenseQuery>;
export type MediaAttachmentPreviewV3QueryResult = Apollo.QueryResult<MediaAttachmentPreviewV3Query, MediaAttachmentPreviewV3QueryVariables>;
export const EditSubmissionV3Document = gql`
    mutation EditSubmissionV3($submissionId: ID!, $idempotencyKey: String!, $input: SubmissionV3Input!) {
  editSubmissionV3(
    submissionId: $submissionId
    idempotencyKey: $idempotencyKey
    input: $input
  ) {
    submission {
      ...SubmissionV3SnapshotFields
    }
    replayed
  }
}
    ${SubmissionV3SnapshotFieldsFragmentDoc}`;
export type EditSubmissionV3MutationFn = Apollo.MutationFunction<EditSubmissionV3Mutation, EditSubmissionV3MutationVariables>;

/**
 * __useEditSubmissionV3Mutation__
 *
 * To run a mutation, you first call `useEditSubmissionV3Mutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useEditSubmissionV3Mutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [editSubmissionV3Mutation, { data, loading, error }] = useEditSubmissionV3Mutation({
 *   variables: {
 *      submissionId: // value for 'submissionId'
 *      idempotencyKey: // value for 'idempotencyKey'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useEditSubmissionV3Mutation(baseOptions?: Apollo.MutationHookOptions<EditSubmissionV3Mutation, EditSubmissionV3MutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<EditSubmissionV3Mutation, EditSubmissionV3MutationVariables>(EditSubmissionV3Document, options);
      }
export type EditSubmissionV3MutationHookResult = ReturnType<typeof useEditSubmissionV3Mutation>;
export type EditSubmissionV3MutationResult = Apollo.MutationResult<EditSubmissionV3Mutation>;
export type EditSubmissionV3MutationOptions = Apollo.BaseMutationOptions<EditSubmissionV3Mutation, EditSubmissionV3MutationVariables>;
export const ReorderSubmissionMediaV3Document = gql`
    mutation ReorderSubmissionMediaV3($submissionId: ID!, $idempotencyKey: String!, $attachmentIds: [ID!]!) {
  reorderSubmissionMediaV3(
    submissionId: $submissionId
    idempotencyKey: $idempotencyKey
    attachmentIds: $attachmentIds
  ) {
    orderedAttachmentIds
    replayed
  }
}
    `;
export type ReorderSubmissionMediaV3MutationFn = Apollo.MutationFunction<ReorderSubmissionMediaV3Mutation, ReorderSubmissionMediaV3MutationVariables>;

/**
 * __useReorderSubmissionMediaV3Mutation__
 *
 * To run a mutation, you first call `useReorderSubmissionMediaV3Mutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useReorderSubmissionMediaV3Mutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [reorderSubmissionMediaV3Mutation, { data, loading, error }] = useReorderSubmissionMediaV3Mutation({
 *   variables: {
 *      submissionId: // value for 'submissionId'
 *      idempotencyKey: // value for 'idempotencyKey'
 *      attachmentIds: // value for 'attachmentIds'
 *   },
 * });
 */
export function useReorderSubmissionMediaV3Mutation(baseOptions?: Apollo.MutationHookOptions<ReorderSubmissionMediaV3Mutation, ReorderSubmissionMediaV3MutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ReorderSubmissionMediaV3Mutation, ReorderSubmissionMediaV3MutationVariables>(ReorderSubmissionMediaV3Document, options);
      }
export type ReorderSubmissionMediaV3MutationHookResult = ReturnType<typeof useReorderSubmissionMediaV3Mutation>;
export type ReorderSubmissionMediaV3MutationResult = Apollo.MutationResult<ReorderSubmissionMediaV3Mutation>;
export type ReorderSubmissionMediaV3MutationOptions = Apollo.BaseMutationOptions<ReorderSubmissionMediaV3Mutation, ReorderSubmissionMediaV3MutationVariables>;
export const SubmissionMediaStateV3Document = gql`
    query SubmissionMediaStateV3($submissionId: ID!) {
  submissionMediaStateV3(submissionId: $submissionId) {
    submission {
      ...SubmissionV3SnapshotFields
    }
    attachments {
      id
      submissionId
      position
      state
      mediaIntentId
    }
    mediaIntents {
      id
      submissionId
      state
      slot
      failureCode
    }
  }
}
    ${SubmissionV3SnapshotFieldsFragmentDoc}`;

/**
 * __useSubmissionMediaStateV3Query__
 *
 * To run a query within a React component, call `useSubmissionMediaStateV3Query` and pass it any options that fit your needs.
 * When your component renders, `useSubmissionMediaStateV3Query` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSubmissionMediaStateV3Query({
 *   variables: {
 *      submissionId: // value for 'submissionId'
 *   },
 * });
 */
export function useSubmissionMediaStateV3Query(baseOptions: Apollo.QueryHookOptions<SubmissionMediaStateV3Query, SubmissionMediaStateV3QueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<SubmissionMediaStateV3Query, SubmissionMediaStateV3QueryVariables>(SubmissionMediaStateV3Document, options);
      }
export function useSubmissionMediaStateV3LazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SubmissionMediaStateV3Query, SubmissionMediaStateV3QueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<SubmissionMediaStateV3Query, SubmissionMediaStateV3QueryVariables>(SubmissionMediaStateV3Document, options);
        }
export function useSubmissionMediaStateV3SuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<SubmissionMediaStateV3Query, SubmissionMediaStateV3QueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<SubmissionMediaStateV3Query, SubmissionMediaStateV3QueryVariables>(SubmissionMediaStateV3Document, options);
        }
export type SubmissionMediaStateV3QueryHookResult = ReturnType<typeof useSubmissionMediaStateV3Query>;
export type SubmissionMediaStateV3LazyQueryHookResult = ReturnType<typeof useSubmissionMediaStateV3LazyQuery>;
export type SubmissionMediaStateV3SuspenseQueryHookResult = ReturnType<typeof useSubmissionMediaStateV3SuspenseQuery>;
export type SubmissionMediaStateV3QueryResult = Apollo.QueryResult<SubmissionMediaStateV3Query, SubmissionMediaStateV3QueryVariables>;
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
export const ModerationQueueV4Document = gql`
    query ModerationQueueV4($first: Int!, $after: String) {
  moderationQueueV4(first: $first, after: $after) {
    items {
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
      attachments {
        id
        position
      }
      description
      tags
      website
      dateCreated
      state
      requestedBy
    }
    hasNextPage
    nextCursor
  }
}
    `;

/**
 * __useModerationQueueV4Query__
 *
 * To run a query within a React component, call `useModerationQueueV4Query` and pass it any options that fit your needs.
 * When your component renders, `useModerationQueueV4Query` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useModerationQueueV4Query({
 *   variables: {
 *      first: // value for 'first'
 *      after: // value for 'after'
 *   },
 * });
 */
export function useModerationQueueV4Query(baseOptions: Apollo.QueryHookOptions<ModerationQueueV4Query, ModerationQueueV4QueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ModerationQueueV4Query, ModerationQueueV4QueryVariables>(ModerationQueueV4Document, options);
      }
export function useModerationQueueV4LazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ModerationQueueV4Query, ModerationQueueV4QueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ModerationQueueV4Query, ModerationQueueV4QueryVariables>(ModerationQueueV4Document, options);
        }
export function useModerationQueueV4SuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ModerationQueueV4Query, ModerationQueueV4QueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ModerationQueueV4Query, ModerationQueueV4QueryVariables>(ModerationQueueV4Document, options);
        }
export type ModerationQueueV4QueryHookResult = ReturnType<typeof useModerationQueueV4Query>;
export type ModerationQueueV4LazyQueryHookResult = ReturnType<typeof useModerationQueueV4LazyQuery>;
export type ModerationQueueV4SuspenseQueryHookResult = ReturnType<typeof useModerationQueueV4SuspenseQuery>;
export type ModerationQueueV4QueryResult = Apollo.QueryResult<ModerationQueueV4Query, ModerationQueueV4QueryVariables>;
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
export const ApproveSubmissionV4Document = gql`
    mutation ApproveSubmissionV4($submissionId: ID!, $idempotencyKey: String!, $input: ReviewSubmissionV4Input!) {
  approveSubmissionV4(
    submissionId: $submissionId
    idempotencyKey: $idempotencyKey
    input: $input
  ) {
    submission {
      id
      state
    }
    place {
      id
    }
    replayed
  }
}
    `;
export type ApproveSubmissionV4MutationFn = Apollo.MutationFunction<ApproveSubmissionV4Mutation, ApproveSubmissionV4MutationVariables>;

/**
 * __useApproveSubmissionV4Mutation__
 *
 * To run a mutation, you first call `useApproveSubmissionV4Mutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useApproveSubmissionV4Mutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [approveSubmissionV4Mutation, { data, loading, error }] = useApproveSubmissionV4Mutation({
 *   variables: {
 *      submissionId: // value for 'submissionId'
 *      idempotencyKey: // value for 'idempotencyKey'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useApproveSubmissionV4Mutation(baseOptions?: Apollo.MutationHookOptions<ApproveSubmissionV4Mutation, ApproveSubmissionV4MutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ApproveSubmissionV4Mutation, ApproveSubmissionV4MutationVariables>(ApproveSubmissionV4Document, options);
      }
export type ApproveSubmissionV4MutationHookResult = ReturnType<typeof useApproveSubmissionV4Mutation>;
export type ApproveSubmissionV4MutationResult = Apollo.MutationResult<ApproveSubmissionV4Mutation>;
export type ApproveSubmissionV4MutationOptions = Apollo.BaseMutationOptions<ApproveSubmissionV4Mutation, ApproveSubmissionV4MutationVariables>;
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
export const GetS3PresignedUrlDocument = gql`
    query GetS3PresignedUrl {
  s3PresignedUrl
}
    `;

/**
 * __useGetS3PresignedUrlQuery__
 *
 * To run a query within a React component, call `useGetS3PresignedUrlQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetS3PresignedUrlQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetS3PresignedUrlQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetS3PresignedUrlQuery(baseOptions?: Apollo.QueryHookOptions<GetS3PresignedUrlQuery, GetS3PresignedUrlQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetS3PresignedUrlQuery, GetS3PresignedUrlQueryVariables>(GetS3PresignedUrlDocument, options);
      }
export function useGetS3PresignedUrlLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetS3PresignedUrlQuery, GetS3PresignedUrlQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetS3PresignedUrlQuery, GetS3PresignedUrlQueryVariables>(GetS3PresignedUrlDocument, options);
        }
export function useGetS3PresignedUrlSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetS3PresignedUrlQuery, GetS3PresignedUrlQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetS3PresignedUrlQuery, GetS3PresignedUrlQueryVariables>(GetS3PresignedUrlDocument, options);
        }
export type GetS3PresignedUrlQueryHookResult = ReturnType<typeof useGetS3PresignedUrlQuery>;
export type GetS3PresignedUrlLazyQueryHookResult = ReturnType<typeof useGetS3PresignedUrlLazyQuery>;
export type GetS3PresignedUrlSuspenseQueryHookResult = ReturnType<typeof useGetS3PresignedUrlSuspenseQuery>;
export type GetS3PresignedUrlQueryResult = Apollo.QueryResult<GetS3PresignedUrlQuery, GetS3PresignedUrlQueryVariables>;
export const CreateImageDocument = gql`
    mutation CreateImage($input: ImageInput!) {
  createImage(input: $input) {
    image {
      name
      url
    }
  }
}
    `;
export type CreateImageMutationFn = Apollo.MutationFunction<CreateImageMutation, CreateImageMutationVariables>;

/**
 * __useCreateImageMutation__
 *
 * To run a mutation, you first call `useCreateImageMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateImageMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createImageMutation, { data, loading, error }] = useCreateImageMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateImageMutation(baseOptions?: Apollo.MutationHookOptions<CreateImageMutation, CreateImageMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateImageMutation, CreateImageMutationVariables>(CreateImageDocument, options);
      }
export type CreateImageMutationHookResult = ReturnType<typeof useCreateImageMutation>;
export type CreateImageMutationResult = Apollo.MutationResult<CreateImageMutation>;
export type CreateImageMutationOptions = Apollo.BaseMutationOptions<CreateImageMutation, CreateImageMutationVariables>;
export const GetPlaceByIdDocument = gql`
    query GetPlaceById($id: ID!) {
  placeById(id: $id) {
    id
    name
    description
    address {
      properties {
        addressString
      }
      geometry {
        coordinates
      }
    }
    category {
      name
    }
    media {
      publicId
      url
      position
      mimeType
      byteSize
      width
      height
    }
  }
}
    `;

/**
 * __useGetPlaceByIdQuery__
 *
 * To run a query within a React component, call `useGetPlaceByIdQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetPlaceByIdQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetPlaceByIdQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetPlaceByIdQuery(baseOptions: Apollo.QueryHookOptions<GetPlaceByIdQuery, GetPlaceByIdQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetPlaceByIdQuery, GetPlaceByIdQueryVariables>(GetPlaceByIdDocument, options);
      }
export function useGetPlaceByIdLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetPlaceByIdQuery, GetPlaceByIdQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetPlaceByIdQuery, GetPlaceByIdQueryVariables>(GetPlaceByIdDocument, options);
        }
export function useGetPlaceByIdSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetPlaceByIdQuery, GetPlaceByIdQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetPlaceByIdQuery, GetPlaceByIdQueryVariables>(GetPlaceByIdDocument, options);
        }
export type GetPlaceByIdQueryHookResult = ReturnType<typeof useGetPlaceByIdQuery>;
export type GetPlaceByIdLazyQueryHookResult = ReturnType<typeof useGetPlaceByIdLazyQuery>;
export type GetPlaceByIdSuspenseQueryHookResult = ReturnType<typeof useGetPlaceByIdSuspenseQuery>;
export type GetPlaceByIdQueryResult = Apollo.QueryResult<GetPlaceByIdQuery, GetPlaceByIdQueryVariables>;
export const LoginDocument = gql`
    mutation Login($email: String!, $password: String!) {
  tokenAuth(email: $email, password: $password) {
    payload
    token
    refreshExpiresIn
    user {
      name
      email
      role
      image
    }
    refreshToken
  }
}
    `;
export type LoginMutationFn = Apollo.MutationFunction<LoginMutation, LoginMutationVariables>;

/**
 * __useLoginMutation__
 *
 * To run a mutation, you first call `useLoginMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useLoginMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [loginMutation, { data, loading, error }] = useLoginMutation({
 *   variables: {
 *      email: // value for 'email'
 *      password: // value for 'password'
 *   },
 * });
 */
export function useLoginMutation(baseOptions?: Apollo.MutationHookOptions<LoginMutation, LoginMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<LoginMutation, LoginMutationVariables>(LoginDocument, options);
      }
export type LoginMutationHookResult = ReturnType<typeof useLoginMutation>;
export type LoginMutationResult = Apollo.MutationResult<LoginMutation>;
export type LoginMutationOptions = Apollo.BaseMutationOptions<LoginMutation, LoginMutationVariables>;
export const SilentTokenRefreshDocument = gql`
    mutation SilentTokenRefresh {
  refreshToken {
    payload
    token
    refreshExpiresIn
    refreshToken
  }
}
    `;
export type SilentTokenRefreshMutationFn = Apollo.MutationFunction<SilentTokenRefreshMutation, SilentTokenRefreshMutationVariables>;

/**
 * __useSilentTokenRefreshMutation__
 *
 * To run a mutation, you first call `useSilentTokenRefreshMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSilentTokenRefreshMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [silentTokenRefreshMutation, { data, loading, error }] = useSilentTokenRefreshMutation({
 *   variables: {
 *   },
 * });
 */
export function useSilentTokenRefreshMutation(baseOptions?: Apollo.MutationHookOptions<SilentTokenRefreshMutation, SilentTokenRefreshMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SilentTokenRefreshMutation, SilentTokenRefreshMutationVariables>(SilentTokenRefreshDocument, options);
      }
export type SilentTokenRefreshMutationHookResult = ReturnType<typeof useSilentTokenRefreshMutation>;
export type SilentTokenRefreshMutationResult = Apollo.MutationResult<SilentTokenRefreshMutation>;
export type SilentTokenRefreshMutationOptions = Apollo.BaseMutationOptions<SilentTokenRefreshMutation, SilentTokenRefreshMutationVariables>;