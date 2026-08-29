import type { ButtonHTMLAttributes, ForwardedRef, ReactNode } from "react";
import type { FeatureCollection } from "geojson";
import { act, fireEvent, render, screen } from "@/test/render";
import { installFetchMock, jsonResponse } from "@/test/network";
import MapComponent from "./map-component";

type MockViewport = {
  west: number;
  south: number;
  east: number;
  north: number;
  zoom: number;
};

type MockMapEvent = {
  features?: Array<{
    geometry: { type: "Point"; coordinates: number[] };
    properties: Record<string, unknown>;
  }>;
  lngLat: { lng: number };
  point: { x: number; y: number };
};

type MockMapProps = {
  children?: ReactNode;
  interactiveLayerIds?: string[];
  onLoad?: () => void;
  onMoveEnd?: (event: { viewState: Record<string, unknown> }) => void;
};

type MockSourceProps = {
  children?: ReactNode;
  data?: FeatureCollection;
};

type MockLayerProps = Record<string, unknown> & { id?: string };
type MockLayerHandler = (event: MockMapEvent) => void;

const mockCategories = [
  { __typename: "CategoryType" as const, id: "7", name: "Rooftop" },
];
const mockLayerHandlers = new Map<string, Set<MockLayerHandler>>();
const mockLayerProps = new Map<string, MockLayerProps>();
let mockCategoriesRequest: Promise<{
  data: { categories: typeof mockCategories };
}>;
let mockViewport: MockViewport;
let mockLatestMapProps: MockMapProps | null;
let mockLatestSourceProps: MockSourceProps | null;
let mockMapMountCount: number;
let mockSelectedPlace: Record<string, unknown> | null;

const mockRawMap = {
  on: jest.fn(),
  off: jest.fn(),
};

const mockMapApi = {
  getBounds: () => ({
    getWest: () => mockViewport.west,
    getSouth: () => mockViewport.south,
    getEast: () => mockViewport.east,
    getNorth: () => mockViewport.north,
  }),
  getZoom: () => mockViewport.zoom,
  getCenter: () => ({ lng: 0, lat: 0 }),
  getMap: () => mockRawMap,
  getCanvas: () => ({ style: { cursor: "" } }),
  getLayer: jest.fn(),
  getSource: jest.fn(),
  getStyle: jest.fn(),
  unproject: jest.fn(),
  easeTo: jest.fn(),
  flyTo: jest.fn(),
  zoomTo: jest.fn(),
  on: jest.fn((event: string, layer: string, handler: MockLayerHandler) => {
    const key = `${event}:${layer}`;
    const handlers = mockLayerHandlers.get(key) ?? new Set();
    handlers.add(handler);
    mockLayerHandlers.set(key, handlers);
  }),
  off: jest.fn((event: string, layer: string, handler: MockLayerHandler) => {
    const key = `${event}:${layer}`;
    const handlers = mockLayerHandlers.get(key);
    handlers?.delete(handler);
    if (handlers?.size === 0) mockLayerHandlers.delete(key);
  }),
};

jest.mock("react-map-gl/maplibre", () => {
  const React = jest.requireActual<typeof import("react")>("react");

  const Map = React.forwardRef(function MockMap(
    props: MockMapProps,
    ref: ForwardedRef<unknown>
  ) {
    const instanceId = React.useRef<number | null>(null);
    if (instanceId.current === null) {
      mockMapMountCount += 1;
      instanceId.current = mockMapMountCount;
    }
    React.useImperativeHandle(ref, () => mockMapApi);
    mockLatestMapProps = props;

    return (
      <div data-map-instance={instanceId.current} data-testid="maplibre-map">
        <button data-testid="map-load" onClick={() => props.onLoad?.()} />
        <button
          data-testid="map-move-end"
          onClick={() =>
            props.onMoveEnd?.({
              viewState: {
                latitude: 0,
                longitude: 0,
                zoom: mockViewport.zoom,
              },
            })
          }
        />
        {props.children}
      </div>
    );
  });

  const Source = (props: MockSourceProps) => {
    mockLatestSourceProps = props;
    return <div data-testid="places-source">{props.children}</div>;
  };

  const Layer = (props: MockLayerProps) => {
    if (props.id) mockLayerProps.set(props.id, props);
    return null;
  };

  return {
    Map,
    Source,
    Layer,
    NavigationControl: () => null,
    FullscreenControl: () => null,
    ScaleControl: () => null,
    GeolocateControl: () => null,
  };
});

jest.mock("@/graphql/__generated__/types", () => ({
  useGetAllCategoriesLazyQuery: () => [
    jest.fn(() => mockCategoriesRequest),
    { data: undefined, loading: false, error: undefined },
  ],
}));

