import type { FeatureCollection } from "geojson";
import {
  GeolocateControl,
  Layer,
  Map as DynamicMap,
  NavigationControl,
  ScaleControl,
  Source,
  type ViewState,
} from "react-map-gl/maplibre";

import type { CategoryType } from "@/graphql/__generated__/types";
import type { BasemapStyle } from "./basemap-style";
import Crosshair from "./crosshair";
import CustomOverlay from "./custom-overlay";
import {
  clusterCountLayer,
  clusterLayer,
  MemoizedCategoryLayers,
} from "./category-layers";
import type { CategoryClusterProperties } from "./map-categories";
import type { MapLibreLifecycle } from "./use-maplibre-lifecycle";

const pointsLayerId = "places";

export interface MapCanvasProps {
  mapStyle: BasemapStyle;
  viewport: ViewState;
  lifecycle: MapLibreLifecycle;
  points: FeatureCollection;
  categories: CategoryType[];
  categoryVisibility: Map<string, boolean>;
  categoryClusterProperties: CategoryClusterProperties;
  interactiveLayerIds: string[];
  paintLayerIdCategory: string;
  trackCrosshair: boolean;
}

export function MapCanvas({
  mapStyle,
  viewport,
  lifecycle,
  points,
  categories,
  categoryVisibility,
  categoryClusterProperties,
  interactiveLayerIds,
  paintLayerIdCategory,
  trackCrosshair,
}: MapCanvasProps) {
  return (
    <DynamicMap
      reuseMaps
      {...viewport}
      ref={lifecycle.mapRef}
      style={{ width: "100%", height: "100%", display: "inline-block" }}
      mapStyle={mapStyle}
      interactiveLayerIds={[clusterLayer.id!, ...interactiveLayerIds]}
      onLoad={lifecycle.onLoad}
      onIdle={lifecycle.onIdle}
      onMove={lifecycle.onMove}
      onMoveEnd={lifecycle.onMoveEnd}
    >
      <GeolocateControl position="bottom-right" />
      <NavigationControl position="bottom-right" />
      <ScaleControl />

      {trackCrosshair && (
        <CustomOverlay>
          <Crosshair />
        </CustomOverlay>
      )}

      <Source
        type="geojson"
        data={points}
        id={pointsLayerId}
        maxzoom={14}
        cluster
        clusterRadius={30}
        clusterMinPoints={3}
        clusterMaxZoom={15}
        clusterProperties={categoryClusterProperties}
      >
        <Layer {...{ source: pointsLayerId, ...clusterLayer }} />
        <Layer {...{ source: pointsLayerId, ...clusterCountLayer }} />
        <MemoizedCategoryLayers
          sourceLayerId={pointsLayerId}
          paintLayerIdCategory={paintLayerIdCategory}
          categories={categories}
          selector={categoryVisibility}
        />
      </Source>
    </DynamicMap>
  );
}
