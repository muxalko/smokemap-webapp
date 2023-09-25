import * as React from "react";

import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery } from "@apollo/client";
import { ALL_PLACES_QUERY } from "../src/graphql/queries/place";

import Map, {
  Source,
  Layer,
  AttributionControl,
  FullscreenControl,
} from "react-map-gl/maplibre";

//import ControlPanel from "./control-panel_cities";
import ControlPanel from "./control-panel_requests";
// TODO: investigate error when installing canvas - neeeded for SVG type of images
//import MarkerIconSvg from "./../src/assets/icon-marker.svg";
//import { Image } from "canvas";

import {
  clusterLayer,
  clusterCountLayer,
  unclusteredPointLayer,
} from "./layers";

//vacouver start
const lon = -123.11343223112543;
const lat = 49.28339038044595;
const pointsLayerId = "places";

export default function MapComponent() {
  const mapRef = useRef();
  const map = mapRef.current;
  
  useEffect(() => {
    console.log("Component render: MapComponent");
    if (mapRef && mapRef.current) {
      const map = mapRef.current;
      // const pointsLayerId = "places";
      console.log(
        mapRef && mapRef.current
          ? mapRef.current.getStyle().sources
          : "mapRef is null"
      );
    }
  });

  const onSelectRequest = useCallback((longitude, latitude) => {
    mapRef.current?.flyTo({ center: [longitude, latitude], duration: 2000 });
  }, []);

  const onClick = (event) => {
    const feature = event?.features[0];
    const clusterId = feature && feature?.properties.cluster_id;

    const mapSource = mapRef.current.getSource("hydrants");

    mapSource &&
      mapSource.getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err) {
          return;
        }

        feature &&
          mapRef.current.easeTo({
            center: feature.geometry.coordinates,
            zoom,
            duration: 500,
          });
      });
  };

  const [viewport, setViewport] = useState({
    latitude: lat,
    longitude: lon,
    zoom: 11,
    bearing: 0,
    pitch: 0,
  });

  const { loading, error, data } = useQuery(ALL_PLACES_QUERY);

  if (error) return <div>Error loading Places.</div>;
  if (loading) return <div>Loading</div>;

  const { places } = data;

  const PLACES_SOURCE = {
    data: {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Point",
            coordinates: [ -123.1447524165215, 49.25537637491234],
          },
        },
      ],
    },
  };

  return (
    <>
      <Map
        reuseMaps
        {...viewport}
        ref={mapRef}
        style={{ width: "100vw", height: "100vh", display: "flex" }}
        //mapStyle={process.env.NEXT_PUBLIC_MAP_STYLE}
        //mapStyle="https://demotiles.maplibre.org/style.json"
        mapStyle={
          "https://api.maptiler.com/maps/basic-v2/style.json?key=WJYHMjM1keLxRakXKZGa"
        }
        //mapStyle={process.env.NEXT_PUBLIC_MAPTILER_API_TOKEN ? "https://api.maptiler.com/maps/basic-v2/style.json?key="+process.env.NEXT_PUBLIC_MAPTILER_API_TOKEN:process.env.NEXT_PUBLIC_MAP_STYLE}
        maxZoom={20}
        onMove={(evt) => {
          setViewport({ ...evt.viewState });
        }}
        interactiveLayerIds={[clusterLayer.id]}
        onClick={onClick}
        onLoad={() => {
          console.log("onLoad() fired");
          console.log(
            mapRef && mapRef.current
              ? mapRef.current.getStyle().sources
              : "mapRef is null"
          );

          console.log("map.onLoad(): started");
          if (mapRef && mapRef.current) {
            //update source
            mapRef.current.getSource(pointsLayerId).setData({
              type: "FeatureCollection",
              features: places,
            });

            // Create a new source for the points data
            // map.addSource(pointsLayerId, {
            //   type: "geojson",
            //   data: {
            //     type: "FeatureCollection",
            //     features: places || [], // Initially empty or populated with retrieved data
            //   },
            // });
            // console.log("map.onLoad(): addSource(" + pointsLayerId + ")");

            // // Add a layer for the points
            // map.addLayer({
            //   id: pointsLayerId,
            //   source: pointsLayerId,
            //   type: "circle",
            //   paint: {
            //     "circle-color": "#ff0000",
            //     "circle-radius": 6,
            //   },
            // });
            // console.log("map.onLoad(): addLayer(" + pointsLayerId + ")");
          }

          console.log("onLoad() ended");
        }}
        // disable the default attribution
        attributionControl={false}
      >

        {/* <FullscreenControl /> */}
        
        {/*need according to https://documentation.maptiler.com/hc/en-us/articles/4405445885457-How-to-add-MapTiler-attribution-to-a-map*/}
        <AttributionControl
          style={{
            //color: 'ff7c92',
            "-webkit-text-size-adjust": "100%",
            "-webkit-tap-highlight-color": "rgb(0 0 0/0)",
            font: "12px/20px Helvetica Neue,Arial,Helvetica,sans-serif",
            "box-sizing": "border-box",
            //'pointer-events': 'none',
            position: "absolute",
            "z-index": "2",
            bottom: "0",
            right: "0",
            "background-color": "hsla(0,0%,100%,.5)",
            margin: "0",
            padding: "0 5px",
          }}
          //customAttribution='<a href="https://www.maptiler.com"><img src="https://api.maptiler.com/resources/logo.svg" alt="MapTiler logo"></a>'
        />
        {/* <AttributionControl
                  style={{position: 'absolute', left: '10px', bottom: '10px', "z-index": '999'}}
                  customAttribution='<a href="https://www.maptiler.com"><img src="https://api.maptiler.com/resources/logo.svg" alt="MapTiler logo"></a>
                                     <a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a>
                                     <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>' /> */}
        
        {/*Adding source for places*/}
        <Source
          id="places"
          type="geojson"
          cluster={true}
          clusterMaxZoom={15}
          clusterRadius={75}
          {...PLACES_SOURCE}
        >
          <Layer {...{ source: "places", ...clusterLayer }} />
          <Layer {...{ source: "places", ...clusterCountLayer }} />
          <Layer {...{ source: "places", ...unclusteredPointLayer }} />
        </Source>
        
        
      </Map>

      <ControlPanel onSelectRequest={onSelectRequest} />
    </>
  );
}