jest.mock("../places/PlaceCard", () => ({
  __esModule: true,
  default: ({ place }: { place: Record<string, unknown> }) => {
    mockSelectedPlace = place;
    return <div data-testid="place-card">{String(place.name)}</div>;
  },
}));

jest.mock("../places/PlaceList", () => () => null);
jest.mock("../places/Search", () => () => null);
jest.mock("@/app/requests/request-react-form", () => () => null);
jest.mock("./custom-overlay", () => ({
  __esModule: true,
  default: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));
jest.mock("./crosshair", () => () => null);
jest.mock("./geocoder-control", () => () => null);

jest.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open?: boolean; children?: ReactNode }) =>
    open ? <div data-testid="place-dialog">{children}</div> : null,
  DialogContent: ({ children }: { children?: ReactNode }) => <>{children}</>,
  DialogFooter: ({ children }: { children?: ReactNode }) => <>{children}</>,
  DialogTrigger: () => null,
}));

jest.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children?: ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children?: ReactNode }) => <>{children}</>,
  PopoverTrigger: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));

jest.mock("@/components/ui/form", () => ({
  Form: ({ children }: { children?: ReactNode }) => <>{children}</>,
  FormControl: ({ children }: { children?: ReactNode }) => <>{children}</>,
  FormDescription: ({ children }: { children?: ReactNode }) => <>{children}</>,
  FormField: () => null,
  FormItem: ({ children }: { children?: ReactNode }) => <>{children}</>,
  FormLabel: ({ children }: { children?: ReactNode }) => <>{children}</>,
  FormMessage: () => null,
}));

jest.mock("@/components/ui/checkbox", () => ({ Checkbox: () => null }));
jest.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

const style = { version: 8, sources: {}, layers: [] };

function places(name?: string): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: name
      ? [
          {
            type: "Feature",
            geometry: { type: "Point", coordinates: [-77, 39] },
            properties: {
              place_id: name === "current" ? 2 : 1,
              name,
              category: { id: 7, name: "Rooftop" },
              description: `${name} description`,
              address: `${name} address`,
              tags: [],
              images: [],
            },
          },
        ]
      : [],
  };
}

function deferred<T>() {
  let resolveDeferred!: (value: T) => void;
  const promise = new Promise<T>((resolve) => {
    resolveDeferred = resolve;
  });
  return { promise, resolve: resolveDeferred };
}

function getOnlyLayerHandler(event: string, layer: string) {
  const handlers = mockLayerHandlers.get(`${event}:${layer}`);
  expect(handlers?.size).toBe(1);
  return Array.from(handlers!)[0];
}

function evaluateFilter(
  expression: unknown,
  properties: Record<string, unknown>
): unknown {
  if (!Array.isArray(expression)) return expression;

  const filterExpression = expression as readonly unknown[];
  const operator = filterExpression[0];
  const operands = filterExpression.slice(1);
  switch (operator) {
    case "all":
      return operands.every((operand) =>
        Boolean(evaluateFilter(operand, properties))
      );
    case "!":
      return !evaluateFilter(operands[0], properties);
    case "has":
      return Object.prototype.hasOwnProperty.call(
        properties,
        String(operands[0])
      );
    case "get":
      return properties[String(operands[0])];
    case "==":
      return (
        evaluateFilter(operands[0], properties) ===
        evaluateFilter(operands[1], properties)
      );
    default:
      throw new Error(`Unsupported test filter operator: ${String(operator)}`);
  }
}

