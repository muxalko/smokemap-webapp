import { CategoryType } from "@/graphql/__generated__/types";
import clogger from "@/lib/clogger";
import * as React from "react";
import { useState, Fragment } from "react";
import { Layer, SymbolLayer } from "react-map-gl/maplibre";
import type { LayerProps } from "react-map-gl/maplibre";

// export const clusterLayer: LayerProps = {
//   id: "clusters",
//   type: "circle",
//   filter: ["has", "point_count"],
//   paint: {
//     "circle-color": [
//       "step",
//       ["get", "point_count"],
//       "#51bbd6",
//       100,
//       "#f1f075",
//       750,
//       "#f28cb1",
//     ],
//     "circle-radius": ["step", ["get", "point_count"], 20, 100, 30, 750, 40],
//   },
// };

// export const clusterCountLayer: LayerProps = {
//   id: "cluster-count",
//   type: "symbol",
//   filter: ["has", "point_count"],
//   layout: {
//     "text-field": "{point_count_abbreviated}",
//     "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
//     "text-size": 12,
//   },
// };

// export const unclusteredPointLayer: LayerProps = {
//   id: "unclustered-point",
//   type: "circle",
//   filter: ["!", ["has", "point_count"]],
//   paint: {
//     "circle-color": "#ff0000",
//     "circle-radius": 10,
//     "circle-stroke-width": 1,
//     "circle-stroke-color": "#000",
//   },
// };

export const clusterLayer: LayerProps = {
  id: "clusters",
  type: "circle",
  filter: ["has", "point_count"],
  paint: {
    "circle-color": [
      "step",
      ["get", "point_count"],
      "#51bbd6",
      100,
      "#f1f075",
      750,
      "#f28cb1",
    ],
    "circle-radius": ["step", ["get", "point_count"], 20, 100, 30, 750, 40],
  },
};

export const clusterCountLayer: LayerProps = {
  id: "cluster-count-total",
  type: "symbol",
  filter: ["has", "point_count"],
  layout: {
    "text-field": "Total: {point_count_abbreviated}",
    "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
    "text-size": 12,
    "text-anchor": "center",
    "text-offset": [0, 6],
  },
};

// export const clusterCountLayerBars: LayerProps = {
//   id: "cluster-count-bar",
//   type: "symbol",
//   filter: [">", ["get", "bar"], 0],
//   layout: {
//     "text-field": "Bars: {bar}",
//     "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
//     "text-size": 12,
//     "text-anchor": "bottom",
//     "text-offset": [0, -2],
//   },
// };

export const unclusteredPointLayer: LayerProps = {
  id: "unclustered-point",
  type: "circle",
  filter: ["!", ["has", "point_count"]],
  paint: {
    "circle-color": "#ff0000",
    "circle-radius": 10,
    "circle-stroke-width": 1,
    "circle-stroke-color": "#000",
  },
};

export default function CategoryLayers({
  sourceLayerId,
  paintLayerIdCategory,
  categories,
  selector,
}: {
  sourceLayerId: string;
  paintLayerIdCategory: string;
  categories: CategoryType[];
  selector: Map<string, boolean>;
}): React.ReactElement<SymbolLayer> {
  // console.log("CategoryLayers() fired");
  // clogger.debug(
  //   {
  //     sourceLayerId: sourceLayerId,
  //     categories: categories,
  //     selector: selector,
  //   },
  //   "CategoryLayers() fired"
  // );
  const symbolLayerIdName = "symbol_name";
  const symbolLayerIdCategory = "symbol_category";

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
              id:
                paintLayerIdCategory +
                "_" +
                item.name.toLowerCase().replaceAll(/ /g, "-"),
              source: sourceLayerId,
              type: "circle",
              // filter: ["==", ["get", "category"], Number(item.id)],
              filter: [
                "==",
                ["!", ["has", "point_count"]],
                ["==", ["get", "category"], Number(item.id)],
              ],
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
              id:
                symbolLayerIdCategory +
                "_" +
                item.name.toLowerCase().replaceAll(/ /g, "-"),
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
          <Layer
            {...{
              id:
                symbolLayerIdName +
                "_" +
                item.name.toLowerCase().replaceAll(/ /g, "-"),
              type: "symbol",
              source: sourceLayerId,
              filter: ["==", ["get", "category"], Number(item.id)],
              layout: {
                visibility: selector.get(item.id) ? "visible" : "none",
                "text-allow-overlap": false,
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
          />
          <Layer
            {...{
              id:
                "cluster-count-" +
                item.name.toLowerCase().replaceAll(/ /g, "-"),
              type: "symbol",
              source: sourceLayerId,
              filter: [
                ">",
                ["get", item.name.toLowerCase().replaceAll(/ /g, "_")],
                0,
              ],
              layout: {
                visibility: selector.get(item.id) ? "visible" : "none",
                "text-allow-overlap": true,
                "text-field":
                  item.name +
                  ": {" +
                  item.name.toLowerCase().replaceAll(/ /g, "_") +
                  "}",
                "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
                "text-size": 12,
                "text-ignore-placement": true,
                "text-max-width": 15,
                "text-justify": "left",
                // "symbol-placement": "point",
                // "text-padding": 1,
                "text-anchor": "center",
                "text-offset": [0, Number(item.id) - 5],
              },
            }}
          />
        </Fragment>
      ))}
    </>
  );
}

export const MemoizedCategoryLayers = React.memo(CategoryLayers);
