import { options } from "@/app/api/auth/[...nextauth]/config";
import { getServerSession } from "next-auth";
import Card from "@/components/user/UserCard";
import Link from "next/link";

export default async function Profile() {
  const session = await getServerSession(options);
  return (
    <>
      {session ? (
        <Card pagetype={'About'} user={session?.user} />
      ) : (
        <>
          <h1>Your session is not active.</h1>
          <Link className="text-blue-500" href="/api/auth/signin">
            Sign in
          </Link>
        </>
      )}
    </>
  );
}
