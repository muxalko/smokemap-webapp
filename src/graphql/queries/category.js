import { gql } from "@apollo/client";

export const ALL_CATEGORIES_QUERY = gql`
  query GetAllCategories {
    categories {
      id
      name
      description
    }
  }
`;
