import React from "react";
import { getClient } from "@/client";
import { NOT_APPROVED_REQUESTS_QUERY } from "@/graphql/queries/request";
import { ALL_CATEGORIES_QUERY } from "@/graphql/queries/category";
import {
  GetAllCategoriesQuery,
  GetAllNotApprovedRequestsQuery,
  // RequestType,
} from "@/graphql/__generated__/graphql";
export const dynamic = "force-dynamic";

import { columns } from "./columns";
import { DataTable } from "./data-table";
import RequestReactForm from "./request-react-form";
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
  const refetchData = async () => {
    "use server";
    revalidatePath("/requests");
  };
  // const [approveRequest, { reset, error, loading }] =
  //   useMutation(APPROVE_REQUEST);

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
  return (
    <>
      <div className="container mx-auto py-10">
        <RequestReactForm
          categories={categories.data.categories}
          updateDataCallback={refetchData}
        />
        <DataTable columns={columns} data={data.data?.requestsToApprove} />
      </div>
      {/* <Table
        header={[
          { name: "Place ID", prop: "id" },
          { name: "Place name",
          prop: "name" },
        ]}
        data={data}
      /> */}
    </>
  );
}
