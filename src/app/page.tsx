import { MapComponent } from "@/components/map";
import { ALL_CATEGORIES_QUERY } from "@/graphql/queries/gql";
import {
  CategoryType,
  GetAllCategoriesQuery,
} from "@/graphql/__generated__/types";
import { getClient } from "@/lib/client";

export default async function Index() {
  const allCategoriesQuery = await getClient().query<GetAllCategoriesQuery>({
    query: ALL_CATEGORIES_QUERY,
  });

  return (
    <MapComponent
      categories={allCategoriesQuery.data.categories as CategoryType[]}
    />
  );
}
