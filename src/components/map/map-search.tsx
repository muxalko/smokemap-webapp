import { useState } from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import PlaceList from "@/components/places/PlaceList";
import Search from "@/components/places/Search";

export interface MapSearchProps {
  onFlyTo: (coordinates: number[]) => void;
}

export function MapSearch({ onFlyTo }: MapSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [open, setOpen] = useState(false);

  return (
    <>
      <Search
        placeholder="Find a place"
        searchHandler={(term) => {
          setSearchTerm(term);
          setOpen(true);
        }}
      />
      <Popover
        data-popover="popover-placelist"
        onOpenChange={setOpen}
        open={open}
        data-popover-placement="{right}"
      >
        <PopoverTrigger />
        <PopoverContent>
          {searchTerm && (
            <PlaceList
              query={searchTerm}
              flytoHandler={onFlyTo}
              closeHandler={() => setOpen(false)}
            />
          )}
        </PopoverContent>
      </Popover>
    </>
  );
}
