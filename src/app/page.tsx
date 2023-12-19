import { MapComponent } from "@/components/map";
import { ALL_CATEGORIES_QUERY } from "@/graphql/queries/category";
import {
  CategoryType,
  GetAllCategoriesQuery,
} from "@/graphql/__generated__/types";
import { getClient } from "@/lib/client";
import RequestReactForm from "./requests/request-react-form";
import { revalidatePath } from "next/cache";

export default async function Index() {
  const allCategoriesQuery = await getClient().query<GetAllCategoriesQuery>({
    query: ALL_CATEGORIES_QUERY,
  });

  // console.log("Index page GOT THE DATA: " + JSON.stringify(allCategoriesQuery.data.categories));
  return (
    <>
      <div className="flex flex-col flex-grow h-screen">
        <RequestReactForm
          categories={allCategoriesQuery.data.categories as CategoryType[]}
          // server action
          updateDataCallback={async () => {
            "use server";
            revalidatePath("/");
            return await new Promise(() => {});
          }}
        />

        <MapComponent
          categories={allCategoriesQuery.data.categories as CategoryType[]}
        />
      </div>
    </>
  );
}
