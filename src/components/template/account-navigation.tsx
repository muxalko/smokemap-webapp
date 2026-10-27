"use client";

import { useRef, useState } from "react";
import type { Session } from "next-auth";
import Link from "next/link";
import { SessionProvider, signOut, useSession } from "next-auth/react";

const controlClassName =
  "inline-flex min-h-11 items-center justify-center rounded-md bg-gray-800 px-3 py-2 text-sm font-medium text-white shadow hover:bg-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-wait disabled:opacity-75";

function AccountControl() {
  const { data: session, status } = useSession();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const signingOut = useRef(false);

  async function handleSignOut() {
    if (signingOut.current) return;
    signingOut.current = true;
    setPending(true);
    setError(false);
    try {
      // NextAuth handles CSRF, cookie clearing and server-side revocation.
      // Its full-page redirect also discards protected client/router state.
      await signOut({ callbackUrl: "/" });
    } catch {
      signingOut.current = false;
      setPending(false);
      setError(true);
    }
  }

  return (
    <nav
      aria-label="Account"
      className="absolute left-3 top-20 z-30 max-w-[calc(100%-1.5rem)]"
    >
      {status === "loading" ? (
        <span role="status" className={controlClassName}>
          Loading account…
        </span>
      ) : status === "authenticated" && !session?.error ? (
        <button
          type="button"
          className={controlClassName}
          aria-label="Sign out"
          aria-busy={pending}
          disabled={pending}
          onClick={() => void handleSignOut()}
        >
          {pending ? "Signing out…" : "Sign out"}
        </button>
      ) : (
        <Link className={controlClassName} href="/api/auth/signin?callbackUrl=%2F" prefetch={false}>
          Sign in
        </Link>
      )}
      {error && (
        <p
          role="alert"
          className="mt-2 max-w-52 rounded bg-white p-2 text-sm text-red-700 shadow"
        >
          Could not sign out. Please try again.
        </p>
      )}
    </nav>
  );
}

export default function AccountNavigation({
  session,
}: {
  session: Session | null;
}) {
  return (
    <SessionProvider session={session}>
      <AccountControl />
    </SessionProvider>
  );
}
