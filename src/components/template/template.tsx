import { options } from "@/app/api/auth/[...nextauth]/config";
import { getServerSession, User } from "next-auth";

import Navigation from "./navigation";
import Footer from "./footer";

export default async function Template({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(options);

  let logged_user: User;

  if (!session) {
    // default guest profile
    logged_user = {
      id: "-1",
      name: "Guest",
      email: "",
      image: "/guest.svg",
      role: "guest",
      access: "",
      accessExpiresIn: 0,
      refresh: "",
      refreshExpiresIn: 0,
    };
  } else {
    logged_user = session?.user;
  }

  return (
    <>
      <div className="flex h-dvh flex-col">
        {/* {(logged_user && logged_user.role == "admin" && (
          <Navigation user={logged_user} />
        )) || ( */}
        <div className="absolute left-3 top-0 z-50">
          <a className="cursor-default" href={"/"} key={"a-logo-image"}>
            <img
              alt="Smokemap"
              className="h-16 w-auto blur-[1px] hover:blur-[2px]"
              src="/smokemap.svg"
            />
          </a>
        </div>
        {/* )} */}
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
