import { useEffect, useState } from "react";

import clogger from "@/lib/clogger";
import {
  type BasemapStyle,
  normalizeBasemapStyle,
} from "./basemap-style";

export function useBasemapStyle(styleUrl: string | undefined) {
  const [mapStyle, setMapStyle] = useState<BasemapStyle>();

  useEffect(() => {
    if (!styleUrl) return;
    const controller = new AbortController();

    void fetch(styleUrl, { signal: controller.signal })
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
        if (
          typeof error === "object" &&
          error !== null &&
          "name" in error &&
          error.name === "AbortError"
        ) {
          return;
        }
        clogger.error(error, "Unable to load the map style");
      });

    return () => controller.abort();
  }, [styleUrl]);

  return mapStyle;
}
