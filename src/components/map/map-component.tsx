// @refresh reset
import * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
// import { ALL_PLACES_QUERY } from "@/graphql/queries/gql";
// import { useSuspenseQuery } from "@apollo/experimental-nextjs-app-support/ssr";
// import { lat2tile, lon2tile } from "@/gis-utils";
import {
  Map as DynamicMap,
  Source,
  Layer,
  ViewState,
  ViewStateChangeEvent,
  NavigationControl,
  FullscreenControl,
  ScaleControl,
  GeolocateControl,
  SymbolLayer,
  MapLayerMouseEvent,
} from "react-map-gl/maplibre";
// import ControlPanel from "@/components/control/panel";
import { GeoJSONSource, LngLatLike } from "maplibre-gl";
// need maplibre css for markers
import "maplibre-gl/dist/maplibre-gl.css";
import GeocoderControl from "./geocoder-control";
import { ViewportStatus } from "./viewport-status";
import {
  createViewportQuery,
  useViewportPlaces,
  type ViewportQuery,
} from "./viewport-places";

// TODO: investigate error when installing canvas - neeeded for SVG type of images
//import MarkerIconSvg from "./../src/assets/icon-marker.svg";
//import { Image } from "canvas";
// import Pin from "./pin";
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
import {
  CategoryType,
  useGetAllCategoriesLazyQuery,
} from "@/graphql/__generated__/types";
import PlaceCard, { SimplePlaceType } from "../places/PlaceCard";
import PlaceList from "../places/PlaceList";
import Search from "../places/Search";
import RequestReactForm from "@/app/requests/request-react-form";
import clogger from "@/lib/clogger";
import {
  clusterCountLayer,
  clusterLayer,
  unclusteredPointLayer,
  MemoizedCategoryLayers,
} from "./category-layers";
import { filterIcon } from "../icons";
import {
  addMissingBasemapImage,
  BasemapStyle,
  normalizeBasemapStyle,
} from "./basemap-style";

// import { ALL_CATEGORIES_QUERY } from "@/graphql/queries/gql";
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

const initialZoom = 13;
const pointsLayerId = "places";
const flyToZoomLevel = 19;
const viewportCookieName = "viewport";

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

// for Category filter selector
const CategorySelectorSchema = z.object({
  items: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "You have to select at least one item.",
  }),
});

const paintLayerIdCategory = "paint_category";

