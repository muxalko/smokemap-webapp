import Image from "next/image";
import type { User } from "next-auth";
import Hero from "../../app/requests/request-react-form";

type Props = {
  user: User;
  pagetype: string;
};

export default function Card({ user, pagetype }: Props) {
  //console.log("Card: user=" + JSON.stringify(user));

  const greeting = user?.name ? (
    <div className="flex flex-col items-center rounded-lg bg-white p-6 text-5xl font-bold text-black">
      Hello {user?.name}!
    </div>
  ) : null;

  const emailDisplay = user?.email ? (
    <div className="flex flex-col items-center rounded-lg bg-white p-6 text-5xl font-bold text-black">
      {user?.email}
    </div>
  ) : null;

  const userImage = user?.image ? (
    <Image
      alt={user?.name ?? "Profile image"}
      className="mx-auto mt-8 rounded-full border-4 border-black shadow-black drop-shadow-xl dark:border-slate-500"
      height={200}
      priority={true}
      src={user?.image}
      width={200}
    />
  ) : null;

  return (
    <section className="flex flex-col gap-4">
      {greeting}
      {emailDisplay}
      {userImage}
      <p className="text-center text-2xl">{pagetype} Page</p>
      <p className="text-center text-2xl">Role: {user.role}</p>
    </section>
  );
}
