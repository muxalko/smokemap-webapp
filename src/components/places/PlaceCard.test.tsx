import { MockedProvider, type MockedResponse } from "@apollo/client/testing";
import { print } from "graphql";
import type { HTMLAttributes, ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@/test/render";
import {
  GetPlaceByIdDocument,
  type GetPlaceByIdQuery,
  type GetPlaceByIdQueryVariables,
} from "@/graphql/__generated__/types";
import { GET_PLACE_BY_ID } from "@/graphql/queries/gql";
import PlaceCard, {
  placeDetailsQueryOptions,
  type SimplePlaceType,
} from "./PlaceCard";

jest.mock("@/components/ui/carousel", () => ({
  Carousel: ({ children, ...props }: HTMLAttributes<HTMLDivElement>) => (
    <div {...props}>{children}</div>
  ),
  CarouselContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  CarouselItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CarouselPrevious: () => <button type="button">Previous slide</button>,
  CarouselNext: () => <button type="button">Next slide</button>,
}));

const selectedPlace: SimplePlaceType = {
  place_id: 42,
  name: "Selected place",
  category: 7,
  description: "Map summary",
  address: "Map address",
  tags: [],
  images: [],
};

type Media = NonNullable<GetPlaceByIdQuery["placeById"]>["media"][number];

function media(
  publicId: string,
  position: number,
  url = `/public/${publicId}`
): Media {
  return {
    __typename: "PublicMediaRenditionType",
    publicId,
    url,
    position,
    mimeType: "image/webp",
    byteSize: 1234,
    width: 640,
    height: 480,
  };
}

function result(items: Media[]): GetPlaceByIdQuery {
  return {
    placeById: {
      __typename: "PlaceType",
      id: "42",
      name: "Approved place",
      description: "Approved description",
      category: { __typename: "CategoryType", name: "Rooftop" },
      address: {
        __typename: "AddressType",
        properties: {
          __typename: "AddressProperties",
          addressString: "42 Main Street",
        },
        geometry: { __typename: "GeometryObjectType", coordinates: [1, 2] },
      },
      media: items,
    },
  };
}

function queryMock(
  response?: GetPlaceByIdQuery,
  error?: Error
): MockedResponse<GetPlaceByIdQuery, GetPlaceByIdQueryVariables> {
  return {
    request: { query: GetPlaceByIdDocument, variables: { id: "42" } },
    ...(error ? { error } : { result: { data: response ?? result([]) } }),
  };
}

function renderCard(mocks: MockedResponse[] = [queryMock()]) {
  return render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <PlaceCard place={selectedPlace} />
    </MockedProvider>
  );
}

it("queries only the approved public-media contract", () => {
  const document = print(GetPlaceByIdDocument);

  expect(print(GET_PLACE_BY_ID)).toBe(document);
  expect(document).toContain(
    "media {\n      publicId\n      url\n      position\n      mimeType\n      byteSize\n      width\n      height"
  );
  expect(document).not.toContain("imageSet");
});

it("bypasses Apollo and browser caches for every detail read", () => {
  expect(placeDetailsQueryOptions(42)).toEqual({
    variables: { id: "42" },
    fetchPolicy: "no-cache",
    nextFetchPolicy: "no-cache",
    notifyOnNetworkStatusChange: true,
    context: { fetchOptions: { cache: "no-store" } },
  });
});

it("shows a deliberate zero-photo state without carousel controls", async () => {
  renderCard();

  expect(screen.getByRole("status")).toHaveTextContent("Loading place details");
  expect(
    await screen.findByText("No approved photos for this place.")
  ).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Previous slide" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Next slide" })).toBeNull();
});

it("uses the supplied opaque URL for one photo without carousel controls", async () => {
  const opaqueUrl = "/api/v1/media/4dcf22a0-opaque/";
  renderCard([queryMock(result([media("public-1", 0, opaqueUrl)]))]);

  const image = await screen.findByAltText("Approved place view 1");
  expect(image).toHaveAttribute("src", opaqueUrl);
  expect(image).toHaveAttribute("width", "640");
  expect(image).toHaveAttribute("height", "480");
  expect(screen.queryByRole("button", { name: "Previous slide" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Next slide" })).toBeNull();
});

it("renders multiple photos in the backend-provided order", async () => {
  renderCard([
    queryMock(
      result([
        media("public-third", 2, "/public/backend-first"),
        media("public-first", 0, "/public/backend-second"),
      ])
    ),
  ]);

  const images = await screen.findAllByRole("img");
  expect(images.map((image) => image.getAttribute("src"))).toEqual([
    "/public/backend-first",
    "/public/backend-second",
  ]);
  expect(
    screen.getByRole("button", { name: "Previous slide" })
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Next slide" })
  ).toBeInTheDocument();
});

it("contains revoked or unavailable image failures inside the detail card", async () => {
  renderCard([queryMock(result([media("revoked", 0, "/public/revoked")]))]);
  const image = await screen.findByAltText("Approved place view 1");

  fireEvent.error(image);

  expect(screen.getByRole("alert")).toHaveTextContent("Photo unavailable.");
  expect(screen.queryByAltText("Approved place view 1")).toBeNull();
  expect(screen.getByText("Approved place")).toBeInTheDocument();
});

it("contains query failures and refetches safely", async () => {
  renderCard([
    queryMock(undefined, new Error("private backend detail")),
    queryMock(),
  ]);

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Place details are unavailable."
  );
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));

  expect(
    await screen.findByText("No approved photos for this place.")
  ).toBeInTheDocument();
  expect(screen.queryByText("private backend detail")).toBeNull();
});

it("reopening detail fetches publication truth instead of retaining revoked media", async () => {
  const first = queryMock(
    result([media("later-revoked", 0, "/public/later-revoked")])
  );
  const second = queryMock(result([]));
  const view = render(
    <MockedProvider mocks={[first, second]} addTypename={false}>
      <PlaceCard place={selectedPlace} />
    </MockedProvider>
  );

  expect(await screen.findByAltText("Approved place view 1")).toHaveAttribute(
    "src",
    "/public/later-revoked"
  );

  view.rerender(
    <MockedProvider mocks={[first, second]} addTypename={false}>
      {null}
    </MockedProvider>
  );
  view.rerender(
    <MockedProvider mocks={[first, second]} addTypename={false}>
      <PlaceCard place={selectedPlace} />
    </MockedProvider>
  );

  await waitFor(() => {
    expect(
      screen.getByText("No approved photos for this place.")
    ).toBeInTheDocument();
  });
  expect(screen.queryByAltText("Approved place view 1")).toBeNull();
});
