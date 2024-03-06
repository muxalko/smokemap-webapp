import { CategoryType } from "@/graphql/__generated__/types";
import clogger from "@/lib/clogger";
import * as React from "react";
import { useState, Fragment } from "react";
import { Layer, SymbolLayer } from "react-map-gl/maplibre";

export default function CategoryLayers({
  sourceLayerId,
  categories,
  selector,
}: {
  sourceLayerId: string;
  categories: CategoryType[];
  selector: Map<string, boolean>;
}): React.ReactElement<SymbolLayer> {
  clogger.debug(
    {
      sourceLayerId: sourceLayerId,
      categories: categories,
      selector: selector,
    },
    "CategoryLayers() fired"
  );
  const symbolLayerIdName = "symbol_name";
  const symbolLayerIdCategory = "symbol_category";
  const paintLayerIdCategory = "paint_category";
  const colors: Map<string, string> = new Map([
    ["-1", "#FFFFFF"],
    ["1", "#277551"],
    ["2", "#ebeb96"],
    ["3", "#00fe08"],
    ["4", "#2472a9"],
    ["5", "#de22f6"],
    ["6", "#8dbd8e"],
    ["7", "#96642f"],
    ["8", "#4869bd"],
    ["9", "#7ecece"],
    ["10", "#40c9b2"],
  ]);

  return (
    <>
      {categories.map((item: CategoryType) => (
        <Fragment key={item.id}>
          <Layer
            {...{
              id: paintLayerIdCategory + "_" + item.name,
              source: sourceLayerId,
              type: "circle",
              filter: ["==", ["get", "category"], Number(item.id)],
              // filter: [
              //   "==",
              //   ["!", ["has", "point_count"]],
              //   ["==", ["get", "category"], Number(item.id)],
              // ],
              paint: {
                "circle-color": colors.get(item.id),
                // "#" +
                // Math.floor(Math.random() * 16777215)
                //   .toString(16)
                //   .padStart(6, "0"),
                "circle-radius": selector.get(item.id) ? 10 : 0,
                "circle-stroke-width": 0,
                "circle-stroke-color": "#000",
              },
            }}
          />
          <Layer
            {...{
              id: symbolLayerIdCategory + "_" + item.name,
              type: "symbol",
              source: sourceLayerId,
              filter: ["==", ["get", "category"], Number(item.id)],
              layout: {
                visibility: selector.get(item.id) ? "visible" : "none",
                "text-allow-overlap": true,
                "text-font": ["Arial Italic"],
                "text-field": item.name,
                "text-size": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  // zoom is 5 (or less)
                  5,
                  12,
                  // zoom is 10 (or greater)
                  10,
                  11,
                ],
                "text-anchor": "top",
                // "text-offset": [0, -2],
              },
            }}
          />
          {/* <Layer
            {...{
              id: symbolLayerIdName + "_" + item.name,
              type: "symbol",
              source: sourceLayerId,
              filter: ["==", ["get", "category"], Number(item.id)],
              layout: {
                visibility: selector.get(item.id) ? "visible" : "none",
                "text-allow-overlap": true,
                "text-font": ["Arial Italic"],
                "text-field": ["get", "name"],
                "text-size": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  // zoom is 5 (or less)
                  5,
                  12,
                  // zoom is 10 (or greater)
                  10,
                  11,
                ],
                "text-anchor": "bottom",
                // "text-offset": [0, -2],
              },
            }}
          /> */}
        </Fragment>
      ))}
    </>
  );
}
