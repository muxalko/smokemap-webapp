import React from "react";
import { getClient } from "@/lib/client";
import { NOT_APPROVED_REQUESTS_QUERY } from "@/graphql/queries/gql";
import {
  // CategoryType,
  // GetAllCategoriesQuery,
  GetAllNotApprovedRequestsQuery,
  ImageType,
} from "@/graphql/__generated__/types";
export const dynamic = "force-dynamic";

import { DataTable } from "./data-table";
import { columns } from "./columns";
// import RequestReactForm from "./request-react-form";
// import { ALL_CATEGORIES_QUERY } from "@/graphql/queries/gql";
// import { revalidatePath } from "next/cache";
// import { options } from "@/app/api/auth/[...nextauth]/config";
// import { getServerSession } from "next-auth";
// import { cookies } from "next/headers";
// import logger from "@/lib/logger";
// import { redirect } from "next/navigation";

export default async function RequestsManager(): Promise<JSX.Element> {
  // const session = await getServerSession(options);

  // ensure relevant cookies are present
  // this is required by API to work
  // const csrf = cookies().get("csrftoken");
  // const jwt = cookies().get("JWT");
  // const jwt_rt = cookies().get("JWT-refresh-token");

  // logger.debug(
  //   { session: session, csrf: csrf, jwt: jwt, jwt_rt: jwt_rt },
  //   "RequestManager context"
  // );

  // if (session?.user.role !== "admin" || !(csrf && jwt && jwt_rt)) {
  //   return redirect("/api/auth/signin?callbackUrl=%2Frequests"); // <h1 className="text-red-950">Access Denied!</h1>;
  // }

  // fetch the data
  const data = await getClient().query<GetAllNotApprovedRequestsQuery>({
    query: NOT_APPROVED_REQUESTS_QUERY,
  });

  // const categories = await getClient().query<GetAllCategoriesQuery>({
  //   query: ALL_CATEGORIES_QUERY,
  // });
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

  ////console.log(JSON.stringify(data));

  // const [newRequest, setNewRequest] = useState({});

  // const newRequestHandle = (data) => {
  //   setNewRequest(data);
  // };

  // //console.log("Cache:", getClient().getObservableQueries());
  // prettier-ignore

  return (
    <>
      
      <div className="container mx-auto py-10">
        { /* prettier-ignore */ // added to .prettierignore, cause that decorator doesn't work
         // @ts-expect-error: TS2322 because there is an issue with types for ColumnDef. See https://github.com/TanStack/table/issues/4241
        }<DataTable columns={columns} data={data.data?.requestsToApprove}
        />
      </div>
    </>
  );
}
