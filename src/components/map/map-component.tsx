// @refresh reset
import { useCallback, useEffect, useState } from "react";
import type { ViewState } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

import clogger from "@/lib/clogger";
import { CategoryFilter } from "./category-filter";
import { MapCanvas } from "./map-canvas";
import {
  paintLayerIdCategory,
  useMapCategories,
} from "./map-categories";
import {
  PlaceDetailsDialog,
  SubmissionControls,
  usePlaceDialog,
  useSubmissionLocation,
} from "./map-interactions";
import { MapSearch } from "./map-search";
import { useBasemapStyle } from "./use-basemap-style";
import { useMapLibreLifecycle } from "./use-maplibre-lifecycle";
import { ViewportStatus } from "./viewport-status";
import {
  useViewportPlaces,
  type ViewportQuery,
} from "./viewport-places";

const initialViewport: ViewState = {
  latitude: 38.89630256339336,
  longitude: -77.01215461524441,
  zoom: 13,
  bearing: 0,
  pitch: 0,
  padding: { top: 10, bottom: 25, left: 15, right: 5 },
};

function sameViewportQuery(
  current: ViewportQuery | null,
  next: ViewportQuery | null
) {
  return (
    current === next ||
    (current !== null &&
      next !== null &&
      current.zoom === next.zoom &&
      current.bbox.every((value, index) => value === next.bbox[index]))
  );
}

export default function MapComponent({
  authenticated = false,
}: {
  authenticated?: boolean;
}) {
  const [viewport, setViewport] = useState<ViewState>(initialViewport);
  const [viewportQuery, setViewportQuery] = useState<ViewportQuery | null>(
    null
  );
  const categories = useMapCategories();
  const placeDialog = usePlaceDialog();
  const submissionLocation = useSubmissionLocation([
    initialViewport.longitude,
    initialViewport.latitude,
  ]);
  const mapStyle = useBasemapStyle(process.env.NEXT_PUBLIC_MAP_STYLE);

  const handleViewportSettled = useCallback(
    (nextQuery: ViewportQuery | null) => {
      setViewportQuery((currentQuery) =>
        sameViewportQuery(currentQuery, nextQuery) ? currentQuery : nextQuery
      );
    },
    []
  );

  const lifecycle = useMapLibreLifecycle({
    interactiveLayerIds: categories.interactiveLayerIds,
    persistViewport: true,
    onViewportChange: setViewport,
    onViewportRestore: setViewport,
    onViewportSettled: handleViewportSettled,
    onCrosshairChange: submissionLocation.updateCoordinates,
    onPlaceSelect: placeDialog.selectPlace,
  });

  const places = useViewportPlaces(
    process.env.NEXT_PUBLIC_FEATURESERV_ENDPOINT ?? "/api/smokemap/locations",
    viewportQuery
  );

  useEffect(() => {
    clogger.debug(
      {
        version: process.env.NEXT_PUBLIC_VERSION,
        base_url: process.env.NEXT_PUBLIC_BASE_URL,
        graphql_endpoint: process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT,
        vercel_url: process.env.NEXT_PUBLIC_VERCEL_URL,
        backend_url: process.env.NEXT_PUBLIC_FEATURESERV_ENDPOINT,
        log_level: process.env.NEXT_PUBLIC_LOG_LEVEL,
        environment: process.env.NEXT_PUBLIC_ENVIRONMENT,
        vercel_github_commit_sha:
          process.env.NEXT_PUBLIC_VERCEL_GITHUB_COMMIT_SHA,
        vercel_github_repo_slug:
          process.env.NEXT_PUBLIC_VERCEL_GITHUB_REPO_SLUG,
        vercel_github_repo_owner:
          process.env.NEXT_PUBLIC_VERCEL_GITHUB_REPO_OWNER,
        vercel_github_repo_branch:
          process.env.NEXT_PUBLIC_VERCEL_GITHUB_REPO_BRANCH,
        vercel_github_repo_name:
          process.env.NEXT_PUBLIC_VERCEL_GITHUB_REPO_NAME,
        vercel_github_repo_url: process.env.NEXT_PUBLIC_VERCEL_GITHUB_REPO_URL,
        vercel_github_repo_url_short:
          process.env.NEXT_PUBLIC_VERCEL_GITHUB_REPO_URL_SHORT,
      },
      "App is started!"
    );
  }, []);

  return (
    <>
      <PlaceDetailsDialog state={placeDialog} />
      <MapSearch onFlyTo={lifecycle.flyToCoordinates} />
      <SubmissionControls
        authenticated={authenticated}
        categories={categories.categories}
        location={submissionLocation}
      />
      <CategoryFilter
        categories={categories.categories}
        loading={categories.loading}
        error={categories.error}
        visibility={categories.visibility}
        onCategoryChange={(categoryId, visible) => {
          if (lifecycle.hasMap()) {
            categories.setCategoryVisible(categoryId, visible);
            lifecycle.refresh();
          }
        }}
        onSelectAll={categories.selectAll}
        onSelectNone={categories.selectNone}
      />
      <ViewportStatus
        loading={places.loading}
        hasLoaded={places.hasLoaded}
        error={places.error}
        points={places.points}
        onRetry={places.retry}
      />
      {mapStyle && (
        <MapCanvas
          mapStyle={mapStyle}
          viewport={viewport}
          lifecycle={lifecycle}
          points={places.points}
          categories={categories.categories}
          categoryVisibility={categories.visibility}
          categoryClusterProperties={categories.clusterProperties}
          interactiveLayerIds={categories.interactiveLayerIds}
          paintLayerIdCategory={paintLayerIdCategory}
          trackCrosshair={submissionLocation.tracking}
        />
      )}
    </>
  );
}
