import type { FeatureCollection } from "geojson";

export function ViewportStatus({
  loading,
  hasLoaded = false,
  error,
  points,
  onRetry,
}: {
  loading: boolean;
  hasLoaded?: boolean;
  error: string | null;
  points: FeatureCollection;
  onRetry?: () => void;
}) {
  const message = loading ? (
    <p role="status">{hasLoaded ? "Refreshing places…" : "Loading places…"}</p>
  ) : error ? (
    <div role="alert">
      <p>{error}</p>
      {onRetry && (
        <button
          className="pointer-events-auto mt-2 rounded bg-blue-700 px-3 py-1 text-white"
          onClick={onRetry}
          type="button"
        >
          Retry
        </button>
      )}
    </div>
  ) : points.features.length === 0 ? (
    <p role="status">No places in this area yet.</p>
  ) : null;
  if (!message) return null;
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 z-50 -translate-x-1/2 rounded-md bg-white/90 px-4 py-2 shadow">
      {message}
    </div>
  );
}
