"use client";

import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useId, useState, type KeyboardEvent } from "react";

import {
  PLACE_SEARCH_MAX_LENGTH,
  usePlaceSearch,
  type PlaceSearchOptions,
  type PlaceSearchResult,
  type PlaceSearchState,
} from "./place-search";

type Props = PlaceSearchOptions & {
  placeholder?: string;
  onSelect: (result: PlaceSearchResult) => void;
};

function statusMessage(state: PlaceSearchState): string {
  switch (state.status) {
    case "idle":
      return "";
    case "too-short":
      return `Type at least ${state.minLength} characters to search.`;
    case "too-long":
      return `Search is limited to ${state.maxLength} characters.`;
    case "loading":
      return "Searching…";
    case "empty":
      return `No places match “${state.query}”.`;
    case "error":
      return `Search failed: ${state.message}`;
    case "success":
      return `${state.results.length} ${
        state.results.length === 1 ? "place" : "places"
      } found.`;
  }
}

function locationContext(result: PlaceSearchResult): string {
  if (result.address) return result.address;
  const [longitude, latitude] = result.coordinates;
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

export default function Search({
  placeholder = "Find a place",
  onSelect,
  ...options
}: Props) {
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  // A closed popup searches nothing, which also aborts any in-flight request.
  const { state, retry } = usePlaceSearch(open ? input : "", options);
  const id = useId();
  const listboxId = `${id}-listbox`;
  const statusId = `${id}-status`;
  const optionId = (index: number) => `${id}-option-${index}`;

  const results = state.status === "success" ? state.results : [];
  const active = activeIndex < results.length ? activeIndex : -1;
  const expanded = open && results.length > 0;
  const message = open ? statusMessage(state) : "";

  function select(result: PlaceSearchResult) {
    setInput(result.name);
    setOpen(false);
    setActiveIndex(-1);
    onSelect(result);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!open) {
          setOpen(true);
        } else if (results.length > 0) {
          setActiveIndex((active + 1) % results.length);
        }
        break;
      case "ArrowUp":
        event.preventDefault();
        if (results.length > 0) {
          setActiveIndex(active <= 0 ? results.length - 1 : active - 1);
        }
        break;
      case "Enter":
        if (expanded) {
          event.preventDefault();
          select(results[active >= 0 ? active : 0]);
        }
        break;
      case "Escape":
        if (open && input) {
          event.preventDefault();
          setOpen(false);
          setActiveIndex(-1);
        } else if (input) {
          event.preventDefault();
          setInput("");
        }
        break;
    }
  }

  return (
    <div className="absolute right-16 top-5 z-20 flex w-44 flex-1 flex-shrink-0 sm:w-80">
      <label htmlFor={`${id}-input`} className="sr-only">
        Search places
      </label>
      <input
        id={`${id}-input`}
        type="search"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listboxId}
        aria-activedescendant={active >= 0 ? optionId(active) : undefined}
        aria-describedby={statusId}
        autoComplete="off"
        maxLength={PLACE_SEARCH_MAX_LENGTH}
        className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500"
        placeholder={placeholder}
        value={input}
        enterKeyHint="search"
        onChange={(event) => {
          setInput(event.currentTarget.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setOpen(false);
          setActiveIndex(-1);
        }}
        onKeyDown={handleKeyDown}
      />
      <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
      <div
        className={
          message
            ? "absolute right-0 top-11 w-64 overflow-hidden rounded-md border border-gray-200 bg-white text-sm shadow-lg sm:w-80"
            : "hidden"
        }
        role="presentation"
        // Keep focus in the input so clicks can select before blur closes it.
        onMouseDown={(event) => event.preventDefault()}
      >
        <p
          id={statusId}
          role="status"
          aria-live="polite"
          className={
            state.status === "success"
              ? "sr-only"
              : "px-3 py-2 text-gray-600"
          }
        >
          {message}
        </p>
        {open && state.status === "error" && (
          <button
            type="button"
            className="mx-3 mb-2 rounded border border-gray-300 px-2 py-1 text-gray-800 hover:bg-gray-100"
            onClick={retry}
          >
            Retry
          </button>
        )}
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Place search results"
          className={expanded ? "max-h-80 overflow-y-auto py-1" : "hidden"}
        >
          {expanded &&
            results.map((result, index) => (
              <li
                key={result.id}
                id={optionId(index)}
                role="option"
                aria-selected={index === active}
                className={`cursor-pointer px-3 py-2 ${
                  index === active ? "bg-slate-200" : "hover:bg-slate-100"
                }`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => select(result)}
              >
                <span className="block truncate font-semibold text-slate-900">
                  {result.name}
                </span>
                <span className="block truncate text-xs text-slate-500">
                  {result.category ? `${result.category.name} · ` : ""}
                  {locationContext(result)}
                </span>
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
}
