import type { MapStyleImageMissingEvent } from "maplibre-gl";
import type { MapProps } from "react-map-gl/maplibre";

export type BasemapStyle = Extract<
  NonNullable<MapProps["mapStyle"]>,
  { version: 8 }
>;

const refLengthExpression = ["get", "ref_length"];
const invalidRefLengthFallback = 7;

function normalizeExpression(value: unknown): unknown {
  if (!Array.isArray(value)) return value;

  if (
    value.length === refLengthExpression.length &&
    value.every((item, index) => item === refLengthExpression[index])
  ) {
    return ["number", refLengthExpression, invalidRefLengthFallback];
  }

  return value.map(normalizeExpression);
}

export function normalizeBasemapStyle(
  _previousStyle: BasemapStyle | undefined,
  nextStyle: BasemapStyle
): BasemapStyle {
  return {
    ...nextStyle,
    layers: nextStyle.layers.map((layer) => {
      if (!("filter" in layer) || !layer.filter) return layer;

      return {
        ...layer,
        filter: normalizeExpression(layer.filter) as typeof layer.filter,
      };
    }),
  };
}

export function addMissingBasemapImage(event: MapStyleImageMissingEvent) {
  if (event.target.hasImage(event.id)) return;

  event.target.addImage(event.id, {
    width: 1,
    height: 1,
    data: new Uint8Array([0, 0, 0, 0]),
  });
}
