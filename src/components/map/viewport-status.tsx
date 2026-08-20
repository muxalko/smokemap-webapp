import type { FeatureCollection } from "geojson";

export function ViewportStatus({
  loading,
  error,
  points,
}: {
  loading: boolean;
  error: string | null;
  points: FeatureCollection;
}) {
  const message = loading ? (
    <p role="status">Loading places…</p>
  ) : error ? (
    <p role="alert">{error}</p>
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