// export default function MapComponent({
//   categories,
// }: {
//   categories: CategoryType[];
// }) {
export default function MapComponent() {
  // Hooks
  // indicate that component is rendered
  const isMounted = useRef(false);
  // our map reference
  // const mapRef = useRef<MapLibreGL>();
  // I suspect that this is where I am presumably wrong.
  // I assume that 'maplibregl' type Map is the same as 'react-map-gl/maplibre' Map component ref={mapRef}
  // This is where I try to declare my mapRef following answer from here https://stackoverflow.com/questions/68368898/typescript-type-for-mapboxgljs-react-ref-hook
  // const mapRef = useRef<maplibregl.Map | null>(null);
  const mapRef = useRef<MapRef | null>(null);
  const missingImageMapRef = useRef<ReturnType<MapRef["getMap"]> | null>(null);

  const setMapRef = useCallback((ref: MapRef | null) => {
    if (missingImageMapRef.current) {
      missingImageMapRef.current.off(
        "styleimagemissing",
        addMissingBasemapImage
      );
    }

    mapRef.current = ref;
    missingImageMapRef.current = ref?.getMap() ?? null;
    missingImageMapRef.current?.on("styleimagemissing", addMissingBasemapImage);
  }, []);

  const [mapStyle, setMapStyle] = useState<BasemapStyle>();

  useEffect(() => {
    const styleUrl = process.env.NEXT_PUBLIC_MAP_STYLE;
    if (!styleUrl) return;

    const controller = new AbortController();

    fetch(styleUrl, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Map style request failed with HTTP ${response.status}`
          );
        }

        return response.json() as Promise<BasemapStyle>;
      })
      .then((style) => {
        setMapStyle(normalizeBasemapStyle(undefined, style));
        return style;
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return null;
        }
        clogger.error(error, "Unable to load the map style");
        return null;
      });

    return () => controller.abort();
  }, []);

  // trying other approach from here  https://gis.stackexchange.com/questions/440274/how-to-make-map-ref-object-available-on-first-modal-window-render-launch
  // Basically, instead of useRef to use useState as follows, Map component then should be set to ref={(ref) => setMap(ref)}
  //  const [map, setMap] = useState(null);
  // Map component should be set to ref={(ref) => setMap(ref)}

  // enable crosshair tracking
  const [trackCrosshair, setTrackCrosshair] = useState(false);

  // save central point of a map for creating a request without an address
  const [crosshairLngLat, setCrosshairLngLat] = useState<Array<number>>([0, 0]);
  // = useState({
  //   lng: 0,
  //   lat: 0,
  // });

  // save viewport in cookie
  const [viewportSavedInCookie, setViewportSavedInCookie] =
    useState<boolean>(true);

  // popup with a place properties
  // const [popupInfo, setPopupInfo] = useState(null);

  // const [mapStyle, setMapStyle] = useState(null);

  const [categories, setCategories] = useState<CategoryType[]>([]);

  // const { data, loading, error } = useGetAllCategoriesQuery({
  //   onCompleted: (data) => {
  //     isMounted.current && setCategories(data.categories as CategoryType[]);
  //   },
  //   onError: (err) => clogger.error(err, "Error fetching categories"),
  // });
  const [
    getAllCategories,
    {
      data: getAllCategories_data,
      loading: getAllCategories_loading,
      error: getAllCategories_error,
    },
  ] = useGetAllCategoriesLazyQuery();

  // indicate which category is visible
  const [categoriesSelectorMap, setCategoriesSelectorMap] = useState<
    Map<string, boolean>
  >(new Map());

  // used for default state
  const [
    categoriesSelectorMapInitialValues,
    setCategoriesSelectorMapInitialValues,
  ] = useState<Map<string, boolean>>(new Map());
  // used for select all button
  const [categoriesSelectorMapAllValues, setCategoriesSelectorMapAllValues] =
    useState<Map<string, boolean>>(new Map());
  // used for select none button
  const [
    categoriesSelectorMapDeselectValues,
    setCategoriesSelectorMapDeselectValues,
  ] = useState<Map<string, boolean>>(new Map());

  //Because we are using names in selector form, it is easier to update items with string[]
  const [catNames, setCatNames] = useState<string[]>([]);

  //used to show counts by category when in cluster mode
  const [categoriesClusterProperties, setCategoriesClusterProperties] =
    useState({});

  // make points clickable
  const [interactiveLayers, setInteractiveLayerIds] = useState<string[]>([]);
  const [mapLoadVersion, setMapLoadVersion] = useState(0);

  useEffect(() => {
    if (categories.length > 0) {
      clogger.debug({ data: categories }, "Categories were updated");

      const categoriesSelectorMapInitialValuesTmp: Map<string, boolean> =
        new Map();
      categories.map((item) => {
        // uncheck one category
        if (item.name == "Some_category_to_uncheck_by_default") {
          categoriesSelectorMapInitialValuesTmp.set(item.id, false);
        } else {
          categoriesSelectorMapInitialValuesTmp.set(item.id, true);
        }
      });

      setCategoriesSelectorMapInitialValues(
        categoriesSelectorMapInitialValuesTmp
      );

      // set initial categories visibility
      setCategoriesSelectorMap(categoriesSelectorMapInitialValuesTmp);

      const categoriesSelectorMapAllValuesTmp: Map<string, boolean> = new Map();
      categories.map((item) =>
        categoriesSelectorMapAllValuesTmp.set(item.id, true)
      );

      setCategoriesSelectorMapAllValues(categoriesSelectorMapAllValuesTmp);

      const categoriesSelectorMapDeselectValuesTmp: Map<string, boolean> =
        new Map();
      categories.map((item) =>
        categoriesSelectorMapDeselectValuesTmp.set(item.id, false)
      );

      setCategoriesSelectorMapDeselectValues(
        categoriesSelectorMapDeselectValuesTmp
      );

      const catNamesTmp: string[] = [];
      // update category names string[]
      categories.forEach((item) => catNamesTmp.push(item.name));
      setCatNames(catNamesTmp);

      // set default checkbox items
      const items: string[] = [];
      categories.forEach((category: CategoryType) => {
        if (categoriesSelectorMapInitialValuesTmp.get(category.id))
          items.push(category.name);
      });

      categorySelectorForm.setValue(
        "items",
        // categories.map((category: CategoryType) => category.name)
        // Array.from(categoriesSelectorMap.keys())
        items
      );

      type RecursiveArray = Array<RecursiveArray | string | number>;
      interface ArrayDict {
        [key: string]: RecursiveArray;
      }
      const filtersByCategory: ArrayDict = {
        // const filtersByCategory: { [key: string]:  } = {
        // bar: ["+", ["case", ["==", ["get", "category"], 1], 1, 0]],
      };
      categories.forEach((category) => {
        filtersByCategory[category.name.toLowerCase().replaceAll(/ /g, "_")] = [
          "+",
          ["case", ["==", ["get", "category"], Number(category.id)], 1, 0],
        ];
      });
      // categories.forEach((category) => {
      //   filtersByCategory.push({
      //     [category.name.toLowerCase().replaceAll(/ /g, "_")]: [
      //       "+",
      //       ["case", ["==", ["get", "category"], Number(category.id)], 1, 0],
      //     ],
      //   });
      // });

      // items.forEach((item) => {
      //   filtersByCategory.push({
      //     [item]: ["+", ["case", ["==", ["get", "category"], 1], 1, 0]],
      //   });
      // });
      clogger.debug({ data: filtersByCategory }, "Cluster Filters");
      setCategoriesClusterProperties(filtersByCategory);

      // set clickable layers
      const interactiveLayerIdsTmp: string[] = categories.map(
        (item: CategoryType) =>
          paintLayerIdCategory +
          "_" +
          item.name.toLowerCase().replaceAll(/ /g, "-")
      );
      clogger.debug({ data: interactiveLayerIdsTmp }, "Interactive layers");
      setInteractiveLayerIds(interactiveLayerIdsTmp);
    }
  }, [categories]);

  const [viewportQuery, setViewportQuery] = useState<ViewportQuery | null>(
    null
  );
  const {
    points: pointsDatasource,
    loading: pointsDatasourceLoading,
    hasLoaded: pointsDatasourceHasLoaded,
    error: pointsDatasourceError,
    retry: retryPointsDatasource,
  } = useViewportPlaces(
    process.env.NEXT_PUBLIC_FEATURESERV_ENDPOINT ?? "/api/smokemap/locations",
    viewportQuery
  );

  useEffect(() => {
    // update component is rendered
    isMounted.current = true;

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

    // trigger category retrieval
    getAllCategories()
      .then(({ data }) => {
        const loadedCategories = (data?.categories ?? []).filter(
          (category): category is CategoryType => category != null
        );

        setCategories(loadedCategories);
        return loadedCategories;
      })
      .catch((err: unknown) => {
        setCategories([]);
        clogger.error(err, "Error fetching categories");
      });
  }, []);

  useEffect(() => {
    clogger.debug("mapRef change detected!");
  }, [mapRef]);

  const categorySelectorForm = useForm<z.infer<typeof CategorySelectorSchema>>({
    resolver: zodResolver(CategorySelectorSchema),
    defaultValues: {
      // categories are empty at this stage, will be setup when retrieved insid useEffect
      items: categories.map((category: CategoryType) => category.name),
    },
  });

  // const handleCategorySelectorChange = (layer_id: string, checked: boolean) => {
  //   console.log(
  //     "handleCategorySelectorChange() fired with ",
  //     layer_id,
  //     checked
  //   );

  //   // update category visual checkboxes
  //   if (categoriesSelectorMap) {
  //     const tmp = categoriesSelectorMap;
  //     tmp.set(layer_id, checked);
  //     setCategoriesSelectorMap(tmp);
  //   }

  //   if (mapRef?.current) {
  //     clogger.debug("Trigger map refresh");
  //     mapRef.current.zoomTo(mapRef.current.getZoom());
  //   }
  //   // clogger.trace(
  //   //   "getLayer(" + layer_id + "):" + mapRef.current?.getLayer(layer_id)
  //   // );
  //   // clogger.trace(
  //   //   "getLayoutProperty():" +
  //   //     mapRef.current?.getLayoutProperty(layer_id, "visibility")
  //   // );
  // };

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
  const categoriesSelector = (
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
                {/* <FormDescription>
                    Select the categories you wish to appear on the map.
                  </FormDescription> */}
              </div>
              {getAllCategories_loading && <p>Loading ...</p>}
              {getAllCategories_error && (
                <p>{getAllCategories_error.message}</p>
              )}
              {categories.map((item: CategoryType) => (
                // each item will result in
                // <div>
                //  <button><span>v</span></button>
                //  <input/>
                // <label/>
                // </div>
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
                              console.log("onCheckedChange fired");
                              if (
                                mapRef &&
                                mapRef.current
                                // mapRef.current?.isStyleLoaded()
                              ) {
                                // const layer_id = `poi-${item?.name?.replace(
                                //   / /g,
                                //   "-"
                                // )}`;

                                // update category visual checkboxes
                                setCategoriesSelectorMap(
                                  new Map(
                                    categoriesSelectorMap.set(item.id, checked)
                                  )
                                );

                                if (mapRef?.current) {
                                  clogger.debug("Trigger map refresh");
                                  mapRef.current.zoomTo(
                                    mapRef.current.getZoom()
                                  );
                                }
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
        <Button
          type="button"
          onClick={() => {
            setCategoriesSelectorMap(categoriesSelectorMapAllValues);
            categorySelectorForm.setValue("items", catNames);
          }}
        >
          select all
        </Button>
        <Button
          type="button"
          onClick={() => {
            setCategoriesSelectorMap(categoriesSelectorMapDeselectValues);
            categorySelectorForm.setValue("items", []);
          }}
        >
          select none
        </Button>
        {/* <Button type="submit">Submit</Button> */}
      </form>
    </Form>
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
  const onMapIdle = useCallback(() => {
    clogger.trace("onMapIdle() fired");
  }, []);

  const settleViewport = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const nextQuery = createViewportQuery(map.getBounds(), map.getZoom());
    setViewportQuery((currentQuery) =>
      sameViewportQuery(currentQuery, nextQuery) ? currentQuery : nextQuery
    );
  }, []);

  const onMapLoad = useCallback(() => {
    clogger.trace("onLoad() fired");
    setMapLoadVersion((version) => version + 1);

    if (viewportSavedInCookie) {
      if (isMounted.current) {
        const savedViewport = readViewportCookie();
        if (savedViewport) setViewport(savedViewport);
      }
    }

    window.requestAnimationFrame(settleViewport);

    if (mapRef && mapRef.current) {
      clogger.trace({ data: mapRef.current }, "onMapLoad() =>  mapRef.current");

      // When a click event occurs on the clusters layer
      // zoom in to expand level
      mapRef.current?.on("click", clusterLayer.id!, (e) => {
        clogger.debug(
          {
            data: mapRef.current,
            style: mapRef.current?.getStyle(),
            layer: mapRef.current?.getLayer(clusterLayer.id!),
            source: mapRef.current?.getSource(pointsLayerId),
          },
          "mapRef"
        );
        clogger.debug({ data: e }, "clustered mapRef.current.onClick event");
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
          clogger.trace(
            { data: coordinates },
            "Clustered onClick event coordinates"
          );
        }
      });

      mapRef.current?.on("mouseenter", clusterLayer.id ?? "", (e) => {
        // test map instance still exists
        if (mapRef === null || mapRef === undefined) {
          clogger.error("Map reference is lost !");
        }
        clogger.trace({ data: e }, "clustered mouseenter event");
        mapRef.current!.getCanvas().style.cursor = "pointer";

        if (e.features && e.features[0].geometry.type === "Point") {
          const coordinates = e.features[0].geometry.coordinates.slice();

          clogger.trace(
            { data: coordinates },
            "clustered mouseenter event coordinates"
          );
          // Ensure that if the map is zoomed out such that
          // multiple copies of the feature are visible, the
          // popup appears over the copy being pointed to.
          while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
            coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
          }

          const properties = e.features[0].properties;

          clogger.trace(
            { data: properties },
            "clustered mouseenter event properties"
          );
        }
      });
      mapRef.current?.on("mouseleave", clusterLayer.id ?? "", () => {
        mapRef.current!.getCanvas().style.cursor = "";
      });
    }

    //console.log("Map onLoad() ended");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settleViewport, viewportSavedInCookie]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || mapLoadVersion === 0) return;

    const registrations = interactiveLayers.map((layer) => {
      const handleClick = (e: MapLayerMouseEvent) => {
        clogger.trace({ data: e }, "onClick event fired for " + layer);

        if (e.features && e.features[0].geometry.type === "Point") {
          const coordinates = e.features[0].geometry.coordinates.slice();

          clogger.trace("unclustered onClick event coordinates " + coordinates);
          // Ensure that if the map is zoomed out such that multiple copies of
          // the feature are visible, the dialog targets the pointed-to copy.
          while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
            coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
          }

          const properties = e.features[0].properties as SimplePlaceType;
          clogger.trace(
            { data: properties },
            "unclustered onClick event properties"
          );

          setPlaceSelected(properties);
          setPlaceDialogOpen(true);
        }
      };
      const handleMouseEnter = (e: MapLayerMouseEvent) => {
        map.getCanvas().style.cursor = "pointer";
        clogger.trace({ data: e }, "unclustered mouseenter event");
      };
      const handleMouseLeave = () => {
        map.getCanvas().style.cursor = "";
      };

      clogger.trace("Create category handlers for " + layer);
      map.on("click", layer, handleClick);
      map.on("mouseenter", layer, handleMouseEnter);
      map.on("mouseleave", layer, handleMouseLeave);

      return { layer, handleClick, handleMouseEnter, handleMouseLeave };
    });

    return () => {
      registrations.forEach(
        ({ layer, handleClick, handleMouseEnter, handleMouseLeave }) => {
          map.off("click", layer, handleClick);
          map.off("mouseenter", layer, handleMouseEnter);
          map.off("mouseleave", layer, handleMouseLeave);
        }
      );
      map.getCanvas().style.cursor = "";
    };
  }, [interactiveLayers, mapLoadVersion]);

  const handleMapMove = useCallback((evt: ViewStateChangeEvent) => {
    setViewport(evt.viewState);
  }, []);

  const handleMapMoveEnd = useCallback(
    (evt: ViewStateChangeEvent) => {
      settleViewport();

      // get map's geographical centerpoint for later creation of place location.
      const center = mapRef.current?.getCenter();
      // setCrosshairLngLat({
      //   lng: center?.lng ?? 0,
      //   lat: center?.lat ?? 0,
      // });

      setCrosshairLngLat([center?.lng ?? 0, center?.lat ?? 0]);
      // const { lng, lat }: { lng: number; lat: number } =
      //   mapRef.current!.getCenter();

      if (viewportSavedInCookie) {
        writeViewportCookie(evt.viewState);
      }
    },
    [settleViewport, viewportSavedInCookie]
  );

  useEffect(() => {
    clogger.trace("map's geographical centerpoint: " + crosshairLngLat);
  }, [crosshairLngLat]);

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
    data: pointsDatasource,
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

  const [placeDialogOpen, setPlaceDialogOpen] = useState(false);
  const [placeListPopupOpen, setPlaceListPopupOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState<string>("");

  // Set Layer for categories

  const symbolLayerIdName = "symbol_name";
  const [symbolLayerName, setSymbolLayerName] = useState<SymbolLayer>({
    id: symbolLayerIdName,
    type: "symbol",
    source: pointsLayerId,
    layout: {
      visibility: "visible",
      "text-allow-overlap": true,
      "text-font": ["Noto Sans Regular"],
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
  });

  return (
    <>
      {/* {viewport && <h2>Zoom: {viewport.zoom}</h2>}
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
        </PopoverContent>
      </Popover>
      {/* //crosshairPositionHandler: () => Array<number>; </> */}
      <RequestReactForm
        categories={categories}
        enableTracking={(value: boolean) => {
          setTrackCrosshair(value);
        }}
        crosshairPosition={crosshairLngLat}
      />
      <div className="absolute right-5 top-20 z-20">
        <Popover>
          <PopoverTrigger type="button" className="bg-transparent">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24px"
              height="24px"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M19 3H5C3.89543 3 3 3.89543 3 5V6.17157C3 6.70201 3.21071 7.21071 3.58579 7.58579L9.41421 13.4142C9.78929 13.7893 10 14.298 10 14.8284V20V20.2857C10 20.9183 10.7649 21.2351 11.2122 20.7878L12 20L13.4142 18.5858C13.7893 18.2107 14 17.702 14 17.1716V14.8284C14 14.298 14.2107 13.7893 14.5858 13.4142L20.4142 7.58579C20.7893 7.21071 21 6.70201 21 6.17157V5C21 3.89543 20.1046 3 19 3Z"
                stroke="#3f6be3"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {/* <pre className="text-left text-red-800">
              {mapRef.current && (
                <p>Zoom:{Math.floor(mapRef.current.getZoom())}</p>
              )}
            </pre> */}
          </PopoverTrigger>
          <PopoverContent>
            {categoriesSelectorMap.size > 0 && (
              <>
                {/* <pre className="text-left text-red-800">
                  {JSON.stringify(Array.from(categoriesSelectorMap.entries()))}
                </pre> */}

                <div className="m-1 p-2">{categoriesSelector}</div>
              </>
            )}
          </PopoverContent>
        </Popover>
      </div>
      <ViewportStatus
        loading={pointsDatasourceLoading}
        hasLoaded={pointsDatasourceHasLoaded}
        error={pointsDatasourceError}
        points={pointsDatasource}
        onRetry={retryPointsDatasource}
      />
      {mapStyle && (
        <DynamicMap
          reuseMaps
          {...viewport}
          ref={setMapRef}
          style={{ width: "100%", height: "100%", display: "inline-block" }}
          // Caution!! simple demo style breaks cluster style
          // mapStyle="https://demotiles.maplibre.org/style.json"
          mapStyle={mapStyle}
          // mapStyle={mapStyle && mapStyle.toJS()}
          //mapStyle={process.env.NEXT_PUBLIC_MAPTILER_API_TOKEN ? "https://api.maptiler.com/maps/basic-v2/style.json?key="+process.env.NEXT_PUBLIC_MAPTILER_API_TOKEN:process.env.NEXT_PUBLIC_MAP_STYLE}
          //maxZoom={20}
          // interactive={true} // Enables zoom with scroll
          // dragPan={false} // disable panning
          // dragRotate={false} // disable map rotation using right click + drag
          // touchZoomRotate={false} // disable map rotation using touch rotation gesture
          // interactiveLayerIds={[clusterLayer.id!, unclusteredPointLayer.id!]} //enable click on markers
          interactiveLayerIds={[clusterLayer.id!, ...interactiveLayers]} //enable click on markers
          onLoad={onMapLoad} // onClick={onClick}
          onIdle={onMapIdle}
          onMove={handleMapMove}
          onMoveEnd={handleMapMoveEnd}
          // attributionControl={false}
        >
          {/* <GeocoderControl position="bottom-right" placeholder="Address search" /> */}
          <GeolocateControl position="bottom-right" />
          {/* <FullscreenControl position="bottom-left" /> */}
          <NavigationControl position="bottom-right" />
          <ScaleControl />

          {trackCrosshair && (
            <CustomOverlay>
              {/* TODO: research mouse ents on overlay -> style={{ pointerEvents: "all",}} */}
              <Crosshair />
            </CustomOverlay>
          )}

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
            type="geojson"
            {...PLACES_SOURCE}
            id={pointsLayerId}
            maxzoom={14}
            // tolerance={20}
            cluster={true}
            clusterRadius={30} // cluster two points if less than stated pixels apart
            clusterMinPoints={3}
            clusterMaxZoom={15} // display all points individually from stated zoom up
            clusterProperties={categoriesClusterProperties}
            // {
            //   bar: ["+", ["case", ["==",["get","category"],"1"], 1, 0]]
            // }
            // data="https://maplibre.org/maplibre-gl-js/docs/assets/earthquakes.geojson"
          >
            <Layer {...{ source: pointsLayerId, ...clusterLayer }} />
            <Layer {...{ source: pointsLayerId, ...clusterCountLayer }} />
            {/* <Layer {...{ source: pointsLayerId, ...clusterCountLayerBars }} /> */}
            {/* <Layer {...{ source: pointsLayerId, ...unclusteredPointLayer }} /> */}

            <MemoizedCategoryLayers
              sourceLayerId={pointsLayerId}
              paintLayerIdCategory={paintLayerIdCategory}
              categories={categories}
              selector={categoriesSelectorMap}
            />
          </Source>
        </DynamicMap>
      )}
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
            //console.log(mapRef.current);
          }}
        >
          Print mapRef.current
        </Button>
        <Button
          onClick={(e) => {
            //console.log(mapRef.current?.getStyle());
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
      </div> */}
    </>
  );
}
