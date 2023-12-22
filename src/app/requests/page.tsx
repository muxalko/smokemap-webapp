import React from "react";
import { getClient } from "@/lib/client";
import { NOT_APPROVED_REQUESTS_QUERY } from "@/graphql/queries/request";
import {
  CategoryType,
  GetAllCategoriesQuery,
  GetAllNotApprovedRequestsQuery,
} from "@/graphql/__generated__/types";
export const dynamic = "force-dynamic";

import { DataTable } from "./data-table";
import { columns } from "./columns";
import RequestReactForm from "./request-react-form";
import { ALL_CATEGORIES_QUERY } from "@/graphql/queries/category";
import { revalidatePath } from "next/cache";

export default async function RequestsManager() {
  // fetch the data
  const data = await getClient().query<GetAllNotApprovedRequestsQuery>({
    query: NOT_APPROVED_REQUESTS_QUERY,
  });

  const categories = await getClient().query<GetAllCategoriesQuery>({
    query: ALL_CATEGORIES_QUERY,
  });
  // const refetchData = async () => {
  //   "use server"

  //   return await getClient().refetchQueries({
  //     include: [NOT_APPROVED_REQUESTS_QUERY],
  //   });
  // };

  // const [approveRequest, { reset, error, loading }] =
  //   useMutation(APPROVE_REQUEST);

  // TODO: find out how to trigger a function from column.actions
  // function onClickApproveHandler(value: string) {
  //   approveRequest({
  //     variables: {
  //       id: value,
  //       input: { approvedBy: "UI", approvedComment: "Testing approvals" },
  //     },
  //   });
  // }

  //console.log(JSON.stringify(data));

  // const [newRequest, setNewRequest] = useState({});

  // const newRequestHandle = (data) => {
  //   setNewRequest(data);
  // };

  // console.log("Cache:", getClient().getObservableQueries());
  // prettier-ignore
  return (
    <>
      <div className="container mx-auto py-10">
        <RequestReactForm
          categories={categories.data.categories as CategoryType[]}
          // server action
            updateDataCallback={async () => {
              "use server";
              console.log(
                "server action fired from RequestReactForm.updateDataCallback() "
              );
              revalidatePath("/requests");
              return await new Promise(() => {});
            }}
        />
        {
          // @ts-expect-error: TS2322 because there is an issue with types for ColumnDef. See https://github.com/TanStack/table/issues/4241
        } <DataTable columns={columns} data={data.data?.requestsToApprove} />
      </div>
    </>
  );
}
