"use client";

import { Button } from "@/components/ui/button";

export default function ModerationRouteError({ reset }: { reset: () => void }) {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Moderation queue unavailable</h1>
      <p className="mt-2 text-muted-foreground">
        The queue could not be opened. No moderation action was submitted.
      </p>
      <Button className="mt-6" onClick={reset}>
        Try again
      </Button>
    </main>
  );
}
