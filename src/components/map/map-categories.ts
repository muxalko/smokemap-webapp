import {
  type CategoryType,
  useGetAllCategoriesLazyQuery,
} from "@/graphql/__generated__/types";
import clogger from "@/lib/clogger";
import { useCallback, useEffect, useMemo, useState } from "react";

export const paintLayerIdCategory = "paint_category";

type RecursiveArray = Array<RecursiveArray | string | number>;

export type CategoryClusterProperties = Record<string, RecursiveArray>;

export interface MapCategoriesState {
  categories: CategoryType[];
  loading: boolean;
  error: string | null;
  visibility: Map<string, boolean>;
  clusterProperties: CategoryClusterProperties;
  interactiveLayerIds: string[];
  setCategoryVisible: (categoryId: string, visible: boolean) => void;
  selectAll: () => void;
  selectNone: () => void;
}

function visibilityFor(
  categories: CategoryType[],
  visible: boolean
): Map<string, boolean> {
  return new Map(categories.map((category) => [category.id, visible]));
}

function defaultVisibilityFor(
  categories: CategoryType[]
): Map<string, boolean> {
  return new Map(
    categories.map((category) => [
      category.id,
      category.name !== "Some_category_to_uncheck_by_default",
    ])
  );
}

export function useMapCategories(): MapCategoriesState {
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [visibility, setVisibility] = useState<Map<string, boolean>>(new Map());
  const [getAllCategories, { loading, error }] =
    useGetAllCategoriesLazyQuery();

  useEffect(() => {
    let active = true;

    void getAllCategories()
      .then(({ data }) => {
        if (!active) return null;
        const loadedCategories = (data?.categories ?? []).filter(
          (category): category is CategoryType => category != null
        );
        clogger.debug({ data: loadedCategories }, "Categories were updated");
        setCategories(loadedCategories);
        setVisibility(defaultVisibilityFor(loadedCategories));
        return loadedCategories;
      })
      .catch((reason: unknown) => {
        if (!active) return null;
        setCategories([]);
        setVisibility(new Map());
        clogger.error(reason, "Error fetching categories");
        return null;
      });

    return () => {
      active = false;
    };
  }, [getAllCategories]);

  const clusterProperties = useMemo(() => {
    const properties: CategoryClusterProperties = {};
    categories.forEach((category) => {
      properties[category.name.toLowerCase().replaceAll(/ /g, "_")] = [
        "+",
        ["case", ["==", ["get", "category"], Number(category.id)], 1, 0],
      ];
    });
    return properties;
  }, [categories]);

  const interactiveLayerIds = useMemo(
    () =>
      categories.map(
        (category) =>
          `${paintLayerIdCategory}_${category.name
            .toLowerCase()
            .replaceAll(/ /g, "-")}`
      ),
    [categories]
  );

  const setCategoryVisible = useCallback(
    (categoryId: string, visible: boolean) => {
      setVisibility((current) => {
        const next = new Map(current);
        next.set(categoryId, visible);
        return next;
      });
    },
    []
  );

  const selectAll = useCallback(() => {
    setVisibility(visibilityFor(categories, true));
  }, [categories]);

  const selectNone = useCallback(() => {
    setVisibility(visibilityFor(categories, false));
  }, [categories]);

  return {
    categories,
    loading,
    error: error?.message ?? null,
    visibility,
    clusterProperties,
    interactiveLayerIds,
    setCategoryVisible,
    selectAll,
    selectNone,
  };
}
