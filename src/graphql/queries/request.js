import { gql } from "@apollo/client";

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
