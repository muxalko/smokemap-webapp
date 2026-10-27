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
    <div className="flex h-dvh flex-col">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 px-3 py-2">
        <a className="shrink-0 cursor-default" href={"/"} key={"a-logo-image"}>
          <img
            alt="Smokemap"
            className="h-10 w-auto blur-[1px] hover:blur-[2px]"
            src="/smokemap.svg"
          />
        </a>
        <AccountNavigation session={session} />
      </header>
      <div className="relative min-h-0 flex-1">{children}</div>
      <Footer />
    </div>
  );
}
