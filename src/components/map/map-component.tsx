import * as React from "react";
import debounce from "lodash.debounce";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// import { ALL_PLACES_QUERY } from "@/graphql/queries/place";
// import { useSuspenseQuery } from "@apollo/experimental-nextjs-app-support/ssr";
// import { lat2tile, lon2tile } from "@/gis-utils";
import {
  Map,
  Source,
  Layer,
  ViewState,
  ViewStateChangeEvent,
  NavigationControl,
  FullscreenControl,
  ScaleControl,
  GeolocateControl,
} from "react-map-gl/maplibre";
// import ControlPanel from "@/components/control/panel";
import { GeoJSONSource, LngLat, LngLatBounds, LngLatLike } from "maplibre-gl";
// need maplibre css for markers
import "maplibre-gl/dist/maplibre-gl.css";
import GeocoderControl from "./geocoder-control";

// TODO: investigate error when installing canvas - neeeded for SVG type of images
//import MarkerIconSvg from "./../src/assets/icon-marker.svg";
//import { Image } from "canvas";
// import Pin from "./pin";
import {
  clusterCountLayer,
  clusterLayer,
  unclusteredPointLayer,
} from "./layers";

// import RANDOM from "./.data/random.json";
// import CITIES from "./.data/cities.json";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import CustomOverlay from "./custom-overlay";
import Crosshair from "./crosshair";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
// import type { CategoryType } from "@/graphql/__generated__/graphql";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { toast } from "../ui/use-toast";
import { MapRef } from "react-map-gl/maplibre";
import { CategoryType } from "@/graphql/__generated__/types";
import PlaceCard, { SimplePlaceType } from "../places/PlaceCard";
import PlaceList from "../places/PlaceList";
import Search from "../places/Search";

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

const southWest = new LngLat(lon - 2, lat + 2);
const northEast = new LngLat(lon + 2, lat - 2);
const boundingBox = new LngLatBounds(southWest, northEast);

