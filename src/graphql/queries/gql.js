import { gql } from '@apollo/client';

export const ALL_CATEGORIES_QUERY = gql`
    query GetAllCategories {
        categories {
            id
            slug
            name
            description
        }
    }
`;

export const CREATE_SUBMISSION_V3 = gql`
    mutation CreateSubmissionV3($input: SubmissionV3Input!, $idempotencyKey: String!) {
        createSubmissionV3(input: $input, idempotencyKey: $idempotencyKey) {
            submission {
                id
                state
            }
        }
    }
`;

export const FINALIZE_SUBMISSION_V3 = gql`
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

export const CREATE_MEDIA_UPLOAD_INTENT = gql`
    mutation CreateMediaUploadIntent(
        $idempotencyKey: String!
        $input: CreateMediaUploadIntentInput!
    ) {
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

export const ISSUE_MEDIA_UPLOAD_INTENT = gql`
    mutation IssueMediaUploadIntent($intentId: ID!, $idempotencyKey: String!) {
        issueMediaUploadIntent(
            intentId: $intentId
            idempotencyKey: $idempotencyKey
        ) {
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

export const RENEW_MEDIA_UPLOAD_INTENT = gql`
    mutation RenewMediaUploadIntent($intentId: ID!, $idempotencyKey: String!) {
        renewMediaUploadIntent(
            intentId: $intentId
            idempotencyKey: $idempotencyKey
        ) {
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

export const VERIFY_MEDIA_UPLOAD_INTENT = gql`
    mutation VerifyMediaUploadIntent($intentId: ID!, $idempotencyKey: String!) {
        verifyMediaUploadIntent(
            intentId: $intentId
            idempotencyKey: $idempotencyKey
        ) {
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

export const ATTACH_VERIFIED_MEDIA = gql`
    mutation AttachVerifiedMedia($intentId: ID!, $idempotencyKey: String!) {
        attachVerifiedMedia(
            intentId: $intentId
            idempotencyKey: $idempotencyKey
        ) {
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

export const REMOVE_ATTACHED_MEDIA = gql`
    mutation RemoveAttachedMedia($intentId: ID!, $idempotencyKey: String!) {
        removeAttachedMedia(
            intentId: $intentId
            idempotencyKey: $idempotencyKey
        ) {
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

export const EXPIRE_MEDIA_UPLOAD_INTENT = gql`
    mutation ExpireMediaUploadIntent($intentId: ID!, $idempotencyKey: String!) {
        expireMediaUploadIntent(
            intentId: $intentId
            idempotencyKey: $idempotencyKey
        ) {
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

export const MEDIA_ATTACHMENT_PREVIEW_V3 = gql`
    query MediaAttachmentPreviewV3($attachmentId: ID!) {
        mediaAttachmentPreviewV3(attachmentId: $attachmentId) {
            url
            expiresAt
        }
    }
`;

const SUBMISSION_V3_SNAPSHOT_FIELDS = `
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
`;

export const EDIT_SUBMISSION_V3 = gql`
    mutation EditSubmissionV3(
        $submissionId: ID!
        $idempotencyKey: String!
        $input: SubmissionV3Input!
    ) {
        editSubmissionV3(
            submissionId: $submissionId
            idempotencyKey: $idempotencyKey
            input: $input
        ) {
            submission {
                ${SUBMISSION_V3_SNAPSHOT_FIELDS}
            }
            replayed
        }
    }
`;

export const REORDER_SUBMISSION_MEDIA_V3 = gql`
    mutation ReorderSubmissionMediaV3(
        $submissionId: ID!
        $idempotencyKey: String!
        $attachmentIds: [ID!]!
    ) {
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

export const SUBMISSION_MEDIA_STATE_V3 = gql`
    query SubmissionMediaStateV3($submissionId: ID!) {
        submissionMediaStateV3(submissionId: $submissionId) {
            submission {
                ${SUBMISSION_V3_SNAPSHOT_FIELDS}
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
`;

export const ALL_REQUESTS_QUERY = gql`
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

export const NOT_APPROVED_REQUESTS_QUERY = gql`
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
            imageSet {
                id
                name
                url
            }
            description
            tags
            dateCreated
            dateUpdated
            dateApproved
            approved
            approvedBy
            approvedComment
            requestedBy
        }
    }
`;

export const CREATE_REQUEST = gql`
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

export const APPROVE_REQUEST = gql`
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
                requestedBy
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

export const DELETE_REQUEST = gql`
    mutation DeleteRequest($id: ID!) {
        deleteRequest(id: $id) {
            ok
        }
    }
`;

// export const GET_S3_PRESIGNED_URL = gql`
//     query GetS3PresignedUrl($imageType: String!) {
//         s3PresignedUrl(imageType: $imageType)
//     }
// `;
export const GET_S3_PRESIGNED_URL = gql`
    query GetS3PresignedUrl {
        s3PresignedUrl
    }
`;

export const CREATE_IMAGE = gql`
    mutation CreateImage($input: ImageInput!) {
        createImage(input: $input) {
            image {
                name
                url
            }
        }
    }
`;

export const GET_PLACE_BY_ID = gql`
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
            imageSet {
                    id
                    url
                    name
                }
            }
    }
`;

export const GET_PLACES_STARTWITH_NAME = gql`
    query GetPlacesStartwithName($name: String!) {
        placesStartwithName(name: $name) {
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
            imageSet {
                    id
                    url
                    name
                }
            }
    }
`;

export const ALL_PLACES_NAMES_QUERY = gql`
    query GetAllPlacesNames {
        placesNames
    }
`;

export const LOGIN = gql`
    mutation Login($email: String!, $password: String! ) {
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

export const SILENT_REFRESH_TOKEN = gql`
    mutation SilentTokenRefresh {
        refreshToken {
            payload
            token
            refreshExpiresIn
            refreshToken
        }
    }
`;
