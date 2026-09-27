import { redirect } from "next/navigation";

import { getBackendAuth } from "@/lib/auth/get-backend-auth";
import { canHardDelete, canModerate } from "@/lib/auth/permissions";
import { ModerationQueue } from "./queue";

export const dynamic = "force-dynamic";

export default async function RequestsManager(): Promise<JSX.Element> {
  const auth = await getBackendAuth();
  if (!auth?.backendAccess) {
    redirect("/api/auth/signin?callbackUrl=%2Frequests");
  }
  if (!canModerate(auth.role)) redirect("/denied");

  return (
    <main className="container mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-semibold">Moderation queue</h1>
        <p className="text-muted-foreground">
          Review pending submissions from oldest to newest. Media previews are
          requested only when you open them and expire automatically.
        </p>
      </div>
      <ModerationQueue canDelete={canHardDelete(auth.role)} />
    </main>
  );
}