const initialZoom = 13;
const pointsLayerId = "places";
const flyToZoomLevel = 19;

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
  // const mapRef = useRef<maplibregl.Map | null>(null);
  const mapRef = useRef<MapRef>(null);

  // trying other approach from here  https://gis.stackexchange.com/questions/440274/how-to-make-map-ref-object-available-on-first-modal-window-render-launch
  // Basically, instead of useRef to use useState as follows, Map component then should be set to ref={(ref) => setMap(ref)}
  //  const [map, setMap] = useState(null);
  // Map component should be set to ref={(ref) => setMap(ref)}

  // save our bounding box for future requests of data points within a boundary
  const [mapBounds, setMapBounds] = useState<LngLatBounds>(boundingBox);

  // save central point of a map for creating a request without an address
  const [crosshairLngLat, setCrosshairLngLat] = useState({
    lng: 0,
    lat: 0,
  });

  useEffect(() => {
    console.log("crosshairLngLat updated: ", crosshairLngLat);
  }, [crosshairLngLat]);

  // popup with a place properties
  // const [popupInfo, setPopupInfo] = useState(null);

  // const { networkStatus, error, data } = useSuspenseQuery(ALL_CATEGORIES_QUERY);

  // if (error) return <div>Error loading Places.</div>;
  // if (networkStatus === 1) return <div>Loading</div>;

  // const { categories } = data;

  // console.log("MapComponent GOT THE DATA: " + JSON.stringify(categories));

  // console.log("CategorySelection:", categories);
  const [mapStyle, setMapStyle] = useState(null);

  useEffect(() => {
    console.log("VERCEL_ENV: ", process.env.VERCEL_ENV);
    console.log(
      "NEXT_PUBLIC_FEATURESERV_ENDPOINT: ",
      process.env.NEXT_PUBLIC_FEATURESERV_ENDPOINT
    );
  }, []);

  const categorySelectorForm = useForm<z.infer<typeof CategorySelectorSchema>>({
    resolver: zodResolver(CategorySelectorSchema),
    defaultValues: {
      items: categories.map((category: CategoryType) => category.name),
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
          className="space-y-8"
          onSubmit={() => categorySelectorForm.handleSubmit(onSubmit)}
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

                {categories.map((item: CategoryType) => (
                  <FormField
                    control={categorySelectorForm.control}
                    key={item.name}
                    name="items"
                    render={({ field }) => {
                      return (
                        <FormItem
                          className="flex flex-row items-start space-x-3 space-y-0"
                          key={item.id}
                        >
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(item.name)}
                              onCheckedChange={(checked: boolean) => {
                                if (
                                  mapRef &&
                                  mapRef.current &&
                                  mapRef.current?.isStyleLoaded()
                                ) {
                                  const layer_id = `poi-${item?.name?.replace(
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
    [categories, categorySelectorForm]
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

  const onMapLoad = useCallback(() => {
    console.log("onLoad() fired");

    // make our map draggable + debounce map bounds update
    if (mapRef && mapRef.current) {
      // console.log("onMapLoad() =>  mapRef.current: ", mapRef.current);
      mapRef.current?.on("move", (evt: ViewStateChangeEvent) => {
        // console.log("onMapMove() event: ", evt);
        setViewport({ ...evt.viewState });

        if (mapRef && mapRef.current) {
          // console.log("onMapMove() => mapRef.current: ", mapRef.current);
          debouncedMapOnMoveHandler();
        }

        // setMapBounds(mapRef.current?.getBounds())
      });

      // When a click event occurs on the clusters layer
      // zoom in to expand level
      mapRef.current?.on("click", "clusters", (e) => {
        console.log(e);
        // When the map is clicked, get the geographic coordinate.
        const coordinates = mapRef.current?.unproject(e.point);
        // get first element clicked - for zooming in to cluster expand
        if (e.features && e.features?.length > 0) {
          const feature = e.features[0];
          // find out which cluster was clicked
          const clusterId =
            feature && (feature?.properties?.cluster_id as number);

          const mapSource = mapRef.current?.getSource(
            pointsLayerId
          ) as GeoJSONSource;

          mapSource &&
            mapSource?.getClusterExpansionZoom(
              clusterId,
              (error?: Error | null, result?: number | null) => {
                if (error) {
                  return;
                }

                feature &&
                  feature.geometry.type === "Point" &&
                  mapRef.current?.easeTo({
                    center: feature.geometry.coordinates as LngLatLike,
                    zoom: result as number,
                    duration: 500,
                  });
              }
            );
          console.log("Clusters onClick event coordinates: " + coordinates);
        }
      });

      // When a click event occurs on a feature in
      // the unclustered-point layer, open a popup at
      // the location of the feature, with
      // description HTML from its properties.
      mapRef.current?.on("click", "unclustered-point", (e) => {
        console.log("Unclustered onClick event: ", e);

        if (e.features && e.features[0].geometry.type === "Point") {
          const coordinates = e.features[0].geometry.coordinates.slice();

          console.log("Unclusters onClick event coordinates: " + coordinates);
          // Ensure that if the map is zoomed out such that
          // multiple copies of the feature are visible, the
          // popup appears over the copy being pointed to.
          while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
            coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
          }

          const properties: SimplePlaceType = e.features[0]
            .properties as SimplePlaceType;

          console.log("Unclusters onClick event properties: ", properties);

          setPlaceSelected(properties);
          // setPlacePopupOpen(true);
          setPlaceDialogOpen(true);
        }
      });

      // TODO: understand hover on touch devices
      mapRef.current?.on("mouseenter", unclusteredPointLayer.id ?? "", (e) => {
        mapRef.current!.getCanvas().style.cursor = "pointer";
        console.log("Unclustered mouseenter event: ", e);
      });
      mapRef.current?.on("mouseleave", unclusteredPointLayer.id ?? "", () => {
        mapRef.current!.getCanvas().style.cursor = "";
      });

      mapRef.current?.on("mouseenter", clusterLayer.id ?? "", (e) => {
        console.log("clusterLayer mouseenter event: ", e);
        mapRef.current!.getCanvas().style.cursor = "pointer";

        if (e.features && e.features[0].geometry.type === "Point") {
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
        }
      });
      mapRef.current?.on("mouseleave", clusterLayer.id ?? "", () => {
        mapRef.current!.getCanvas().style.cursor = "";
      });
    }

    console.log("Map onLoad() ended");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prevent backend from overwhelming with the requests, hold for 300ms
  const mapOnMoveHandler = () => {
    // feels chunky when dragging the map if used with debounce method
    //setViewport({ ...evt.viewState });

    // update visual bounds
    setMapBounds(mapRef.current!.getBounds());

    // TODO: implement creation with crosshair.
    // get map's geographical centerpoint for later creation of place location.
    const center = mapRef.current?.getCenter();
    setCrosshairLngLat({
      lng: center?.lng ?? 0,
      lat: center?.lat ?? 0,
    });
    // const { lng, lat }: { lng: number; lat: number } =
    //   mapRef.current!.getCenter();

    // console.log("map's geographical centerpoint: ", crosshairLngLat);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flyToCoordinates = useCallback((coordinates: Array<number>) => {
    const longitude: number = coordinates[0];
    const latitude: number = coordinates[1];
    mapRef.current?.flyTo({
      center: [longitude, latitude],
      duration: 2000,
      //minZoom: minFlyToZoomLevel,
      zoom: flyToZoomLevel,
    });
  }, []);

  const [viewport, setViewport] = useState<ViewState>({
    latitude: lat,
    longitude: lon,
    zoom: initialZoom,
    bearing: 0,
    pitch: 0,
    padding: { top: 10, bottom: 25, left: 15, right: 5 },
  });

  const PLACES_SOURCE = {
    // our main points source
    data:
      `${process.env.NEXT_PUBLIC_FEATURESERV_ENDPOINT}?in_bbox=` +
      (mapBounds
        ? `${mapBounds._sw.lng},${mapBounds._sw.lat},${mapBounds._ne.lng},${mapBounds._ne.lat}`
        : [lon - 2, lat - 2, lon + 2, lat + 2].join(",")),
  };

  const [placeSelected, setPlaceSelected] = useState<SimplePlaceType>({
    place_id: -1,
    name: "None",
    category: -1,
    description: "",
    address: "",
    tags: [],
    images: [],
  });

  const [placePopupOpen, setPlacePopupOpen] = useState(false);
  const [placeDialogOpen, setPlaceDialogOpen] = useState(false);
  const [placeListPopupOpen, setPlaceListPopupOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState<string>("");

  return (
    <>
      {/* {viewport && <h2>Zoom: {viewport.zoom}</h2>}
      {viewport && <h2>mapBounds: {JSON.stringify(mapBounds)}</h2>}
       {categorySelectorForm && <pre>{JSON.stringify(categorySelectorForm, null, 4)}</pre>}
       */}
      <Dialog open={placeDialogOpen} onOpenChange={setPlaceDialogOpen}>
        <DialogTrigger></DialogTrigger>
        <DialogContent className="h-fit">
          {placeSelected && <PlaceCard place={placeSelected} />}
          <DialogFooter>
            <Button type="button" onClick={() => setPlaceDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Search
        placeholder="Find a place"
        searchHandler={(term) => {
          setSearchTerm(term);
          setPlaceListPopupOpen(true);
        }}
      />
      <Popover
        data-popover="popover-placelist"
        onOpenChange={setPlaceListPopupOpen}
        open={placeListPopupOpen}
        data-popover-placement="{right}"
      >
        <PopoverTrigger>
          {/* <div className="absolute top-0 left-0 ml-auto mr-auto">Test</div> */}
        </PopoverTrigger>

        <PopoverContent>
          {/* <ControlPanel categories={categories} onChange={setMapStyle} /> */}
          {searchTerm && (
            <PlaceList
              query={searchTerm}
              flytoHandler={(coordinates: Array<number>) =>
                flyToCoordinates(coordinates)
              }
              closeHandler={() => setPlaceListPopupOpen(false)}
            />
          )}
          {/* {categoriesSelector} */}
        </PopoverContent>
      </Popover>

      <Map
        reuseMaps
        {...viewport}
        ref={mapRef}
        style={{ width: "100%", height: "100%", display: "inline-block" }}
        // Caution!! simple demo style breaks cluster style
        // mapStyle="https://demotiles.maplibre.org/style.json"
        mapStyle={process.env.NEXT_PUBLIC_MAP_STYLE}
        // mapStyle={mapStyle && mapStyle.toJS()}
        //mapStyle={process.env.NEXT_PUBLIC_MAPTILER_API_TOKEN ? "https://api.maptiler.com/maps/basic-v2/style.json?key="+process.env.NEXT_PUBLIC_MAPTILER_API_TOKEN:process.env.NEXT_PUBLIC_MAP_STYLE}
        //maxZoom={20}
        // interactive={true} // Enables zoom with scroll
        // dragPan={false} // disable panning
        // dragRotate={false} // disable map rotation using right click + drag
        // touchZoomRotate={false} // disable map rotation using touch rotation gesture
        interactiveLayerIds={[clusterLayer.id!, unclusteredPointLayer.id!]} //enable click on markers
        onLoad={onMapLoad} // onClick={onClick}
        // attributionControl={false}
      >
        {/* <GeocoderControl position="bottom-right" placeholder="Address search" /> */}
        <GeolocateControl position="bottom-right" />
        {/* <FullscreenControl position="bottom-left" /> */}
        <NavigationControl position="bottom-right" />
        <ScaleControl />
        <CustomOverlay>
          {/* TODO: research mouse ents on overlay -> style={{ pointerEvents: "all",}} */}
          <Crosshair />
        </CustomOverlay>
        {/*need according to https://documentation.maptiler.com/hc/en-us/articles/4405445885457-How-to-add-MapTiler-attribution-to-a-map*/}
        {/* <AttributionControl
          style={{
            //color: 'ff7c92',
            "text-size-adjust": "100%",
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
        /> */}

        {/*Adding source for places*/}
        <Source
          clusterRadius={75} // cluster two points if less than stated pixels apart
          id={pointsLayerId}
          maxzoom={15}
          // clusterMinPoints={2}
          clusterMaxZoom={14} // display all points individually from stated zoom up
          type="geojson"
          // tolerance={20}
          cluster={true}
          {...PLACES_SOURCE}
          // data="https://maplibre.org/maplibre-gl-js/docs/assets/earthquakes.geojson"
        >
          <Layer {...{ source: pointsLayerId, ...clusterLayer }} />
          <Layer {...{ source: pointsLayerId, ...clusterCountLayer }} />
          <Layer {...{ source: pointsLayerId, ...unclusteredPointLayer }} />
        </Source>
      </Map>
      {/* 
      <div>
        <Button
          onClick={(e) =>
            flyToCoordinates(-123.11343223112543, 49.28339038044595)
          }
        >
          Fly to Vancouver
        </Button>
        <Button
          onClick={(e) => {
            console.log(mapRef.current);
          }}
        >
          Print mapRef.current
        </Button>
        <Button
          onClick={(e) => {
            console.log(mapRef.current?.getStyle());
          }}
        >
          Print map style
        </Button>
        <Button
          onClick={(e) => {
            handleCategorySelectorChange("poi-Bar", false);
          }}
        >
          Hide "Bar" layer
        </Button>
        <Button
          onClick={(e) => {
            console.log(
              "Places endpoint: ",
              `${process.env.NEXT_PUBLIC_FEATURESERV_ENDPOINT}?in_bbox=` +
                (mapBounds
                  ? `${mapBounds._sw.lng},${mapBounds._sw.lat},${mapBounds._ne.lng},${mapBounds._ne.lat}`
                  : [lon - 2, lat - 2, lon + 2, lat + 2].join(","))
            );
          }}
        >
          Print places endpoint
        </Button>
      </div> */}
    </>
  );
}
