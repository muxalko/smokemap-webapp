import {
  StrictMode,
  type ButtonHTMLAttributes,
  type ForwardedRef,
  type ReactNode,
} from "react";
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
  latitude?: number;
  longitude?: number;
  zoom?: number;
  onLoad?: () => void;
  onIdle?: () => void;
  onMove?: (event: { viewState: Record<string, unknown> }) => void;
  onMoveEnd?: (event: { viewState: Record<string, unknown> }) => void;
};

type MockSourceProps = {
  children?: ReactNode;
  data?: FeatureCollection;
};

type MockLayerProps = Record<string, unknown> & { id?: string };
type MockLayerHandler = (event: MockMapEvent) => void;
type MockClusterExpansionCallback = (
  error?: Error | null,
  zoom?: number | null
) => void;
type MockStyleImageEvent = {
  id: string;
  target: {
    hasImage: jest.Mock;
    addImage: jest.Mock;
  };
};
type MockStyleImageHandler = (event: MockStyleImageEvent) => void;

const mockCategories = [
  {
    __typename: "CategoryType" as const,
    id: "7",
    slug: "rooftop",
    name: "Rooftop",
  },
];
const mockLayerHandlers = new Map<string, Set<MockLayerHandler>>();
const mockLayerProps = new Map<string, MockLayerProps>();
const mockStyleImageHandlers = new Set<MockStyleImageHandler>();
let mockCategoriesRequest: Promise<{
  data: { categories: typeof mockCategories };
}>;
let mockGetAllCategories: jest.Mock;
let mockViewport: MockViewport;
let mockLatestMapProps: MockMapProps | null;
let mockLatestSourceProps: MockSourceProps | null;
let mockMapMountCount: number;
let mockSelectedPlace: Record<string, unknown> | null;
let mockClusterExpansionCallback: MockClusterExpansionCallback | null;
let mockLoadMapOnMount: boolean;
let mockSynchronousMapStyle: boolean;
let mockMapRefCallback: ((map: unknown) => void) | null;

const mockRawMap = {
  on: jest.fn((event: string, handler: MockStyleImageHandler) => {
    if (event === "styleimagemissing") mockStyleImageHandlers.add(handler);
  }),
  off: jest.fn((event: string, handler: MockStyleImageHandler) => {
    if (event === "styleimagemissing") mockStyleImageHandlers.delete(handler);
  }),
};

