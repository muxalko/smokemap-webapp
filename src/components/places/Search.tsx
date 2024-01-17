"use client";

import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

type Props = {
  placeholder: string;
  searchHandler: (term: string) => void;
};

export default function Search({ placeholder, searchHandler }: Props) {
  function handleSearch(term: string) {
    console.log(term);
    searchHandler(term);
  }

  return (
    <div className="absolute flex flex-1 flex-shrink-0 z-10 bottom-24 right-3">
      <label htmlFor="search" className="sr-only">
        Search
      </label>
      <input
        className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500"
        placeholder={placeholder}
        onKeyUp={(e) => {
          if (e.key === "Enter") {
            handleSearch(e.currentTarget.value);
          }
        }}
        enterKeyHint="enter"
        // onChange={(e) => {
        //   handleSearch(e.target.value);
        // }}
      />
      <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
    </div>
  );
}
