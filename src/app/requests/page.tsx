import React from "react";
import { getClient } from "@/lib/client";
import { NOT_APPROVED_REQUESTS_QUERY } from "@/graphql/queries/gql";
import {
  // CategoryType,
  // GetAllCategoriesQuery,
  GetAllNotApprovedRequestsQuery,
  RequestType,
} from "@/graphql/__generated__/types";
export const dynamic = "force-dynamic";

import { ModerationDataTable } from "./data-table";
import { getBackendAuth } from "@/lib/auth/get-backend-auth";
import { canHardDelete, canModerate } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
// import RequestReactForm from "./request-react-form";
// import { ALL_CATEGORIES_QUERY } from "@/graphql/queries/gql";
// import { revalidatePath } from "next/cache";
// import { options } from "@/app/api/auth/[...nextauth]/config";
// import { getServerSession } from "next-auth";
// import { cookies } from "next/headers";
// import logger from "@/lib/logger";
// import { redirect } from "next/navigation";

export default async function RequestsManager(): Promise<JSX.Element> {
  const auth = await getBackendAuth();
  if (!auth?.backendAccess) redirect("/api/auth/signin?callbackUrl=%2Frequests");
  if (!canModerate(auth.role)) redirect("/denied");

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
    context: { headers: { Authorization: `Bearer ${auth.backendAccess}` } },
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
        <ModerationDataTable
          data={(data.data?.requestsToApprove?.filter(Boolean) ?? []) as RequestType[]}
          canApprove={canModerate(auth.role)}
          canDelete={canHardDelete(auth.role)}
        />
      </div>
    </>
  );
}
