export default function LoadingModerationQueue() {
  return (
    <main className="container mx-auto max-w-5xl px-4 py-10" aria-busy="true">
      <h1 className="text-3xl font-semibold">Moderation queue</h1>
      <p className="mt-4 text-muted-foreground" role="status">
        Loading moderation access…
      </p>
    </main>
  );
}
