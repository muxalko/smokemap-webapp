import { useCallback, useEffect, useState } from "react";

// Mirrors the backend contract in smokemap-django-backend
// backend/place_search.py (GET /api/v1/places/search/).
export const PLACE_SEARCH_ENDPOINT = "/api/smokemap/places/search";
export const PLACE_SEARCH_MIN_LENGTH = 2;
export const PLACE_SEARCH_MAX_LENGTH = 100;
export const PLACE_SEARCH_RESULT_CAP = 20;
export const PLACE_SEARCH_DEFAULT_LIMIT = 10;
export const PLACE_SEARCH_DEBOUNCE_MS = 300;

export type PlaceSearchCategory = { id: number; slug: string; name: string };

export type PlaceSearchResult = {
  id: number;
  name: string;
  address: string | null;
  coordinates: [number, number];
  category: PlaceSearchCategory | null;
  match: "prefix" | "fuzzy";
};

export type PlaceSearchState =
  | { status: "idle" }
  | { status: "too-short"; minLength: number }
  | { status: "too-long"; maxLength: number }
  | { status: "loading" }
  | { status: "empty"; query: string }
  | { status: "error"; message: string }
  | { status: "success"; query: string; results: PlaceSearchResult[] };

/** Applies the backend's NFKC, whitespace-collapsing, lower-case normalization. */
export function normalizePlaceSearchQuery(raw: string): string {
  return raw.normalize("NFKC").split(/\s+/).filter(Boolean).join(" ").toLowerCase();
}

export function clampPlaceSearchLimit(limit: number): number {
  if (!Number.isFinite(limit)) return PLACE_SEARCH_DEFAULT_LIMIT;
  return Math.min(PLACE_SEARCH_RESULT_CAP, Math.max(1, Math.floor(limit)));
}

export function buildPlaceSearchUrl(
  endpoint: string,
  query: string,
  limit: number
): string {
  const params = new URLSearchParams({
    q: query,
    limit: String(clampPlaceSearchLimit(limit)),
  });
  return `${endpoint}${endpoint.includes("?") ? "&" : "?"}${params.toString()}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseCategory(value: unknown): PlaceSearchCategory | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "number" ||
    typeof value.name !== "string"
  ) {
    return null;
  }
  return {
    id: value.id,
    slug: typeof value.slug === "string" ? value.slug : "",
    name: value.name,
  };
}

function parseResult(value: unknown): PlaceSearchResult | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "number" ||
    typeof value.name !== "string" ||
    !isRecord(value.location) ||
    !Array.isArray(value.location.coordinates)
  ) {
    return null;
  }
  const [longitude, latitude] = value.location.coordinates as unknown[];
  if (
    typeof longitude !== "number" ||
    typeof latitude !== "number" ||
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude)
  ) {
    return null;
  }
  return {
    id: value.id,
    name: value.name,
    address:
      typeof value.address === "string" && value.address.trim()
        ? value.address
        : null,
    coordinates: [longitude, latitude],
    category: parseCategory(value.category),
    match: value.match === "fuzzy" ? "fuzzy" : "prefix",
  };
}

export function parsePlaceSearchResponse(
  body: unknown,
  limit: number
): PlaceSearchResult[] {
  if (!isRecord(body) || !Array.isArray(body.results)) {
    throw new Error("Search response was not valid");
  }
  const results: PlaceSearchResult[] = [];
  for (const item of body.results) {
    const result = parseResult(item);
    if (result) results.push(result);
  }
  // The backend enforces the cap; never render more than was requested.
  return results.slice(0, clampPlaceSearchLimit(limit));
}

async function searchError(response: Response): Promise<Error> {
  try {
    const body = (await response.json()) as { detail?: unknown };
    if (response.status === 400 && typeof body.detail === "string") {
      return new Error(body.detail);
    }
  } catch {
    // Fall back to the stable message below when the response is not JSON.
  }
  return new Error(`Search failed with HTTP ${response.status}`);
}

export async function fetchPlaceSearch(
  endpoint: string,
  query: string,
  limit: number,
  signal: AbortSignal
): Promise<PlaceSearchResult[]> {
  const response = await fetch(buildPlaceSearchUrl(endpoint, query, limit), {
    method: "GET",
    headers: { Accept: "application/json" },
    signal,
  });
  if (!response.ok) throw await searchError(response);
  return parsePlaceSearchResponse(await response.json(), limit);
}

function isAbortError(error: unknown) {
  return isRecord(error) && error.name === "AbortError";
}

type SettledSearch =
  | { key: string; results: PlaceSearchResult[] }
  | { key: string; error: string };

export interface PlaceSearchOptions {
  endpoint?: string;
  limit?: number;
  debounceMs?: number;
}

/**
 * Searches places after the query settles. Each new query, retry or unmount
 * aborts the previous request, and only the settled result for the current
 * query is rendered, so a slow stale response can never replace newer state.
 */
export function usePlaceSearch(
  rawQuery: string,
  {
    endpoint = PLACE_SEARCH_ENDPOINT,
    limit = PLACE_SEARCH_DEFAULT_LIMIT,
    debounceMs = PLACE_SEARCH_DEBOUNCE_MS,
  }: PlaceSearchOptions = {}
): { state: PlaceSearchState; retry: () => void } {
  const query = normalizePlaceSearchQuery(rawQuery);
  const boundedLimit = clampPlaceSearchLimit(limit);
  const searchable =
    query.length >= PLACE_SEARCH_MIN_LENGTH &&
    query.length <= PLACE_SEARCH_MAX_LENGTH;
  const [retryVersion, setRetryVersion] = useState(0);
  const [settled, setSettled] = useState<SettledSearch | null>(null);
  const key = `${retryVersion}:${boundedLimit}:${query}`;

  useEffect(() => {
    if (!searchable) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      fetchPlaceSearch(endpoint, query, boundedLimit, controller.signal)
        .then((results) => {
          if (!controller.signal.aborted) setSettled({ key, results });
          return results;
        })
        .catch((reason: unknown) => {
          if (controller.signal.aborted || isAbortError(reason)) return null;
          setSettled({
            key,
            error:
              reason instanceof Error ? reason.message : "Unable to search places",
          });
          return null;
        });
    }, debounceMs);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [boundedLimit, debounceMs, endpoint, key, query, searchable]);

  const retry = useCallback(() => setRetryVersion((version) => version + 1), []);

  let state: PlaceSearchState;
  if (!query) {
    state = { status: "idle" };
  } else if (query.length < PLACE_SEARCH_MIN_LENGTH) {
    state = { status: "too-short", minLength: PLACE_SEARCH_MIN_LENGTH };
  } else if (query.length > PLACE_SEARCH_MAX_LENGTH) {
    state = { status: "too-long", maxLength: PLACE_SEARCH_MAX_LENGTH };
  } else if (settled?.key !== key) {
    state = { status: "loading" };
  } else if ("error" in settled) {
    state = { status: "error", message: settled.error };
  } else if (settled.results.length === 0) {
    state = { status: "empty", query };
  } else {
    state = { status: "success", query, results: settled.results };
  }

  return { state, retry };
}