async function flushPromises() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function runDebounce() {
  await act(async () => {
    jest.advanceTimersByTime(250);
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function advanceTimers(milliseconds: number) {
  await act(async () => {
    jest.advanceTimersByTime(milliseconds);
    await Promise.resolve();
  });
}

async function renderLoadedMap(fetchMock: jest.MockedFunction<typeof fetch>) {
  fetchMock.mockResolvedValueOnce(jsonResponse(style));
  const view = render(<MapComponent />);
  await flushPromises();
  expect(screen.getByTestId("maplibre-map")).toBeInTheDocument();
  expect(mockLatestMapProps?.interactiveLayerIds).toEqual([
    "clusters",
    "paint_category_rooftop",
  ]);
  fireEvent.click(screen.getByTestId("map-load"));
  expect(fetchMock).toHaveBeenCalledTimes(1);
  return view;
}

beforeEach(() => {
  jest.useFakeTimers();
  mockCategoriesRequest = Promise.resolve({
    data: { categories: mockCategories },
  });
  process.env.NEXT_PUBLIC_MAP_STYLE = "/map-style.json";
  delete process.env.NEXT_PUBLIC_FEATURESERV_ENDPOINT;
  mockViewport = {
    west: -77.1,
    south: 38.8,
    east: -77,
    north: 38.9,
    zoom: 13,
  };
  mockLayerHandlers.clear();
  mockLayerProps.clear();
  mockLatestMapProps = null;
  mockLatestSourceProps = null;
  mockMapMountCount = 0;
  mockSelectedPlace = null;
  jest.clearAllMocks();
  window.requestAnimationFrame = jest.fn((callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
});

afterEach(() => {
  jest.useRealTimers();
});

it("loads initial, settled pan, and settled zoom data into one mounted MapLibre source", async () => {
  const fetchMock = installFetchMock();
  const view = await renderLoadedMap(fetchMock);
  fetchMock
    .mockResolvedValueOnce(jsonResponse(places("initial")))
    .mockResolvedValueOnce(jsonResponse(places("panned")))
    .mockResolvedValueOnce(jsonResponse(places("zoomed")));

  const mapNode = screen.getByTestId("maplibre-map");
  expect(screen.getByRole("status")).toHaveTextContent("Loading places");
  await runDebounce();

  expect(mockLatestSourceProps?.data?.features[0].properties).toMatchObject({
    name: "initial",
    category: 7,
  });
  const categoryFilter = mockLayerProps.get("paint_category_rooftop")?.filter;
  expect(categoryFilter).toEqual([
    "all",
    ["!", ["has", "point_count"]],
    ["==", ["get", "category"], 7],
  ]);
  expect(evaluateFilter(categoryFilter, { category: 7 })).toBe(true);
  expect(evaluateFilter(categoryFilter, { category: 7, point_count: 3 })).toBe(
    false
  );
  expect(evaluateFilter(categoryFilter, { category: 8 })).toBe(false);

  const clickHandler = getOnlyLayerHandler("click", "paint_category_rooftop");
  act(() => {
    clickHandler({
      features: [
        {
          geometry: { type: "Point", coordinates: [-77, 39] },
          properties: mockLatestSourceProps?.data?.features[0]
            .properties as Record<string, unknown>,
        },
      ],
      lngLat: { lng: -77 },
      point: { x: 0, y: 0 },
    });
  });
  expect(screen.getByTestId("place-card")).toHaveTextContent("initial");
  expect(mockSelectedPlace).toMatchObject({ place_id: 1, category: 7 });

  mockViewport = { ...mockViewport, west: -76.9, east: -76.8 };
  fireEvent.click(screen.getByTestId("map-move-end"));
  expect(screen.getByRole("status")).toHaveTextContent("Refreshing places");
  await runDebounce();
  expect(mockLatestSourceProps?.data?.features[0].properties?.name).toBe(
    "panned"
  );

  mockViewport = { ...mockViewport, zoom: 16 };
  fireEvent.click(screen.getByTestId("map-move-end"));
  await runDebounce();
  expect(mockLatestSourceProps?.data?.features[0].properties?.name).toBe(
    "zoomed"
  );

  const viewportUrls = fetchMock.mock.calls
    .map(([url]) => String(url))
    .filter((url) => url.startsWith("/api/smokemap/locations"));
  expect(viewportUrls).toEqual([
    "/api/smokemap/locations?bbox=-77.1%2C38.8%2C-77%2C38.9&zoom=13",
    "/api/smokemap/locations?bbox=-76.9%2C38.8%2C-76.8%2C38.9&zoom=13",
    "/api/smokemap/locations?bbox=-76.9%2C38.8%2C-76.8%2C38.9&zoom=16",
  ]);
  expect(screen.getByTestId("maplibre-map")).toBe(mapNode);
  expect(mockMapMountCount).toBe(1);
  view.unmount();
});

it("synchronizes async category handlers after load without duplicates", async () => {
  const fetchMock = installFetchMock();
  const categoriesRequest = deferred<{
    data: { categories: typeof mockCategories };
  }>();
  mockCategoriesRequest = categoriesRequest.promise;
  fetchMock.mockResolvedValueOnce(jsonResponse(style));

  const view = render(<MapComponent />);
  await flushPromises();
  expect(mockLatestMapProps?.interactiveLayerIds).toEqual(["clusters"]);

  fireEvent.click(screen.getByTestId("map-load"));
  expect(mockLayerHandlers.has("click:paint_category_rooftop")).toBe(false);

  categoriesRequest.resolve({ data: { categories: mockCategories } });
  await flushPromises();
  expect(mockLatestMapProps?.interactiveLayerIds).toEqual([
    "clusters",
    "paint_category_rooftop",
  ]);

  const firstClickHandler = getOnlyLayerHandler(
    "click",
    "paint_category_rooftop"
  );
  const firstEnterHandler = getOnlyLayerHandler(
    "mouseenter",
    "paint_category_rooftop"
  );
  const firstLeaveHandler = getOnlyLayerHandler(
    "mouseleave",
    "paint_category_rooftop"
  );

  fireEvent.click(screen.getByTestId("map-load"));
  const nextClickHandler = getOnlyLayerHandler(
    "click",
    "paint_category_rooftop"
  );
  expect(nextClickHandler).not.toBe(firstClickHandler);
  expect(mockMapApi.off).toHaveBeenCalledWith(
    "click",
    "paint_category_rooftop",
    firstClickHandler
  );
  expect(mockMapApi.off).toHaveBeenCalledWith(
    "mouseenter",
    "paint_category_rooftop",
    firstEnterHandler
  );
  expect(mockMapApi.off).toHaveBeenCalledWith(
    "mouseleave",
    "paint_category_rooftop",
    firstLeaveHandler
  );

  view.unmount();
  expect(mockLayerHandlers.has("click:paint_category_rooftop")).toBe(false);
  expect(mockLayerHandlers.has("mouseenter:paint_category_rooftop")).toBe(
    false
  );
  expect(mockLayerHandlers.has("mouseleave:paint_category_rooftop")).toBe(
    false
  );
});

it("coalesces settled move-end changes into only the newest viewport request", async () => {
  const fetchMock = installFetchMock();
  await renderLoadedMap(fetchMock);
  fetchMock
    .mockResolvedValueOnce(jsonResponse(places("initial")))
    .mockResolvedValueOnce(jsonResponse(places("newest")));
  await runDebounce();

  mockViewport = { ...mockViewport, west: -77, east: -76.9, zoom: 14 };
  fireEvent.click(screen.getByTestId("map-move-end"));
  await advanceTimers(80);

  mockViewport = { ...mockViewport, west: -76.9, east: -76.8, zoom: 15 };
  fireEvent.click(screen.getByTestId("map-move-end"));
  await advanceTimers(80);

  mockViewport = { ...mockViewport, west: -76.8, east: -76.7, zoom: 16 };
  fireEvent.click(screen.getByTestId("map-move-end"));
  await advanceTimers(249);

  let viewportUrls = fetchMock.mock.calls
    .map(([url]) => String(url))
    .filter((url) => url.startsWith("/api/smokemap/locations"));
  expect(viewportUrls).toEqual([
    "/api/smokemap/locations?bbox=-77.1%2C38.8%2C-77%2C38.9&zoom=13",
  ]);

  await advanceTimers(1);
  viewportUrls = fetchMock.mock.calls
    .map(([url]) => String(url))
    .filter((url) => url.startsWith("/api/smokemap/locations"));
  expect(viewportUrls).toEqual([
    "/api/smokemap/locations?bbox=-77.1%2C38.8%2C-77%2C38.9&zoom=13",
    "/api/smokemap/locations?bbox=-76.8%2C38.8%2C-76.7%2C38.9&zoom=16",
  ]);
});

it("aborts and ignores a stale viewport response at the MapLibre source", async () => {
  const fetchMock = installFetchMock();
  const oldRequest = deferred<Response>();
  const currentRequest = deferred<Response>();
  await renderLoadedMap(fetchMock);
  fetchMock
    .mockReturnValueOnce(oldRequest.promise)
    .mockReturnValueOnce(currentRequest.promise);

  await runDebounce();
  const oldSignal = fetchMock.mock.calls[1][1]?.signal;

  mockViewport = { ...mockViewport, west: -76.9, east: -76.8 };
  fireEvent.click(screen.getByTestId("map-move-end"));
  expect(oldSignal?.aborted).toBe(true);
  await runDebounce();

  await act(async () => {
    currentRequest.resolve(jsonResponse(places("current")));
    await currentRequest.promise;
    await Promise.resolve();
  });
  expect(mockLatestSourceProps?.data?.features[0].properties?.name).toBe(
    "current"
  );

  await act(async () => {
    oldRequest.resolve(jsonResponse(places("stale")));
    await oldRequest.promise;
    await Promise.resolve();
  });
  expect(mockLatestSourceProps?.data?.features[0].properties?.name).toBe(
    "current"
  );
  expect(mockMapMountCount).toBe(1);
});

it("keeps MapLibre mounted through an error, retry, and empty result", async () => {
  const fetchMock = installFetchMock();
  await renderLoadedMap(fetchMock);
  fetchMock
    .mockResolvedValueOnce(
      jsonResponse({ detail: "Zoom in or select categories" }, 400)
    )
    .mockResolvedValueOnce(jsonResponse(places()));

  const mapNode = screen.getByTestId("maplibre-map");
  await runDebounce();
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Zoom in or select categories"
  );
  expect(screen.getByTestId("maplibre-map")).toBe(mapNode);

  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  expect(screen.getByRole("status")).toHaveTextContent("Refreshing places");
  await runDebounce();
  expect(screen.getByRole("status")).toHaveTextContent(
    "No places in this area yet."
  );
  expect(mockLatestSourceProps?.data?.features).toEqual([]);
  expect(screen.getByTestId("maplibre-map")).toBe(mapNode);
  expect(mockMapMountCount).toBe(1);
});
