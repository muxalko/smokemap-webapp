"use client";
import { PlaceType } from "@/graphql/__generated__/types";
import { GET_PLACES_STARTWITH_NAME } from "@/graphql/queries/request";
import { useQuery } from "@apollo/client";
import * as React from "react";
import { useState } from "react";
import { Button } from "../ui/button";

type Props = {
  query: string;
  closeHandler: () => void;
  flytoHandler: (coordinates: Array<number>) => void;
};

export default function PlaceList({
  query = "",
  closeHandler,
  flytoHandler,
}: Props) {
  const { data, loading, error } = useQuery(GET_PLACES_STARTWITH_NAME, {
    fetchPolicy: "network-only",
    variables: { name: query },
  });

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error.message}</p>;
  if (data && data.placesStartwithName && data.placesStartwithName.length < 1)
    return <p>Found none</p>;
  return (
    <div className="relative overflow-auto rounded-xl">
      <div className="px-4">
        <ul className="mx-auto max-w-3xl bg-white p-2 shadow">
          {data &&
            data.placesStartwithName &&
            data.placesStartwithName?.map((item: PlaceType) => (
              <li
                key={item.id}
                className="group/item relative flex items-center justify-between rounded-xl p-4 hover:bg-slate-100"
              >
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <img
                      className="h-12 w-12 rounded-full"
                      src={item.imageSet.at(0)?.url}
                      alt={item.imageSet.at(0)?.name}
                    />
                  </div>
                  <div className="w-full text-sm leading-6">
                    <a href="#" className="font-semibold text-slate-900">
                      <span
                        className="absolute inset-0 rounded-xl"
                        aria-hidden="true"
                      ></span>
                      {item.name}
                    </a>
                    <div className="text-slate-500">{item.category.name}</div>
                  </div>
                </div>
                <a
                  href="#"
                  onClick={() =>
                    flytoHandler(
                      item.address.geometry.coordinates as Array<number>
                    )
                  }
                  className="group/edit invisible relative flex items-center whitespace-nowrap rounded-full py-1 pl-4 pr-3 text-sm text-slate-500 transition hover:bg-slate-200 group-hover/item:visible"
                >
                  <span className="font-semibold transition group-hover/edit:text-gray-700">
                    Flyto
                  </span>
                  <svg
                    className="mt-px h-5 w-5 text-slate-400 transition group-hover/edit:translate-x-0.5 group-hover/edit:text-slate-500"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                      clipRule="evenodd"
                    ></path>
                  </svg>
                </a>
              </li>
            ))}
        </ul>
        <div className="flex flex-col-reverse py-2 sm:flex-row sm:justify-end sm:space-x-2">
          <Button type="button" variant="default" onClick={closeHandler}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
