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
      image:
        "https://smokemap-static-images-staging.s3.ca-central-1.amazonaws.com/guest.png",
      role: "guest",
    };
  } else {
    logged_user = session?.user;
  }

  return (
    <>
      <div className="min-h-full">
        <Navigation user={logged_user} />

        {/* <header className="bg-white shadow">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Dashboard
            </h1>
          </div>
        </header> */}
        <main>
          {/* <div className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8"> */}
          {children}
          {/* </div> */}
        </main>
        <Footer />
      </div>
    </>
  );
}
