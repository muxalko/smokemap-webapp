import { print } from "graphql";
import * as queries from "@/graphql/queries/gql";
import { act, fireEvent, render, screen } from "@/test/render";
import { installFetchMock, jsonResponse } from "@/test/network";
import { MapSearch } from "@/components/map/map-search";
import Search from "./Search";
import {
  PLACE_SEARCH_DEBOUNCE_MS,
  PLACE_SEARCH_DEFAULT_LIMIT,
  PLACE_SEARCH_ENDPOINT,
  PLACE_SEARCH_RESULT_CAP,
  buildPlaceSearchUrl,
  normalizePlaceSearchQuery,
  parsePlaceSearchResponse,
} from "./place-search";

type Deferred = {
  resolve: (response: Response) => void;
  reject: (reason: unknown) => void;
};

function apiResult(id: number, overrides: Record<string, unknown> = {}) {
  return {
    id,
    name: `Alpha Place ${id}`,
    address: `${id} Main Street`,
    location: { type: "Point", coordinates: [-77 + id / 100, 38.9] },
    category: { id: 7, slug: "rooftop", name: "Rooftop" },
    match: "prefix",
    ...overrides,
  };
}

function searchResponse(query: string, results: unknown[], limit = 10) {
  return jsonResponse({ query, limit, results });
}

function requestUrl(fetchMock: jest.MockedFunction<typeof fetch>, call = 0) {
  return new URL(fetchMock.mock.calls[call][0] as string, "http://test");
}

function requestSignal(
  fetchMock: jest.MockedFunction<typeof fetch>,
  call = 0
) {
  return (fetchMock.mock.calls[call][1] as RequestInit).signal as AbortSignal;
}

async function advance(milliseconds: number) {
  await act(async () => {
    jest.advanceTimersByTime(milliseconds);
    await Promise.resolve();
  });
}

async function settle() {
  await act(async () => {
    await Promise.resolve();
  });
}

function input() {
  return screen.getByRole("combobox", { name: "Search places" });
}

function type(value: string) {
  fireEvent.change(input(), { target: { value } });
}

let fetchMock: jest.MockedFunction<typeof fetch>;

