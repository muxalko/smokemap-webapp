"use client";

import { search } from "@/app/actions";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useEffect, useRef, useState } from "react";

type Props = {
  placeholder: string;
  searchHandler: (term: string) => void;
};

export default function Search({ placeholder, searchHandler }: Props) {
  const [searchString, setSearchString] = useState<string>("");
  const [placesNames, setPlacesNames] = useState<Array<string | null>>([]);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // //console.log("Search term changed:", searchString);

    async function fetchPlacesNames() {
      setLoading(true);
      const placesNames = await search(searchString);

      setPlacesNames(placesNames ?? []);

      setLoading(false);
    }

    void fetchPlacesNames();
  }, [searchString]);

  function handleSearch(term: string) {
    //console.log(term);
    searchHandler(term);
  }

  return (
    <div className="absolute right-16 top-5 z-20 flex w-32 flex-1 flex-shrink-0 sm:w-80">
      <label htmlFor="search" className="sr-only">
        Search
      </label>
      <input
        ref={searchRef}
        maxLength={128}
        className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500"
        placeholder={placeholder}
        onKeyUp={(e) => {
          if (e.key === "Enter") {
            handleSearch(e.currentTarget.value);
          }
        }}
        value={searchString}
        enterKeyHint="enter"
        onChange={(e) => setSearchString(e.currentTarget.value)}
        // onChange={(e) => {
        //   const placesFound = search(e.target.value);
        //   //console.log("returned with search:", placesFound);
        //   await placesFound.then((data) => //console.log("then:", data));
        // }}
      />
      <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
      <div className="absolute left-7 top-10 flex h-fit flex-col overflow-hidden">
        {placesNames &&
          placesNames.length != 0 &&
          !(placesNames.length == 1 && placesNames.at(0) === searchString) &&
          placesNames.map((item, index) => {
            const shift_y = index + 4;
            return (
              <button
                className="flex-1 bg-slate-200 py-0.5 text-slate-800 hover:cursor-pointer hover:bg-slate-300 hover:text-slate-900"
                key={index}
                value={item ?? ""}
                onClick={(e) => {
                  //console.log((e.target as HTMLInputElement).value);
                  setSearchString((e.target as HTMLInputElement).value);
                  setPlacesNames([]);
                  searchRef.current?.focus();
                }}
              >
                {item}
                {/* <input type="hidden" value={item} /> */}
              </button>
            );
          })}
      </div>
    </div>
  );
}
