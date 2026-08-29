import type {
  GeoJSONSource,
  LngLatLike,
  MapStyleImageMissingEvent,
} from "maplibre-gl";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefCallback,
} from "react";
import type {
  MapLayerMouseEvent,
  MapRef,
  ViewState,
  ViewStateChangeEvent,
} from "react-map-gl/maplibre";

import type { SimplePlaceType } from "@/components/places/PlaceCard";
import clogger from "@/lib/clogger";
import { addMissingBasemapImage } from "./basemap-style";
import { clusterLayer } from "./category-layers";
import { createViewportQuery, type ViewportQuery } from "./viewport-places";

const pointsLayerId = "places";
const flyToZoomLevel = 19;
const viewportCookieName = "viewport";

type RawMap = ReturnType<MapRef["getMap"]>;

interface MapAttachment {
  map: MapRef;
}

interface MissingImageRegistration {
  attachment: MapAttachment;
  rawMap: RawMap;
  handler: (event: MapStyleImageMissingEvent) => void;
}

interface AnimationFrameRegistration {
  attachment: MapAttachment;
  id: number;
}

function readViewportCookie(): ViewState | null {
  const prefix = `${viewportCookieName}=`;
  const cookie = document.cookie
    .split("; ")
    .find((item) => item.startsWith(prefix));
  if (!cookie) return null;

  try {
    const viewState = JSON.parse(
      decodeURIComponent(cookie.slice(prefix.length))
    ) as ViewState;
    if (
      !Number.isFinite(viewState.latitude) ||
      !Number.isFinite(viewState.longitude) ||
      !Number.isFinite(viewState.zoom)
    ) {
      return null;
    }
    return viewState;
  } catch {
    return null;
  }
}

function writeViewportCookie(viewState: ViewState) {
  document.cookie = `${viewportCookieName}=${encodeURIComponent(
    JSON.stringify(viewState)
  )}; Path=/; SameSite=Lax`;
}

export interface MapLibreLifecycleOptions {
  interactiveLayerIds: string[];
  persistViewport: boolean;
  onViewportChange: (viewState: ViewState) => void;
  onViewportRestore: (viewState: ViewState) => void;
  onViewportSettled: (query: ViewportQuery | null) => void;
  onCrosshairChange: (coordinates: number[]) => void;
  onPlaceSelect: (place: SimplePlaceType) => void;
}

export interface MapLibreLifecycle {
  mapRef: RefCallback<MapRef>;
  onLoad: () => void;
  onIdle: () => void;
  onMove: (event: ViewStateChangeEvent) => void;
  onMoveEnd: (event: ViewStateChangeEvent) => void;
  flyToCoordinates: (coordinates: number[]) => void;
  hasMap: () => boolean;
  refresh: () => void;
}