const mockCanvas = { style: { cursor: "" } };
const mockClusterSource = {
  getClusterExpansionZoom: jest.fn(
    (_clusterId: number, callback: MockClusterExpansionCallback) => {
      mockClusterExpansionCallback = callback;
    }
  ),
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
  getCanvas: () => mockCanvas,
  getLayer: jest.fn(),
  getSource: jest.fn(() => mockClusterSource),
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
    const { onLoad } = props;
    if (typeof ref === "function") mockMapRefCallback = ref;
    const instanceId = React.useRef<number | null>(null);
    if (instanceId.current === null) {
      mockMapMountCount += 1;
      instanceId.current = mockMapMountCount;
    }
    React.useImperativeHandle(ref, () => mockMapApi, []);
    React.useLayoutEffect(() => {
      if (mockLoadMapOnMount) onLoad?.();
    }, [onLoad]);
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

jest.mock("./use-basemap-style", () => {
  const actual = jest.requireActual<typeof import("./use-basemap-style")>(
    "./use-basemap-style"
  );

  return {
    ...actual,
    useBasemapStyle: (styleUrl: string | undefined) => {
      const loadedStyle = actual.useBasemapStyle(styleUrl);
      return mockSynchronousMapStyle
        ? { version: 8 as const, sources: {}, layers: [] }
        : loadedStyle;
    },
  };
});

jest.mock("@/graphql/__generated__/types", () => ({
  useGetAllCategoriesLazyQuery: () => [
    mockGetAllCategories,
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
  mockGetAllCategories = jest.fn(() => mockCategoriesRequest);
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
  mockClusterExpansionCallback = null;
  mockLoadMapOnMount = false;
  mockSynchronousMapStyle = false;
  mockMapRefCallback = null;
  mockCanvas.style.cursor = "";
  mockStyleImageHandlers.clear();
  document.cookie = "viewport=; Max-Age=0; Path=/";
  jest.clearAllMocks();
  window.requestAnimationFrame = jest.fn((callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
});

afterEach(() => {
  document.cookie = "viewport=; Max-Age=0; Path=/";
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

it("registers and cleans up exact MapLibre callbacks under Strict Mode", async () => {
  const fetchMock = installFetchMock();
  fetchMock.mockResolvedValue(jsonResponse(style));
  mockLoadMapOnMount = true;
  mockSynchronousMapStyle = true;

  const view = render(
    <StrictMode>
      <MapComponent />
    </StrictMode>
  );
  await flushPromises();
  expect(screen.getByTestId("maplibre-map")).toBeInTheDocument();

  const registrations = mockMapApi.on.mock.calls as Array<
    [string, string, MockLayerHandler]
  >;
  const clusterClickRegistrations = registrations.filter(
    ([event, layer]) => event === "click" && layer === "clusters"
  );
  expect(clusterClickRegistrations.length).toBeGreaterThan(1);
  expect(
    new Set(clusterClickRegistrations.map(([, , handler]) => handler)).size
  ).toBe(clusterClickRegistrations.length);

  const activeHandlers = new Set(
    Array.from(mockLayerHandlers.values()).flatMap((handlers) =>
      Array.from(handlers)
    )
  );
  registrations.forEach(([event, layer, handler]) => {
    if (!activeHandlers.has(handler)) {
      expect(mockMapApi.off).toHaveBeenCalledWith(event, layer, handler);
    }
  });
  expect(mockLayerHandlers.size).toBe(6);
  expect(mockLayerHandlers.get("click:clusters")?.size).toBe(1);
  expect(
    mockLayerHandlers.get("click:paint_category_rooftop")?.size
  ).toBe(1);
  expect(mockStyleImageHandlers.size).toBe(1);

  const clusterEvent: MockMapEvent = {
    features: [
      {
        geometry: { type: "Point", coordinates: [-77, 39] },
        properties: { cluster_id: 42 },
      },
    ],
    lngLat: { lng: -77 },
    point: { x: 0, y: 0 },
  };
  clusterClickRegistrations[0][2](clusterEvent);
  expect(mockClusterExpansionCallback).toBeNull();

  const styleRegistrations = mockRawMap.on.mock.calls
    .filter(([event]) => event === "styleimagemissing")
    .map(([, handler]) => handler);
  expect(styleRegistrations.length).toBeGreaterThan(1);
  expect(new Set(styleRegistrations).size).toBe(styleRegistrations.length);
  const staleStyleEvent: MockStyleImageEvent = {
    id: "stale-image",
    target: { hasImage: jest.fn(() => false), addImage: jest.fn() },
  };
  styleRegistrations[0](staleStyleEvent);
  expect(staleStyleEvent.target.addImage).not.toHaveBeenCalled();

  const clusterClickHandler = getOnlyLayerHandler("click", "clusters");
  const categoryClickHandler = getOnlyLayerHandler(
    "click",
    "paint_category_rooftop"
  );
  const clusterMouseEnterHandler = getOnlyLayerHandler(
    "mouseenter",
    "clusters"
  );
  clusterClickHandler(clusterEvent);
  expect(mockClusterExpansionCallback).toEqual(expect.any(Function));

  const styleImageHandler = Array.from(mockStyleImageHandlers)[0];

  view.unmount();

  expect(mockLayerHandlers.size).toBe(0);
  registrations.forEach(([event, layer, handler]) => {
    expect(mockMapApi.off).toHaveBeenCalledWith(event, layer, handler);
  });
  expect(mockStyleImageHandlers.size).toBe(0);
  expect(mockRawMap.off).toHaveBeenCalledWith(
    "styleimagemissing",
    styleImageHandler
  );

  mockClusterExpansionCallback?.(null, 16);
  categoryClickHandler({
    features: [
      {
        geometry: { type: "Point", coordinates: [-77, 39] },
        properties: { name: "stale place" },
      },
    ],
    lngLat: { lng: -77 },
    point: { x: 0, y: 0 },
  });
  clusterMouseEnterHandler({
    lngLat: { lng: -77 },
    point: { x: 0, y: 0 },
  });
  styleImageHandler(staleStyleEvent);

  expect(mockMapApi.easeTo).not.toHaveBeenCalled();
  expect(mockSelectedPlace).toBeNull();
  expect(mockCanvas.style.cursor).toBe("");
  expect(staleStyleEvent.target.addImage).not.toHaveBeenCalled();
});

it("ignores stale MapLibre props and animation frames after same-map reattachment", async () => {
  const scheduledFrames: FrameRequestCallback[] = [];
  window.requestAnimationFrame = jest.fn((callback: FrameRequestCallback) => {
    scheduledFrames.push(callback);
    return scheduledFrames.length;
  });
  window.cancelAnimationFrame = jest.fn();

  const fetchMock = installFetchMock();
  fetchMock
    .mockResolvedValueOnce(jsonResponse(style))
    .mockResolvedValueOnce(jsonResponse(places("current")));
  const view = render(<MapComponent />);
  await flushPromises();
  expect(screen.getByTestId("maplibre-map")).toBeInTheDocument();

  fireEvent.click(screen.getByTestId("map-load"));
  expect(scheduledFrames).toHaveLength(1);
  const staleProps = mockLatestMapProps;
  const staleFrame = scheduledFrames[0];
  expect(staleProps?.onLoad).toEqual(expect.any(Function));
  expect(staleProps?.onIdle).toEqual(expect.any(Function));
  expect(staleProps?.onMove).toEqual(expect.any(Function));
  expect(staleProps?.onMoveEnd).toEqual(expect.any(Function));
  expect(mockMapRefCallback).toEqual(expect.any(Function));

  act(() => mockMapRefCallback?.(null));
  act(() => mockMapRefCallback?.(mockMapApi));
  const currentProps = mockLatestMapProps;
  expect(currentProps?.onLoad).not.toBe(staleProps?.onLoad);
  expect(currentProps?.onIdle).not.toBe(staleProps?.onIdle);
  expect(currentProps?.onMove).not.toBe(staleProps?.onMove);
  expect(currentProps?.onMoveEnd).not.toBe(staleProps?.onMoveEnd);

  act(() => currentProps?.onLoad?.());
  expect(scheduledFrames).toHaveLength(2);

  const staleViewState = {
    latitude: 51,
    longitude: 4,
    zoom: 20,
    bearing: 0,
    pitch: 0,
    padding: { top: 0, bottom: 0, left: 0, right: 0 },
  };
  act(() => {
    staleProps?.onLoad?.();
    staleProps?.onMove?.({ viewState: staleViewState });
    staleProps?.onMoveEnd?.({ viewState: staleViewState });
    staleFrame(0);
  });

  expect(scheduledFrames).toHaveLength(2);
  expect(window.cancelAnimationFrame).toHaveBeenCalledTimes(1);
  expect(mockLatestMapProps?.latitude).not.toBe(staleViewState.latitude);
  expect(document.cookie).not.toContain("viewport=");
  expect(
    fetchMock.mock.calls.filter(([url]) =>
      String(url).startsWith("/api/smokemap/locations")
    )
  ).toHaveLength(0);

  const currentViewState = {
    latitude: 40.7,
    longitude: -74,
    zoom: 16,
    bearing: 5,
    pitch: 10,
    padding: { top: 10, bottom: 25, left: 15, right: 5 },
  };
  mockViewport = {
    west: -74.1,
    south: 40.6,
    east: -73.9,
    north: 40.8,
    zoom: currentViewState.zoom,
  };
  act(() => {
    currentProps?.onMove?.({ viewState: currentViewState });
    currentProps?.onMoveEnd?.({ viewState: currentViewState });
    scheduledFrames[1](0);
  });

  expect(mockLatestMapProps).toMatchObject({
    latitude: currentViewState.latitude,
    longitude: currentViewState.longitude,
    zoom: currentViewState.zoom,
  });
  expect(document.cookie).toContain("viewport=");
  await runDebounce();
  expect(
    fetchMock.mock.calls
      .map(([url]) => String(url))
      .filter((url) => url.startsWith("/api/smokemap/locations"))
  ).toEqual([
    "/api/smokemap/locations?bbox=-74.1%2C40.6%2C-73.9%2C40.8&zoom=16",
  ]);

  view.unmount();
});

it("clears the captured detached map cursor without changing the newer map", async () => {
  const fetchMock = installFetchMock();
  fetchMock.mockResolvedValueOnce(jsonResponse(style));
  const view = render(<MapComponent />);
  await flushPromises();

  const detachedCanvas = { style: { cursor: "" } };
  const newerCanvas = { style: { cursor: "wait" } };
  const detachedMap = {
    ...mockMapApi,
    getCanvas: () => detachedCanvas,
  };
  const newerMap = {
    ...mockMapApi,
    getCanvas: () => newerCanvas,
  };

  act(() => mockMapRefCallback?.(detachedMap));
  const detachedProps = mockLatestMapProps;
  act(() => detachedProps?.onLoad?.());
  detachedCanvas.style.cursor = "pointer";

  act(() => mockMapRefCallback?.(newerMap));

  expect(detachedCanvas.style.cursor).toBe("");
  expect(newerCanvas.style.cursor).toBe("wait");

  view.unmount();
});

it("restores and updates the persisted viewport without remounting MapLibre", async () => {
  const savedViewport = {
    latitude: 40.7,
    longitude: -74,
    zoom: 15,
    bearing: 5,
    pitch: 10,
    padding: { top: 10, bottom: 25, left: 15, right: 5 },
  };
  document.cookie = `viewport=${encodeURIComponent(
    JSON.stringify(savedViewport)
  )}; Path=/`;
  const fetchMock = installFetchMock();
  const view = await renderLoadedMap(fetchMock);

  expect(mockLatestMapProps).toMatchObject({
    latitude: savedViewport.latitude,
    longitude: savedViewport.longitude,
    zoom: savedViewport.zoom,
  });
  const mapNode = screen.getByTestId("maplibre-map");

  mockViewport = { ...mockViewport, zoom: 17 };
  fireEvent.click(screen.getByTestId("map-move-end"));
  const persisted = JSON.parse(
    decodeURIComponent(
      document.cookie
        .split("; ")
        .find((cookie) => cookie.startsWith("viewport="))!
        .slice("viewport=".length)
    )
  ) as { zoom: number };

  expect(persisted.zoom).toBe(17);
  expect(screen.getByTestId("maplibre-map")).toBe(mapNode);
  expect(mockMapMountCount).toBe(1);
  view.unmount();
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
