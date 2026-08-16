import type { MapStyleImageMissingEvent } from "maplibre-gl";
import {
  addMissingBasemapImage,
  BasemapStyle,
  normalizeBasemapStyle,
} from "./basemap-style";

describe("normalizeBasemapStyle", () => {
  it("gives nullable road reference lengths a non-matching numeric fallback", () => {
    const style = {
      version: 8,
      sources: {},
      layers: [
        {
          id: "road-shield",
          type: "symbol",
          filter: ["<=", ["get", "ref_length"], 6],
          layout: {},
        },
      ],
    } as unknown as BasemapStyle;

    const normalized = normalizeBasemapStyle(undefined, style);

    const normalizedLayer = normalized.layers[0];
    const originalLayer = style.layers[0];

    expect(normalizedLayer && "filter" in normalizedLayer
      ? normalizedLayer.filter
      : undefined
    ).toEqual([
      "<=",
      ["number", ["get", "ref_length"], 7],
      6,
    ]);
    expect(originalLayer && "filter" in originalLayer
      ? originalLayer.filter
      : undefined
    ).toEqual([
      "<=",
      ["get", "ref_length"],
      6,
    ]);
  });
});

describe("addMissingBasemapImage", () => {
  it("registers a transparent fallback under the requested image name", () => {
    const addImage = jest.fn();
    const event = {
      id: "sports_centre",
      target: { hasImage: () => false, addImage },
    } as unknown as MapStyleImageMissingEvent;

    addMissingBasemapImage(event);

    expect(addImage).toHaveBeenCalledWith("sports_centre", {
      width: 1,
      height: 1,
      data: new Uint8Array([0, 0, 0, 0]),
    });
  });

  it("does not replace an image that has already been registered", () => {
    const addImage = jest.fn();
    const event = {
      id: "marker",
      target: { hasImage: () => true, addImage },
    } as unknown as MapStyleImageMissingEvent;

    addMissingBasemapImage(event);

    expect(addImage).not.toHaveBeenCalled();
  });
});
