import type { FeatureCollection } from "geojson";
import { useCallback, useEffect, useRef, useState } from "react";

export const VIEWPORT_REQUEST_DEBOUNCE_MS = 250;

const emptyFeatureCollection = (): FeatureCollection => ({
  type: "FeatureCollection",
  features: [],
});

export type ViewportQuery = {
  bbox: [number, number, number, number];
  zoom: number;
};

type MapBounds = {
  getWest(): number;
  getSouth(): number;
  getEast(): number;
  getNorth(): number;
};

const roundCoordinate = (value: number) => Number(value.toFixed(6));

export function createViewportQuery(
  bounds: MapBounds,
  zoom: number
): ViewportQuery | null {
  const bbox = [
    bounds.getWest(),
    bounds.getSouth(),
    bounds.getEast(),
    bounds.getNorth(),
  ] as const;

  if (![...bbox, zoom].every(Number.isFinite)) return null;

  return {
    bbox: bbox.map(roundCoordinate) as ViewportQuery["bbox"],
    zoom: Math.min(22, Math.max(0, Math.floor(zoom))),
  };
}

export function buildViewportPlacesUrl(
  endpoint: string,
  query: ViewportQuery
): string {
  const params = new URLSearchParams({
    bbox: query.bbox.join(","),
    zoom: String(query.zoom),
  });
  return `${endpoint}${endpoint.includes("?") ? "&" : "?"}${params.toString()}`;
}

function isFeatureCollection(value: unknown): value is FeatureCollection {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { type?: unknown }).type === "FeatureCollection" &&
    Array.isArray((value as { features?: unknown }).features)
  );
}

async function responseError(response: Response): Promise<Error> {
  try {
    const body = (await response.json()) as { detail?: unknown };
    if (typeof body.detail === "string") return new Error(body.detail);
  } catch {
    // Fall back to the stable HTTP error below when the response is not JSON.
  }
  return new Error(`Places request failed with HTTP ${response.status}`);
}

async function fetchViewportPlaces(
  endpoint: string,
  query: ViewportQuery,
  signal: AbortSignal
): Promise<FeatureCollection> {
  const response = await fetch(buildViewportPlacesUrl(endpoint, query), {
    method: "GET",
    headers: { Accept: "application/geo+json, application/json" },
    signal,
  });

  if (!response.ok) throw await responseError(response);

  const body: unknown = await response.json();
  if (!isFeatureCollection(body)) {
    throw new Error("Places response was not valid GeoJSON");
  }
  return body;
}

function isAbortError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "AbortError"
  );
}

export function useViewportPlaces(
  endpoint: string,
  query: ViewportQuery | null,
  debounceMs = VIEWPORT_REQUEST_DEBOUNCE_MS
) {
  const [points, setPoints] = useState<FeatureCollection>(
    emptyFeatureCollection
  );
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryVersion, setRetryVersion] = useState(0);
  const requestSequence = useRef(0);

  useEffect(() => {
    const request = ++requestSequence.current;
    if (!query || !endpoint) return;

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const timeout = window.setTimeout(() => {
      fetchViewportPlaces(endpoint, query, controller.signal)
        .then((nextPoints) => {
          if (request === requestSequence.current) {
            setPoints(nextPoints);
            setHasLoaded(true);
            setLoading(false);
          }
          return nextPoints;
        })
        .catch((reason: unknown) => {
          if (isAbortError(reason) || request !== requestSequence.current) {
            return null;
          }

          setPoints(emptyFeatureCollection());
          setHasLoaded(true);
          setError(
            reason instanceof Error ? reason.message : "Unable to load places"
          );
          setLoading(false);
          return null;
        });
    }, debounceMs);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [debounceMs, endpoint, query, retryVersion]);

  const retry = useCallback(() => setRetryVersion((version) => version + 1), []);

  return { points, loading, hasLoaded, error, retry };
}