beforeEach(() => {
  jest.useFakeTimers();
  fetchMock = installFetchMock();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("place search contract", () => {
  it("builds the bounded same-origin search request", () => {
    expect(
      buildPlaceSearchUrl(PLACE_SEARCH_ENDPOINT, "alpha lounge", 10)
    ).toBe("/api/smokemap/places/search?q=alpha+lounge&limit=10");
    expect(buildPlaceSearchUrl("/search?x=1", "ab", 500)).toBe(
      `/search?x=1&q=ab&limit=${PLACE_SEARCH_RESULT_CAP}`
    );
    expect(buildPlaceSearchUrl(PLACE_SEARCH_ENDPOINT, "ab", 0)).toContain(
      "limit=1"
    );
  });

  it("normalizes queries like the backend before length checks", () => {
    expect(normalizePlaceSearchQuery(" \tＡLPhA\n  Lounge  ")).toBe(
      "alpha lounge"
    );
    expect(normalizePlaceSearchQuery("   ")).toBe("");
  });

  it("drops malformed results and never exceeds the requested limit", () => {
    const body = {
      results: [
        ...Array.from({ length: 25 }, (_, index) => apiResult(index + 1)),
        { id: 99, name: "No location" },
      ],
    };
    expect(parsePlaceSearchResponse(body, 5)).toHaveLength(5);
    expect(parsePlaceSearchResponse(body, 100)).toHaveLength(
      PLACE_SEARCH_RESULT_CAP
    );
    expect(parsePlaceSearchResponse({ results: [{ id: 1 }] }, 10)).toEqual([]);
    expect(() => parsePlaceSearchResponse({}, 10)).toThrow(
      "Search response was not valid"
    );
  });

  it("keeps no GraphQL document that downloads the full place collection", () => {
    const documents = Object.values(queries).map((document) => print(document));
    for (const document of documents) {
      expect(document).not.toMatch(/\bplaces(Names|StartwithName)?\b/);
    }
  });
});

describe("Search combobox", () => {
  it("stays idle and does not request short queries", async () => {
    render(<Search onSelect={jest.fn()} />);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();

    type("a");
    expect(screen.getByRole("status")).toHaveTextContent(
      "Type at least 2 characters to search."
    );
    type("  a  ");
    await advance(PLACE_SEARCH_DEBOUNCE_MS * 2);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(input()).toHaveAttribute("aria-expanded", "false");
    expect(input()).toHaveAttribute("maxLength", "100");
  });

  it("debounces keystrokes into one bounded request", async () => {
    fetchMock.mockResolvedValue(searchResponse("alph", [apiResult(1)]));
    render(<Search onSelect={jest.fn()} />);

    type("al");
    await advance(100);
    type("alp");
    await advance(100);
    type("  ALPH ");
    expect(screen.getByRole("status")).toHaveTextContent("Searching…");
    await advance(PLACE_SEARCH_DEBOUNCE_MS - 1);
    expect(fetchMock).not.toHaveBeenCalled();

    await advance(1);
    await settle();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = requestUrl(fetchMock);
    expect(url.pathname).toBe(PLACE_SEARCH_ENDPOINT);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      q: "alph",
      limit: String(PLACE_SEARCH_DEFAULT_LIMIT),
    });
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "GET" });
    expect(screen.getByRole("status")).toHaveTextContent("1 place found.");
  });

  it("renders at most the requested number of results", async () => {
    fetchMock.mockResolvedValue(
      searchResponse(
        "alpha",
        Array.from({ length: 25 }, (_, index) => apiResult(index + 1))
      )
    );
    render(<Search onSelect={jest.fn()} />);

    type("alpha");
    await advance(PLACE_SEARCH_DEBOUNCE_MS);
    await settle();

    expect(screen.getAllByRole("option")).toHaveLength(
      PLACE_SEARCH_DEFAULT_LIMIT
    );
  });

  it("shows name, category and location context", async () => {
    fetchMock.mockResolvedValue(
      searchResponse("alpha", [
        apiResult(1),
        apiResult(2, { address: null, category: null }),
      ])
    );
    render(<Search onSelect={jest.fn()} />);

    type("alpha");
    await advance(PLACE_SEARCH_DEBOUNCE_MS);
    await settle();

    const [first, second] = screen.getAllByRole("option");
    expect(first).toHaveTextContent("Alpha Place 1");
    expect(first).toHaveTextContent("Rooftop · 1 Main Street");
    expect(second).toHaveTextContent("Alpha Place 2");
    expect(second).toHaveTextContent("38.90000, -76.98000");
  });

  it("shows an explicit empty state", async () => {
    fetchMock.mockResolvedValue(searchResponse("zzzz", []));
    render(<Search onSelect={jest.fn()} />);

    type("zzzz");
    await advance(PLACE_SEARCH_DEBOUNCE_MS);
    await settle();

    expect(screen.getByRole("status")).toHaveTextContent(
      "No places match “zzzz”."
    );
    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(input()).toHaveAttribute("aria-expanded", "false");
  });

  it("shows an error state and retries the same query", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ detail: "boom" }, 503))
      .mockResolvedValueOnce(searchResponse("alpha", [apiResult(1)]));
    render(<Search onSelect={jest.fn()} />);

    type("alpha");
    await advance(PLACE_SEARCH_DEBOUNCE_MS);
    await settle();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Search failed: Search failed with HTTP 503"
    );

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(screen.getByRole("status")).toHaveTextContent("Searching…");
    await advance(PLACE_SEARCH_DEBOUNCE_MS);
    await settle();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(requestUrl(fetchMock, 1).searchParams.get("q")).toBe("alpha");
    expect(screen.getAllByRole("option")).toHaveLength(1);
  });

  it("aborts superseded requests and ignores their late responses", async () => {
    const pending: Deferred[] = [];
    fetchMock.mockImplementation(
      () =>
        new Promise<Response>((resolve, reject) => {
          pending.push({ resolve, reject });
        })
    );
    render(<Search onSelect={jest.fn()} />);

    type("alpha");
    await advance(PLACE_SEARCH_DEBOUNCE_MS);
    type("alpha b");
    expect(requestSignal(fetchMock, 0).aborted).toBe(true);
    await advance(PLACE_SEARCH_DEBOUNCE_MS);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // Resolve the stale request last, even though its signal was aborted.
    pending[1].resolve(
      searchResponse("alpha b", [apiResult(2, { name: "Alpha Bar" })])
    );
    await settle();
    pending[0].resolve(
      searchResponse("alpha", [apiResult(1, { name: "Stale Alpha" })])
    );
    await settle();

    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
      expect.stringContaining("Alpha Bar"),
    ]);
    expect(screen.queryByText("Stale Alpha")).toBeNull();
  });

  it("aborts an in-flight request when the query becomes too short", async () => {
    fetchMock.mockImplementation(() => new Promise<Response>(() => undefined));
    render(<Search onSelect={jest.fn()} />);

    type("alpha");
    await advance(PLACE_SEARCH_DEBOUNCE_MS);
    type("a");

    expect(requestSignal(fetchMock).aborted).toBe(true);
    expect(screen.getByRole("status")).toHaveTextContent("Type at least 2");
  });

  it("supports keyboard navigation, Enter selection and Escape", async () => {
    const onSelect = jest.fn();
    fetchMock.mockResolvedValue(
      searchResponse("alpha", [apiResult(1), apiResult(2), apiResult(3)])
    );
    render(<Search onSelect={onSelect} />);

    act(() => input().focus());
    type("alpha");
    await advance(PLACE_SEARCH_DEBOUNCE_MS);
    await settle();
    const options = screen.getAllByRole("option");
    expect(input()).toHaveAttribute("aria-expanded", "true");
    expect(input()).not.toHaveAttribute("aria-activedescendant");

    fireEvent.keyDown(input(), { key: "ArrowDown" });
    expect(input()).toHaveAttribute("aria-activedescendant", options[0].id);
    expect(options[0]).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(input(), { key: "ArrowUp" });
    expect(input()).toHaveAttribute("aria-activedescendant", options[2].id);
    fireEvent.keyDown(input(), { key: "ArrowDown" });
    fireEvent.keyDown(input(), { key: "ArrowDown" });
    expect(input()).toHaveAttribute("aria-activedescendant", options[1].id);

    fireEvent.keyDown(input(), { key: "Enter" });
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 2,
        name: "Alpha Place 2",
        coordinates: [-76.98, 38.9],
        category: { id: 7, slug: "rooftop", name: "Rooftop" },
      })
    );
    expect(input()).toHaveValue("Alpha Place 2");
    expect(input()).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryAllByRole("option")).toHaveLength(0);

    // Selection closes the popup, so the chosen name is not searched again.
    await advance(PLACE_SEARCH_DEBOUNCE_MS);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(input(), { key: "Escape" });
    expect(input()).toHaveValue("");
  });

  it("closes on Escape and reopens with ArrowDown", async () => {
    fetchMock.mockResolvedValue(searchResponse("alpha", [apiResult(1)]));
    render(<Search onSelect={jest.fn()} />);

    type("alpha");
    await advance(PLACE_SEARCH_DEBOUNCE_MS);
    await settle();
    fireEvent.keyDown(input(), { key: "Escape" });
    expect(input()).toHaveAttribute("aria-expanded", "false");
    expect(input()).toHaveValue("alpha");

    fireEvent.keyDown(input(), { key: "ArrowDown" });
    await advance(PLACE_SEARCH_DEBOUNCE_MS);
    await settle();
    expect(input()).toHaveAttribute("aria-expanded", "true");
  });

  it("selects a result with the pointer", async () => {
    const onSelect = jest.fn();
    fetchMock.mockResolvedValue(searchResponse("alpha", [apiResult(1)]));
    render(<Search onSelect={onSelect} />);

    type("alpha");
    await advance(PLACE_SEARCH_DEBOUNCE_MS);
    await settle();
    fireEvent.click(screen.getByRole("option", { name: /Alpha Place 1/ }));

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  });
});

describe("MapSearch", () => {
  it("focuses the map and opens current place details for a selection", async () => {
    const onFlyTo = jest.fn();
    const onOpenPlace = jest.fn();
    fetchMock.mockResolvedValue(searchResponse("alpha", [apiResult(4)]));
    render(<MapSearch onFlyTo={onFlyTo} onOpenPlace={onOpenPlace} />);

    type("alpha");
    await advance(PLACE_SEARCH_DEBOUNCE_MS);
    await settle();
    fireEvent.keyDown(input(), { key: "Enter" });

    expect(onFlyTo).toHaveBeenCalledWith([-76.96, 38.9]);
    expect(onOpenPlace).toHaveBeenCalledWith({
      place_id: 4,
      name: "Alpha Place 4",
      category: 7,
      description: "",
      address: "4 Main Street",
      tags: [],
      images: [],
    });
  });
});
