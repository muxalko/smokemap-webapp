import * as React from "react";
import debounce from "lodash.debounce";
import { useState, useRef, useCallback, useMemo, useEffect } from "react";
// import { ALL_PLACES_QUERY } from "@/graphql/queries/place";
// import { useSuspenseQuery } from "@apollo/experimental-nextjs-app-support/ssr";
// import { lat2tile, lon2tile } from "@/gis-utils";
import Map, {
  Source,
  Layer,
  // Marker,
  Popup,
  // NavigationControl,
  // FullscreenControl,
  // ScaleControl,
  // GeolocateControl,
  AttributionControl,
} from "react-map-gl/maplibre";
// import ControlPanel from "@/components/control/panel";
import maplibregl from "maplibre-gl";
// need maplibre css for markers
import "maplibre-gl/dist/maplibre-gl.css";
//import ControlPanel from "./control-panel_cities";
// import GeocoderControl from "./geocoder-control"
// TODO: investigate error when installing canvas - neeeded for SVG type of images
//import MarkerIconSvg from "./../src/assets/icon-marker.svg";
//import { Image } from "canvas";
import Pin from "./pin";
import {
  clusterLayer,
  clusterCountLayer,
  unclusteredPointLayer,
} from "./layers";

// import RANDOM from "./.data/random.json";
// import CITIES from "./.data/cities.json";
import { Button } from "../ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import CustomOverlay from "./custom-overlay";
import ControlPanel from "./control-panel";
import electionData from "./.data/us-election-2016.json";
import PieCharts from "./pie-chart";
import Crosshair from "./crosshair";
import { Checkbox } from "../ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { CategoryType } from "@/graphql/__generated__/graphql";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { toast } from "../ui/use-toast";
// import { ALL_CATEGORIES_QUERY } from "@/graphql/queries/category";
//Starting point
//Vacouver,BC
// const lon = -123.11343223112543;
// const lat = 49.28339038044595;
//UK
// const lon = 0.904974827563052;
// const lat = 52.62574343647046;
//Washington, DC
const lon = -77.01215461524441;
const lat = 38.89630256339336;

const southWest = new maplibregl.LngLat(lon - 2, lat + 2);
const northEast = new maplibregl.LngLat(lon + 2, lat - 2);
const boundingBox = new maplibregl.LngLatBounds(southWest, northEast);

const initialZoom = 13;
const pointsLayerId = "places";
const flyToZoomLevel = 12;

const CategorySelectorSchema = z.object({
  items: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "You have to select at least one item.",
  }),
});

