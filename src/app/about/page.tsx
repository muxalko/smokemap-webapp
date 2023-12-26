import { options } from "@/app/api/auth/[...nextauth]/config";
import { getServerSession } from "next-auth";
import UserCard from "@/components/user/UserCard";

// TODO: use environment vars, reading the whole package.json is unsecure.
import packageJson from "./../../../package.json";

export default async function About(): Promise<JSX.Element> {
  const session = await getServerSession(options);

  if (session?.user.role !== "admin") {
    return <h1 className="text-red-950">Access Denied!</h1>;
  }

  return (
    <>
      {session ? (
        <>
          <UserCard pagetype={"About"} user={session?.user} />
          <p className="text-2xl text-center">
            Smokemap v{packageJson.version}
          </p>
        </>
      ) : (
        <p className="text-2xl text-center">Smokemap v{packageJson.version}</p>
      )}
    </>
  );
}
