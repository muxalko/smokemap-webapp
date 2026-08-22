import { render, screen } from "@/test/render";
import { ViewportStatus } from "./viewport-status";

const points = (count: number) => ({
  type: "FeatureCollection" as const,
  features: Array.from({ length: count }, (_, index) => ({
    type: "Feature" as const,
    geometry: { type: "Point" as const, coordinates: [index, index] },
    properties: {},
  })),
});

it("renders deterministic loading, error, empty, and success states", () => {
  const retry = jest.fn();
  const view = render(
    <ViewportStatus loading error={null} points={points(0)} />
  );
  expect(screen.getByRole("status")).toHaveTextContent("Loading places");
  view.rerender(
    <ViewportStatus loading hasLoaded error={null} points={points(1)} />
  );
  expect(screen.getByRole("status")).toHaveTextContent("Refreshing places");
  view.rerender(
    <ViewportStatus
      loading={false}
      error="Unable to load places"
      points={points(0)}
      onRetry={retry}
    />
  );
  expect(screen.getByRole("alert")).toHaveTextContent("Unable to load places");
  screen.getByRole("button", { name: "Retry" }).click();
  expect(retry).toHaveBeenCalledTimes(1);
  view.rerender(
    <ViewportStatus loading={false} error={null} points={points(0)} />
  );
  expect(screen.getByRole("status")).toHaveTextContent(
    "No places in this area yet."
  );
  view.rerender(
    <ViewportStatus loading={false} error={null} points={points(1)} />
  );
  expect(screen.queryByRole("status")).toBeNull();
  expect(screen.queryByRole("alert")).toBeNull();
});
