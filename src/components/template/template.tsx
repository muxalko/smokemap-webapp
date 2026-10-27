import { options } from "@/app/api/auth/[...nextauth]/config";
import { getServerSession } from "next-auth";

import AccountNavigation from "./account-navigation";
import Footer from "./footer";

export default async function Template({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(options);

  return (
    <>
      <div className="flex h-dvh flex-col">
        <div className="absolute left-3 top-0 z-50">
          <a className="cursor-default" href={"/"} key={"a-logo-image"}>
            <img
              alt="Smokemap"
              className="h-16 w-auto blur-[1px] hover:blur-[2px]"
              src="/smokemap.svg"
            />
          </a>
        </div>
        <AccountNavigation session={session} />
        {/* <header className="bg-white shadow">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Dashboard
            </h1>
          </div>
        </header> */}
        {/* <main> */}
        {/* <div className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8"> */}
        <div className="flex-1">{children}</div>
        {/* </div> */}
        {/* </main> */}
        <Footer />
      </div>
    </>
  );
}
