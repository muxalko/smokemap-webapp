/* eslint-disable */
import * as React from "react";
import { useState } from "react";
import {
  useControl,
  Marker,
  MarkerProps,
  ControlPosition,
} from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
// import MapboxGeocoder, { GeocoderOptions } from "@mapbox/mapbox-gl-geocoder";
import MaplibreGeocoder from "@maplibre/maplibre-gl-geocoder";
import "@maplibre/maplibre-gl-geocoder/dist/maplibre-gl-geocoder.css";
type GeocoderControlProps =
  // Omit<
  //   GeocoderOptions,
  //   "accessToken" | "mapboxgl" | "marker"
  // > &
  {
    //   mapboxAccessToken: string;
    marker?: boolean | Omit<MarkerProps, "longitude" | "latitude">;

    position: ControlPosition;

    onLoading?: (e: object) => void;
    onResults?: (e: object) => void;
    onResult?: (e: object) => void;
    onError?: (e: object) => void;
    placeholder?: string;
  };

const noop = () => {};

// const defaultProps = {
//   marker: true,
//   position: "top-left",
//   onLoading: noop,
//   onResults: noop,
//   onResult: noop,
//   onError: noop,
//   placeholder: "Search for address",
// };

export default function GeocoderControl(props: GeocoderControlProps) {
  const {
    marker = true,
    position = "top-left",
    onLoading = noop,
    onResults = noop,
    onResult = noop,
    onError = noop,
    placeholder = "Search for address",
  } = { ...props };

  const [markerComponent, setMarkerComponent] =
    useState<React.ReactElement | null>(null);

  const geocoderApi = {
    forwardGeocode: async (config: { query: any }) => {
      const features = [];
      try {
        const request = `https://nominatim.openstreetmap.org/search?q=${config.query}&format=geojson&polygon_geojson=1&addressdetails=1`;
        const response = await fetch(request);
        const geojson = await response.json();
        for (const feature of geojson.features) {
          const center = [
            feature.bbox[0] + (feature.bbox[2] - feature.bbox[0]) / 2,
            feature.bbox[1] + (feature.bbox[3] - feature.bbox[1]) / 2,
          ];
          const point = {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: center,
            },
            place_name: feature.properties.display_name,
            properties: feature.properties,
            text: feature.properties.display_name,
            place_type: ["place"],
            center,
          };
          features.push(point);
        }
      } catch (e) {
        console.error(`Failed to forwardGeocode with error: ${e}`);
      }

      return {
        features,
      };
    },
  };

  const geocoder = useControl<typeof MaplibreGeocoder>(
    () => {
      const ctrl: typeof MaplibreGeocoder = new MaplibreGeocoder(geocoderApi, {
        ...props,
        marker: false,
        // accessToken: props.mapboxAccessToken,
      });

      ctrl.on("loading", onLoading);
      ctrl.on("results", onResults);
      ctrl.on("result", (evt: any) => {
        onResult!(evt);

        const { result } = evt;
        const location =
          result &&
          (result.center ||
            (result.geometry?.type === "Point" && result.geometry.coordinates));
        if (location && marker) {
          setMarkerComponent(
            <Marker
              {...(marker as {})}
              longitude={location[0]}
              latitude={location[1]}
            />
          );
        } else {
          setMarkerComponent(null);
        }
      });
      ctrl.on("error", onError);
      return ctrl;
    },
    {
      position: position,
    }
  );

  if (geocoder._map) {
    if (
      geocoder?.getPlaceholder() !== placeholder &&
      placeholder !== undefined
    ) {
      geocoder.setPlaceholder(placeholder);
    }
  }
  // // @ts-ignore (TS2339) private member
  // if (geocoder._map) {
  //   if (
  //     geocoder.getProximity() !== props.proximity &&
  //     props.proximity !== undefined
  //   ) {
  //     geocoder.setProximity(props.proximity);
  //   }
  //   if (
  //     geocoder.getRenderFunction() !== props.render &&
  //     props.render !== undefined
  //   ) {
  //     geocoder.setRenderFunction(props.render);
  //   }
  //   if (
  //     geocoder.getLanguage() !== props.language &&
  //     props.language !== undefined
  //   ) {
  //     geocoder.setLanguage(props.language);
  //   }
  //   if (geocoder.getZoom() !== props.zoom && props.zoom !== undefined) {
  //     geocoder.setZoom(props.zoom);
  //   }
  //   if (geocoder.getFlyTo() !== props.flyTo && props.flyTo !== undefined) {
  //     geocoder.setFlyTo(props.flyTo);
  //   }
  //   if (
  //     geocoder?.getPlaceholder() !== props.placeholder &&
  //     props.placeholder !== undefined
  //   ) {
  //     geocoder.setPlaceholder(props.placeholder);
  //   }
  //   if (
  //     geocoder.getCountries() !== props.countries &&
  //     props.countries !== undefined
  //   ) {
  //     geocoder.setCountries(props.countries);
  //   }
  //   if (geocoder.getTypes() !== props.types && props.types !== undefined) {
  //     geocoder.setTypes(props.types);
  //   }
  //   if (
  //     geocoder.getMinLength() !== props.minLength &&
  //     props.minLength !== undefined
  //   ) {
  //     geocoder.setMinLength(props.minLength);
  //   }
  //   if (geocoder.getLimit() !== props.limit && props.limit !== undefined) {
  //     geocoder.setLimit(props.limit);
  //   }
  //   if (geocoder.getFilter() !== props.filter && props.filter !== undefined) {
  //     geocoder.setFilter(props.filter);
  //   }
  //   if (geocoder.getOrigin() !== props.origin && props.origin !== undefined) {
  //     geocoder.setOrigin(props.origin);
  //   }
  //   // Types missing from @types/mapbox__mapbox-gl-geocoder
  //   // if (geocoder.getAutocomplete() !== props.autocomplete && props.autocomplete !== undefined) {
  //   //   geocoder.setAutocomplete(props.autocomplete);
  //   // }
  //   // if (geocoder.getFuzzyMatch() !== props.fuzzyMatch && props.fuzzyMatch !== undefined) {
  //   //   geocoder.setFuzzyMatch(props.fuzzyMatch);
  //   // }
  //   // if (geocoder.getRouting() !== props.routing && props.routing !== undefined) {
  //   //   geocoder.setRouting(props.routing);
  //   // }
  //   // if (geocoder.getWorldview() !== props.worldview && props.worldview !== undefined) {
  //   //   geocoder.setWorldview(props.worldview);
  //   // }
  // }
  return markerComponent;
}

// GeocoderControl.defaultProps = {
//   marker: true,
//   onLoading: noop,
//   onResults: noop,
//   onResult: noop,
//   onError: noop,
// };
