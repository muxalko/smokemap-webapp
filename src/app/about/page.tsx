import { options } from "@/app/api/auth/[...nextauth]/config";
import { getServerSession } from "next-auth";
import UserCard from "@/components/user/UserCard";
// import { cookies } from "next/headers";

// TODO: use environment vars, reading the whole package.json is unsecure.
// import packageJson from "./../../../package.json";

export default async function About(): Promise<JSX.Element> {
  const session = await getServerSession(options);
  // const cookieStore = cookies();
  // const csrftoken = cookieStore.get("csrftoken");

  // if (session?.user.role !== "admin") {
  //   return <h1 className="text-red-950">Access Denied!</h1>;
  // }

  return (
    <>
      {/* {cookieStore &&
        cookieStore.getAll().map((cookie) => (
          <div key={cookie.name}>
            <p>Name: {cookie.name}</p>
            <p>Value: {cookie.value}</p>
          </div>
        ))} */}

      {session ? (
        <>
          <UserCard pagetype={"About"} user={session?.user} />
          <p className="text-center text-2xl">
            Smokemap v{process.env.NEXT_PUBLIC_VERSION}
          </p>
        </>
      ) : (
        <p className="text-center text-2xl">
          Smokemap v{process.env.NEXT_PUBLIC_VERSION}
        </p>
      )}
    </>
  );
}
