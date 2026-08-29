import type { FeatureCollection } from "geojson";
import { act, fireEvent, render, screen } from "@/test/render";
import { installFetchMock, jsonResponse } from "@/test/network";
import { ViewportStatus } from "./viewport-status";
import {
  buildViewportPlacesUrl,
  createViewportQuery,
  normalizeViewportPlaces,
  useViewportPlaces,
  type ViewportQuery,
} from "./viewport-places";

const endpoint = "/api/smokemap/locations";

const points = (name?: string): FeatureCollection => ({
  type: "FeatureCollection",
  features: name
    ? [
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [0, 0] },
          properties: { name },
        },
      ]
    : [],
});

const query = (
  bbox: [number, number, number, number],
  zoom = 13
): ViewportQuery => ({ bbox, zoom });

function ViewportHarness({ viewport }: { viewport: ViewportQuery }) {
  const state = useViewportPlaces(endpoint, viewport);
  return (
    <>
      <ViewportStatus
        loading={state.loading}
        hasLoaded={state.hasLoaded}
        error={state.error}
        points={state.points}
        onRetry={state.retry}
      />
      <div data-testid="places">
        {state.points.features.map((feature) => {
          const properties = feature.properties as { name?: unknown } | null;
          return typeof properties?.name === "string" ? properties.name : "";
        })}
      </div>
    </>
  );
}

async function runDebounce() {
  await act(async () => {
    jest.advanceTimersByTime(250);
    await Promise.resolve();
  });
}

function deferred<T>() {
  let resolveDeferred!: (value: T) => void;
  const promise = new Promise<T>((resolve) => {
    resolveDeferred = resolve;
  });
  return { promise, resolve: resolveDeferred };
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

it("builds the bounded API query from visible bounds and integer zoom", () => {
  const viewport = createViewportQuery(
    {
      getWest: () => -77.123456789,
      getSouth: () => 38.1,
      getEast: () => -76.9,
      getNorth: () => 38.987654321,
    },
    13.75
  );

  expect(viewport).toEqual({
    bbox: [-77.123457, 38.1, -76.9, 38.987654],
    zoom: 13,
  });
  expect(buildViewportPlacesUrl(endpoint, viewport!)).toBe(
    "/api/smokemap/locations?bbox=-77.123457%2C38.1%2C-76.9%2C38.987654&zoom=13"
  );
});

it("normalizes backend category objects for MapLibre without mutating the response", () => {
  const response = points("outside");
  response.features[0].properties = {
    ...response.features[0].properties,
    place_id: 42,
    category: { id: 7, name: "Rooftop" },
  };

  const normalized = normalizeViewportPlaces(response);

  expect(normalized.features[0].properties).toEqual({
    name: "outside",
    place_id: 42,
    category: 7,
  });
  expect(response.features[0].properties?.category).toEqual({
    id: 7,
    name: "Rooftop",
  });
});

it("loads initially and refetches the settled pan and zoom viewport", async () => {
  const fetchMock = installFetchMock();
  fetchMock
    .mockResolvedValueOnce(jsonResponse(points("west")))
    .mockResolvedValueOnce(jsonResponse(points("east")))
    .mockResolvedValueOnce(jsonResponse(points("zoomed")));

  const west = query([-77.1, 38.8, -77, 38.9]);
  const view = render(<ViewportHarness viewport={west} />);
  expect(screen.getByRole("status")).toHaveTextContent("Loading places");
  expect(fetchMock).not.toHaveBeenCalled();

  await runDebounce();
  expect(screen.getByTestId("places")).toHaveTextContent("west");

  const east = query([-76.9, 38.8, -76.8, 38.9]);
  view.rerender(<ViewportHarness viewport={east} />);
  expect(screen.getByRole("status")).toHaveTextContent("Refreshing places");
  await runDebounce();
  expect(screen.getByTestId("places")).toHaveTextContent("east");

  view.rerender(<ViewportHarness viewport={query(east.bbox, 16)} />);
  await runDebounce();
  expect(screen.getByTestId("places")).toHaveTextContent("zoomed");

  const urls = fetchMock.mock.calls.map(([url]) => String(url));
  expect(urls[0]).toContain("bbox=-77.1%2C38.8%2C-77%2C38.9&zoom=13");
  expect(urls[1]).toContain("bbox=-76.9%2C38.8%2C-76.8%2C38.9&zoom=13");
  expect(urls[2]).toContain("bbox=-76.9%2C38.8%2C-76.8%2C38.9&zoom=16");
});

it("cancels an old request and ignores its stale response", async () => {
  const fetchMock = installFetchMock();
  const oldRequest = deferred<Response>();
  const currentRequest = deferred<Response>();
  fetchMock
    .mockReturnValueOnce(oldRequest.promise)
    .mockReturnValueOnce(currentRequest.promise);

  const view = render(
    <ViewportHarness viewport={query([-77.1, 38.8, -77, 38.9])} />
  );
  await runDebounce();
  const oldSignal = fetchMock.mock.calls[0][1]?.signal;

  view.rerender(
    <ViewportHarness viewport={query([-76.9, 38.8, -76.8, 38.9])} />
  );
  expect(oldSignal?.aborted).toBe(true);
  await runDebounce();

  await act(async () => {
    currentRequest.resolve(jsonResponse(points("current")));
    await currentRequest.promise;
    await Promise.resolve();
  });
  expect(screen.getByTestId("places")).toHaveTextContent("current");

  await act(async () => {
    oldRequest.resolve(jsonResponse(points("stale")));
    await oldRequest.promise;
    await Promise.resolve();
  });
  expect(screen.getByTestId("places")).toHaveTextContent("current");
  expect(screen.getByTestId("places")).not.toHaveTextContent("stale");
});

it("keeps the map state usable for errors, retry, and empty results", async () => {
  const fetchMock = installFetchMock();
  fetchMock
    .mockResolvedValueOnce(
      jsonResponse({ detail: "Zoom in or select categories" }, 400)
    )
    .mockResolvedValueOnce(jsonResponse(points()));

  render(<ViewportHarness viewport={query([-80, 35, -70, 45], 5)} />);
  await runDebounce();
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Zoom in or select categories"
  );

  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  await runDebounce();
  expect(screen.getByRole("status")).toHaveTextContent(
    "No places in this area yet."
  );
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
