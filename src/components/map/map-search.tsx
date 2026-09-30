import type { SimplePlaceType } from "@/components/places/PlaceCard";
import Search from "@/components/places/Search";
import type { PlaceSearchResult } from "@/components/places/place-search";

export interface MapSearchProps {
  onFlyTo: (coordinates: number[]) => void;
  onOpenPlace: (place: SimplePlaceType) => void;
}

export function searchResultPlace(result: PlaceSearchResult): SimplePlaceType {
  return {
    place_id: result.id,
    name: result.name,
    category: result.category?.id ?? -1,
    description: "",
    address: result.address ?? "",
    tags: [],
    images: [],
  };
}

export function MapSearch({ onFlyTo, onOpenPlace }: MapSearchProps) {
  return (
    <Search
      placeholder="Find a place"
      onSelect={(result) => {
        onFlyTo(result.coordinates);
        onOpenPlace(searchResultPlace(result));
      }}
    />
  );
}
