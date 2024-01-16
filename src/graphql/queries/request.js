import { gql } from '@apollo/client';

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