export default function MapComponent({
  categories,
}: {
  categories: CategoryType[];
}) {
  // Hooks
  // our map reference
  // const mapRef = useRef<MapLibreGL>();
  // I suspect that this is where I am presumably wrong.
  // I assume that 'maplibregl' type Map is the same as 'react-map-gl/maplibre' Map component ref={mapRef}
  // This is where I try to declare my mapRef following answer from here https://stackoverflow.com/questions/68368898/typescript-type-for-mapboxgljs-react-ref-hook
  const mapRef = useRef<maplibregl.Map | null>(null);

  // trying other approach from here  https://gis.stackexchange.com/questions/440274/how-to-make-map-ref-object-available-on-first-modal-window-render-launch
  // Basically, instead of useRef to use useState as follows, Map component then should be set to ref={(ref) => setMap(ref)}
  //  const [map, setMap] = useState(null);
  // Map component should be set to ref={(ref) => setMap(ref)}

  // save our bounding box for future requests of data points within a boundary
  const [mapBounds, setMapBounds] = useState(boundingBox);

  // popup with a place properties
  const [popupInfo, setPopupInfo] = useState(null);

  // const { networkStatus, error, data } = useSuspenseQuery(ALL_CATEGORIES_QUERY);

  // if (error) return <div>Error loading Places.</div>;
  // if (networkStatus === 1) return <div>Loading</div>;

  // const { categories } = data;

  // console.log("MapComponent GOT THE DATA: " + JSON.stringify(categories));

  // console.log("CategorySelection:", categories);
  const [mapStyle, setMapStyle] = useState(null);

  const categorySelectorForm = useForm<z.infer<typeof CategorySelectorSchema>>({
    resolver: zodResolver(CategorySelectorSchema),
    defaultValues: {
      items: categories.map((category) => category.name),
    },
  });

  const handleCategorySelectorChange = (layer_id: string, checked: boolean) => {
    console.log("CURRENT MAP:", mapRef.current);

    console.log(
      "SO FAR, getLayer(" + layer_id + "):",
      mapRef.current?.getLayer(layer_id)
    );
    console.log(
      "SO FAR, getLayoutProperty():",
      mapRef.current?.getLayoutProperty(layer_id, "visibility")
    );

    // fails with method not defined
    mapRef.current?.setPaintProperty(layer_id, "circle-radius", 0);
    // fails with method not defined
    // mapRef.current?.setLayoutProperty(
    //   layer_id,
    //   "visibility",
    //   checked ? "visible" : "none"
    // );
  };

  function onSubmit(data: z.infer<typeof CategorySelectorSchema>) {
    toast({
      title: "You submitted the following values:",
      description: (
        <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
          <code className="text-white">{JSON.stringify(data, null, 2)}</code>
        </pre>
      ),
    });
  }
  const categoriesSelector = useMemo(
    () => (
      <Form {...categorySelectorForm}>
        <form
          onSubmit={categorySelectorForm.handleSubmit(onSubmit)}
          className="space-y-8"
        >
          <FormField
            control={categorySelectorForm.control}
            name="items"
            render={() => (
              <FormItem>
                <div className="mb-4">
                  <FormLabel className="text-base">Categories</FormLabel>
                  <FormDescription>
                    Select the categories you wish to appear on the map.
                  </FormDescription>
                </div>

                {categories.map((item) => (
                  <FormField
                    key={item.name}
                    control={categorySelectorForm.control}
                    name="items"
                    render={({ field }) => {
                      return (
                        <FormItem
                          key={item.id}
                          className="flex flex-row items-start space-x-3 space-y-0"
                        >
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(item.name)}
                              onCheckedChange={async (checked) => {
                                if (
                                  mapRef &&
                                  mapRef.current &&
                                  mapRef.current.isStyleLoaded()
                                ) {
                                  const layer_id = `poi-${item.name.replace(
                                    / /g,
                                    "-"
                                  )}`;

                                  return handleCategorySelectorChange(
                                    layer_id,
                                    checked
                                  );
                                }
                                return checked
                                  ? field.onChange([...field.value, item.name])
                                  : field.onChange(
                                      field.value?.filter(
                                        (value) => value !== item.name
                                      )
                                    );
                              }}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">
                            {item.name}
                          </FormLabel>
                        </FormItem>
                      );
                    }}
                  />
                ))}
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit">Submit</Button>
        </form>
      </Form>
    ),
    []
  );

  function onCategorySelectorSubmit(
    data: z.infer<typeof CategorySelectorSchema>
  ) {
    toast({
      title: "You submitted the following values:",
      description: (
        <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
          <code className="text-white">{JSON.stringify(data, null, 2)}</code>
        </pre>
      ),
    });
  }

  const testPlaces = useMemo(
    () =>
      categories.map((category) => {
        // filtering implemented with layer visibility
        // each category is converted to a layer with name poi-{category}
        // Add a layer for this symbol type if it hasn't been added already.
        return (
          <Layer
            key={`poi-${category.name.replace(/ /g, "-")}`}
            {...{
              id: `poi-${category.name.replace(/ /g, "-")}`,
              type: "symbol",
              source: pointsLayerId,
              layout: {
                // Make the layer visible by default.
                visibility: "visible",

                // "icon-image": `${symbol}_15`,
                // "icon-size": 0.3,
                // "icon-overlap": "always",
                // "icon-allow-overlap": true,
                // "text-allow-overlap": false,
                "text-font": ["Arial Italic"],
                "text-field": ["concat", category.name + ": ", ["get", "name"]],
                // "text-field": ["get","name", ["get","nestedobj"]],
                // "text-field": ["get","name", ["at", 0, ["get","arrayofobjects"]]],
                // "text-field": ["get","name", ["at", 0, ["get","arrayofobjects"]]],
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
                "text-offset": [0, -2],
              },
              filter: ["==", category.id, ["to-string", ["get", "category"]]],
              // filter: ["==", "icon", category.name],
              // filter: [
              //   "==",
              //   [
              //     "get",
              //     "category_id",
              //     ["at", 0, "places"]],
              //   ],
              //   category.id,
              // ],
            }}
          />
        );
      }),
    []
  );

  // Custom markers, independent from sources
  // markers are drawn separtely next to
  // const pins = useMemo(
  //   () =>
  //     CITIES.map((city, index) => (
  //       <Marker
  //         key={`marker-${index}`}
  //         longitude={city.longitude}
  //         latitude={city.latitude}
  //         anchor="bottom"
  //         onClick={(e) => {
  //           // If we let the click event propagates to the map, it will immediately close the popup
  //           // with `closeOnClick: true`
  //           e.originalEvent.stopPropagation();
  //           setPopupInfo(city);
  //         }}
  //       >
  //         <Pin />
  //       </Marker>
  //     )),
  //   []
  // );

  const onMapLoad = useCallback(() => {
    console.log("onLoad() fired");

    // make our map draggable + debounce map bounds update
    if (mapRef && mapRef.current) {
      // console.log("onMapLoad() =>  mapRef.current: ", mapRef.current);
      mapRef.current.on("move", (evt) => {
        // console.log("onMapMove() event: ", evt);
        setViewport({ ...evt.viewState });

        if (mapRef && mapRef.current) {
          // console.log("onMapMove() => mapRef.current: ", mapRef.current);
          debouncedMapOnMoveHandler(evt);
        }

        // setMapBounds(mapRef.current.getBounds())
      });

      // TODO: check why onhover doesn't work here
      // mapRef.current.on("onMouseMove", unclusteredPointLayer.id, function (e) {
      //   console.log("onMouseMove() fired")
      //   if (e.features.length > 0) {
      //     const fState = mapRef.current.getFeatureState({
      //       source: pointsLayerId,
      //       sourceLayer: unclusteredPointLayer.id,
      //       id: e.features[0].id,
      //     });
      //     console.log(fState);
      //   }
      // });

      // When a click event occurs on the clusters layer
      // zoom in to expand level
      mapRef.current.on("click", "clusters", (e) => {
        console.log(e);
        // When the map is clicked, get the geographic coordinate.
        let coordinates = mapRef.current.unproject(e.point);
        // get first element clicked - for zooming in to cluster expand
        const feature = e?.features[0];
        // find out which cluster was clicked
        const clusterId = feature && feature?.properties.cluster_id;

        const mapSource = mapRef.current.getSource(pointsLayerId);

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
        console.log("Clusters onClick event coordinates: " + coordinates);
      });

      // When a click event occurs on a feature in
      // the unclustered-point layer, open a popup at
      // the location of the feature, with
      // description HTML from its properties.
      mapRef.current.on("click", "unclustered-point", (e) => {
        console.log("Unclustered onClick event: ", e);

        const coordinates = e.features[0].geometry.coordinates.slice();

        console.log("Unclusters onClick event coordinates: " + coordinates);
        // Ensure that if the map is zoomed out such that
        // multiple copies of the feature are visible, the
        // popup appears over the copy being pointed to.
        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
          coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        }

        const properties = e.features[0].properties;

        console.log("Unclusters onClick event properties: ", properties);

        // new maplibregl.Popup()
        //   .setLngLat(coordinates)
        //   .setHTML(
        //     `click: ${e.features[0].id}<br>Was there a prop?: ${JSON.stringify(
        //       e.features[0].properties
        //     )}`
        //   )
        //   .addTo(mapRef.current);
      });

      // TODO: understand hover on touch devices
      mapRef.current.on("mouseenter", unclusteredPointLayer.id, (e) => {
        mapRef.current.getCanvas().style.cursor = "pointer";
        console.log("Unclustered mouseenter event: ", e);
      });
      mapRef.current.on("mouseleave", unclusteredPointLayer.id, () => {
        mapRef.current.getCanvas().style.cursor = "";
      });

      mapRef.current.on("mouseenter", clusterLayer.id, (e) => {
        console.log("clusterLayer mouseenter event: ", e);
        mapRef.current.getCanvas().style.cursor = "pointer";

        const coordinates = e.features[0].geometry.coordinates.slice();

        console.log(
          "clusterLayer mouseenter event coordinates: " + coordinates
        );
        // Ensure that if the map is zoomed out such that
        // multiple copies of the feature are visible, the
        // popup appears over the copy being pointed to.
        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
          coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        }

        const properties = e.features[0].properties;

        console.log("clusterLayer mouseenter event properties: ", properties);
      });
      mapRef.current.on("mouseleave", clusterLayer.id, () => {
        mapRef.current.getCanvas().style.cursor = "";
      });
    }

    console.log("Map onLoad() ended");
  }, []);

  // Prevent backend from overwhelming with the requests, hold for 300ms
  const mapOnMoveHandler = (evt) => {
    // feels chunky when dragging the map if used with debounce method
    //setViewport({ ...evt.viewState });

    // update visual bounds
    setMapBounds(mapRef.current.getBounds());

    // console.dir(mapRef.current);
    // console.dir(mapRef.current.getSource(pointsLayerId));
    // console.dir(mapRef.current.getStyle());
    // console.dir(mapRef.current.getCanvas());

    // TODO: implement creation with crosshair.
    // get map's geographical centerpoint for later creation of place location.
    let { lng, lat } = mapRef.current.getCenter();

    console.log("map's geographical centerpoint: ", lng, lat);

    // Query the places layer visible in the map.
    // Only onscreen features are returned.
    // Use filter to collect only results
    // with specific condition
    // const visiblePlace = mapRef.current.querySourceFeatures(pointsLayerId, {
    //   sourceLayer: clusterLayer.id,
    //   // filter: ["in", "COUNTY", feature.properties.COUNTY],
    // });
    // console.log(visiblePlace);
  };

  const debouncedMapOnMoveHandler = useMemo(
    () => debounce(mapOnMoveHandler, 300),
    []
  );

  // Stop the invocation of the debounced function
  // after unmounting
  useEffect(() => {
    return () => {
      debouncedMapOnMoveHandler.cancel();
    };
  }, []);

  // useEffect hook runs AFTER the main component is rendered
  // useful when refresh code changes need to reset the map
  // useEffect(() => {
  //   console.log("Component re-rendered: MapComponent ");
  //   if (mapRef && mapRef.current) {
  //     //map = mapRef.current;
  //     // const pointsLayerId = "places";
  //     console.log(
  //       mapRef && mapRef.current
  //         ? mapRef.current.getStyle().sources
  //         : "mapRef does not exist"
  //     );
  //   }
  // });

  const flyToCoordinates = useCallback((longitude, latitude) => {
    mapRef.current?.flyTo({
      center: [longitude, latitude],
      duration: 2000,
      //minZoom: minFlyToZoomLevel,
      zoom: flyToZoomLevel,
    });
    // mapRef.current?.setLayoutProperty(
    //   layerID,
    //   'visibility',
    //   layerID.indexOf(value) > -1 ? 'visible' : 'none'
    // );
  }, []);

  // const onMouseMove = (event) => {
  //   console.log(event);
  //   if (event.features.length > 0) {
  //     const fState = map.getFeatureState({
  //       source: pointsLayerId,
  //       sourceLayer: "unclusteredPointLayer",
  //       id: event.features[0].id,
  //     });
  //     console.log("Feature State:", fState);
  //   }
  // };

  // // Set an event listener that will fire
  // // when a feature on the x layer of the map is clicked
  // const onClick = (event) => {
  //   console.log(event);
  //   // When the map is clicked, get the geographic coordinate.
  //   let coordinate = mapRef.current.unproject(event.point);
  //   // get first element clicked - for zooming in to cluster expand
  //   const feature = event?.features[0];
  //   // find out which cluster was clicked
  //   const clusterId = feature && feature?.properties.cluster_id;

  //   const mapSource = mapRef.current.getSource(pointsLayerId);

  //   mapSource &&
  //     mapSource.getClusterExpansionZoom(clusterId, (err, zoom) => {
  //       if (err) {
  //         return;
  //       }

  //       feature &&
  //         mapRef.current.easeTo({
  //           center: feature.geometry.coordinates,
  //           zoom,
  //           duration: 500,
  //         });
  //     });
  //   console.log("Click event coordinate: " + coordinate);
  // };

  const [viewport, setViewport] = useState({
    latitude: lat,
    longitude: lon,
    zoom: initialZoom,
    bearing: 0,
    pitch: 0,
  });

  const PLACES_SOURCE = {
    data:
      `${process.env.NEXT_PUBLIC_FEATURESERV_ENDPOINT}/places/?in_bbox=` +
      (mapBounds
        ? `${mapBounds._sw.lng},${mapBounds._sw.lat},${mapBounds._ne.lng},${mapBounds._ne.lat}`
        : [lon - 2, lat - 2, lon + 2, lat + 2].join(",")),
  };

  const PLACES1_SOURCE = {
    data: {
      type: "FeatureCollection",
      features: [
        // {
        //   type: "Feature",
        //   properties: {},
        //   geometry: {
        //     type: "Point",
        //     coordinates: [-123.1447524165215, 49.25537637491234],
        //   },
        // },
      ],
    },
  };

  return (
    <>
      {/* {viewport && <h2>Zoom: {viewport.zoom}</h2>}
      {viewport && <h2>mapBounds: {JSON.stringify(mapBounds)}</h2>}
       {categorySelectorForm && <pre>{JSON.stringify(categorySelectorForm, null, 4)}</pre>}
       */}
      <Map
        reuseMaps
        {...viewport}
        ref={mapRef}
        // style={{ width: "100vw", height: "100vh", display: "flex" }}
        //mapStyle={process.env.NEXT_PUBLIC_MAP_STYLE}
        // simple demo style -> caution!! breaks cluster style
        // mapStyle="https://demotiles.maplibre.org/style.json"
        mapStyle={process.env.NEXT_PUBLIC_MAP_STYLE}
        // mapStyle={mapStyle && mapStyle.toJS()}
        //mapStyle={process.env.NEXT_PUBLIC_MAPTILER_API_TOKEN ? "https://api.maptiler.com/maps/basic-v2/style.json?key="+process.env.NEXT_PUBLIC_MAPTILER_API_TOKEN:process.env.NEXT_PUBLIC_MAP_STYLE}
        //maxZoom={20}
        // disable map rotation using right click + drag
        dragRotate={false}
        // disable map rotation using touch rotation gesture
        touchZoomRotate={false}
        //enable click on markers
        interactiveLayerIds={[clusterLayer.id, unclusteredPointLayer.id]}
        // onClick={onClick}
        onLoad={onMapLoad}
        attributionControl={false}
      >
        {/* <FullscreenControl /> */}
        {/* <GeocoderControl position="top-left" /> */}
        {/* <ControlPanel onSelectRequest={onSelectRequest} /> */}
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
            padding: "0 0px",
          }}
        />

        {/*Adding source for places*/}

        <Source
          id={pointsLayerId}
          type="geojson"
          // tolerance={20}
          cluster={true}
          maxzoom={15}
          // clusterMinPoints={2}
          clusterMaxZoom={14} // display all points individually from stated zoom up
          clusterRadius={75} // cluster two points if less than stated pixels apart
          {...PLACES_SOURCE}
          // data="https://maplibre.org/maplibre-gl-js/docs/assets/earthquakes.geojson"
        >
          <Layer {...{ source: pointsLayerId, ...clusterLayer }} />
          <Layer {...{ source: pointsLayerId, ...clusterCountLayer }} />
          <Layer {...{ source: pointsLayerId, ...unclusteredPointLayer }} />
          {testPlaces}
        </Source>

        {/* <GeolocateControl position="top-left" />
        <FullscreenControl position="top-left" />
        <NavigationControl position="top-left" />
        <ScaleControl /> */}
        <CustomOverlay>
          <Crosshair />
          {/* <PieCharts data={electionData} /> */}
        </CustomOverlay>
        {/* {pins} */}
        {popupInfo && (
          <Popup
            anchor="top"
            longitude={Number(popupInfo.coordinates[0])}
            latitude={Number(popupInfo.coordinates[1])}
            closeOnMove={true}
            closeOnClick={true}
            maxWidth="300ch"
            onClose={() => setPopupInfo(null)}
          >
            <div>
              <h2>Properties:</h2>
              <div>{JSON.stringify(popupInfo.properties, null, 4)}</div>
              <ul>
                {Object.entries(popupInfo.properties).forEach(([k, v]) => (
                  <li key={k}>
                    <p className="text-blue-600">{k}</p>=<p>{v}</p>
                  </li>
                ))}
              </ul>
            </div>
          </Popup>
        )}
      </Map>
      <Popover>
        <PopoverTrigger>Open</PopoverTrigger>

        <PopoverContent>
          {/* <ControlPanel categories={categories} onChange={setMapStyle} /> */}
          {categoriesSelector}
        </PopoverContent>
      </Popover>

      <div>
        <Button
          onClick={(e) => {
            console.log(mapRef.current);
          }}
        >
          Print mapRef.current
        </Button>
        <Button
          onClick={(e) => {
            console.log(mapRef.current.getStyle());
          }}
        >
          Print map style
        </Button>
        <Button
          onClick={(e) => {
            console.log("Places generate result: ", filteredPlaces);
          }}
        >
          Print filteredPlaces
        </Button>
        <Button
          onClick={(e) => {
            console.log("Test Places generate result: ", testPlaces);
          }}
        >
          Print testPlaces
        </Button>
        <Button
          onClick={(e) => {
            handleCategorySelectorChange("poi-Bar", false);
          }}
        >
          Hide "Bar" layer
        </Button>
        <Button
          onClick={(e) =>
            flyToCoordinates(-123.11343223112543, 49.28339038044595)
          }
        >
          Fly to Vancouver
        </Button>
      </div>
    </>
  );
}