export function useMapLibreLifecycle({
  interactiveLayerIds,
  persistViewport,
  onViewportChange,
  onViewportRestore,
  onViewportSettled,
  onCrosshairChange,
  onPlaceSelect,
}: MapLibreLifecycleOptions): MapLibreLifecycle {
  const mapRef = useRef<MapRef | null>(null);
  const mapAttachmentRef = useRef<MapAttachment | null>(null);
  const loadedMapAttachmentRef = useRef<MapAttachment | null>(null);
  const missingImageRegistrationRef =
    useRef<MissingImageRegistration | null>(null);
  const animationFrameRef = useRef<AnimationFrameRegistration | null>(null);
  const [propAttachment, setPropAttachment] =
    useState<MapAttachment | null>(null);
  const [loadVersion, setLoadVersion] = useState(0);

  const detachMissingImageHandler = useCallback(() => {
    const registration = missingImageRegistrationRef.current;
    missingImageRegistrationRef.current = null;
    registration?.rawMap.off(
      "styleimagemissing",
      registration.handler
    );
  }, []);

  const cancelPendingAnimationFrame = useCallback(() => {
    const registration = animationFrameRef.current;
    animationFrameRef.current = null;
    if (registration) window.cancelAnimationFrame(registration.id);
  }, []);

  const setMapRef = useCallback<RefCallback<MapRef>>(
    (nextMap) => {
      const detachedAttachment = mapAttachmentRef.current;
      cancelPendingAnimationFrame();
      mapAttachmentRef.current = null;
      loadedMapAttachmentRef.current = null;
      mapRef.current = null;
      detachMissingImageHandler();
      if (detachedAttachment) {
        detachedAttachment.map.getCanvas().style.cursor = "";
      }
      if (!nextMap) {
        setPropAttachment(null);
        return;
      }

      const attachment = { map: nextMap };
      const rawMap = nextMap.getMap();
      mapRef.current = nextMap;
      mapAttachmentRef.current = attachment;
      const handler = (event: MapStyleImageMissingEvent) => {
        const registration = missingImageRegistrationRef.current;
        if (
          registration?.attachment !== attachment ||
          mapAttachmentRef.current !== attachment
        ) {
          return;
        }
        addMissingBasemapImage(event);
      };
      missingImageRegistrationRef.current = {
        attachment,
        rawMap,
        handler,
      };
      rawMap.on("styleimagemissing", handler);
      setPropAttachment(attachment);
    },
    [cancelPendingAnimationFrame, detachMissingImageHandler]
  );

  const settleViewport = useCallback(() => {
    if (!propAttachment || mapAttachmentRef.current !== propAttachment) {
      return;
    }
    onViewportSettled(
      createViewportQuery(
        propAttachment.map.getBounds(),
        propAttachment.map.getZoom()
      )
    );
  }, [onViewportSettled, propAttachment]);

  const handleMapLoad = useCallback(() => {
    const attachment = propAttachment;
    if (!attachment || mapAttachmentRef.current !== attachment) return;
    loadedMapAttachmentRef.current = attachment;

    clogger.trace("onLoad() fired");
    setLoadVersion((version) => version + 1);

    if (persistViewport) {
      const savedViewport = readViewportCookie();
      if (savedViewport) onViewportRestore(savedViewport);
    }

    cancelPendingAnimationFrame();
    const registration: AnimationFrameRegistration = { attachment, id: 0 };
    animationFrameRef.current = registration;
    registration.id = window.requestAnimationFrame(() => {
      if (
        animationFrameRef.current !== registration ||
        mapAttachmentRef.current !== registration.attachment
      ) {
        return;
      }
      animationFrameRef.current = null;
      onViewportSettled(
        createViewportQuery(
          registration.attachment.map.getBounds(),
          registration.attachment.map.getZoom()
        )
      );
    });
  }, [
    cancelPendingAnimationFrame,
    onViewportRestore,
    onViewportSettled,
    persistViewport,
    propAttachment,
  ]);

  useEffect(() => {
    const attachment = propAttachment;
    const map = attachment?.map;
    if (
      !map ||
      mapAttachmentRef.current !== attachment ||
      loadedMapAttachmentRef.current !== attachment
    ) {
      return;
    }
    const clusterLayerId = clusterLayer.id ?? "";
    let active = true;
    const isCurrentMap = () =>
      active && mapAttachmentRef.current === attachment;

    const handleClusterClick = (event: MapLayerMouseEvent) => {
      if (!isCurrentMap()) return;
      if (!event.features?.length) return;
      const feature = event.features[0];
      if (feature.geometry.type !== "Point") return;
      const coordinates = feature.geometry.coordinates as LngLatLike;
      const clusterId = feature.properties?.cluster_id as number;
      const source = map.getSource(pointsLayerId) as GeoJSONSource | undefined;
      source?.getClusterExpansionZoom(
        clusterId,
        (error?: Error | null, zoom?: number | null) => {
          if (!isCurrentMap() || error || zoom == null) return;
          map.easeTo({
            center: coordinates,
            zoom,
            duration: 500,
          });
        }
      );
    };
    const handleClusterMouseEnter = (event: MapLayerMouseEvent) => {
      if (!isCurrentMap()) return;
      map.getCanvas().style.cursor = "pointer";
      clogger.trace({ data: event }, "clustered mouseenter event");
    };
    const handleClusterMouseLeave = () => {
      if (!isCurrentMap()) return;
      map.getCanvas().style.cursor = "";
    };

    map.on("click", clusterLayerId, handleClusterClick);
    map.on("mouseenter", clusterLayerId, handleClusterMouseEnter);
    map.on("mouseleave", clusterLayerId, handleClusterMouseLeave);

    const categoryRegistrations = interactiveLayerIds.map((layerId) => {
      const handleClick = (event: MapLayerMouseEvent) => {
        if (!isCurrentMap()) return;
        const feature = event.features?.[0];
        if (!feature || feature.geometry.type !== "Point") return;
        const coordinates = feature.geometry.coordinates.slice();
        while (Math.abs(event.lngLat.lng - coordinates[0]) > 180) {
          coordinates[0] += event.lngLat.lng > coordinates[0] ? 360 : -360;
        }
        onPlaceSelect(feature.properties as SimplePlaceType);
      };
      const handleMouseEnter = () => {
        if (!isCurrentMap()) return;
        map.getCanvas().style.cursor = "pointer";
      };
      const handleMouseLeave = () => {
        if (!isCurrentMap()) return;
        map.getCanvas().style.cursor = "";
      };

      map.on("click", layerId, handleClick);
      map.on("mouseenter", layerId, handleMouseEnter);
      map.on("mouseleave", layerId, handleMouseLeave);
      return { layerId, handleClick, handleMouseEnter, handleMouseLeave };
    });

    return () => {
      active = false;
      map.off("click", clusterLayerId, handleClusterClick);
      map.off("mouseenter", clusterLayerId, handleClusterMouseEnter);
      map.off("mouseleave", clusterLayerId, handleClusterMouseLeave);
      categoryRegistrations.forEach(
        ({ layerId, handleClick, handleMouseEnter, handleMouseLeave }) => {
          map.off("click", layerId, handleClick);
          map.off("mouseenter", layerId, handleMouseEnter);
          map.off("mouseleave", layerId, handleMouseLeave);
        }
      );
      map.getCanvas().style.cursor = "";
    };
  }, [interactiveLayerIds, loadVersion, onPlaceSelect, propAttachment]);

  const handleMapMove = useCallback(
    (event: ViewStateChangeEvent) => {
      if (!propAttachment || mapAttachmentRef.current !== propAttachment) {
        return;
      }
      onViewportChange(event.viewState);
    },
    [onViewportChange, propAttachment]
  );

  const handleMapMoveEnd = useCallback(
    (event: ViewStateChangeEvent) => {
      if (!propAttachment || mapAttachmentRef.current !== propAttachment) {
        return;
      }
      settleViewport();
      const center = propAttachment.map.getCenter();
      onCrosshairChange([center.lng, center.lat]);
      if (persistViewport) writeViewportCookie(event.viewState);
    },
    [onCrosshairChange, persistViewport, propAttachment, settleViewport]
  );

  const flyToCoordinates = useCallback((coordinates: number[]) => {
    mapRef.current?.flyTo({
      center: [coordinates[0], coordinates[1]],
      duration: 2000,
      zoom: flyToZoomLevel,
    });
  }, []);

  const refresh = useCallback(() => {
    const map = mapRef.current;
    if (map) map.zoomTo(map.getZoom());
  }, []);

  const hasMap = useCallback(() => mapRef.current !== null, []);

  const onIdle = useCallback(() => {
    if (!propAttachment || mapAttachmentRef.current !== propAttachment) {
      return;
    }
    clogger.trace("onMapIdle() fired");
  }, [propAttachment]);

  return {
    mapRef: setMapRef,
    onLoad: handleMapLoad,
    onIdle,
    onMove: handleMapMove,
    onMoveEnd: handleMapMoveEnd,
    flyToCoordinates,
    hasMap,
    refresh,
  };
}
