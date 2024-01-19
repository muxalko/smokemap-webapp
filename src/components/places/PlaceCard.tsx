"use client";
import {
  ImageType,
  PlaceType,
  useGetPlaceByIdQuery,
} from "@/graphql/__generated__/types";
import { GET_PLACE_BY_ID } from "@/graphql/queries/request";
import { useQuery } from "@apollo/client";
import Image from "next/image";
import { Button } from "../ui/button";

export type SimplePlaceType = {
  place_id: number;
  name: string;
  category: number;
  description: string;
  address: string;
  tags: [];
  images: [];
};

type Props = {
  place: SimplePlaceType;
};

export default function PlaceCard({ place }: Props) {
  const { data, loading, error } = useQuery(GET_PLACE_BY_ID, {
    fetchPolicy: "cache-first",
    variables: { id: place.place_id.toString() },
  });

  console.log("PlaceCard: ", place);

  if (loading) return "Loading...";
  if (error) return `Error! ${error.message}`;

  return (
    <div className="max-w-sm rounded-lg border border-gray-200 bg-white shadow dark:border-gray-700 dark:bg-gray-800">
      <section className="my-5">
        <div className="rounded-lg border dark:border-neutral-600">
          <div className="p-4">
            <div
              id="carouselExampleIndicators"
              className="relative"
              data-te-carousel-init=""
              data-te-ride="carousel"
            >
              <div className="relative w-full overflow-hidden after:clear-both after:block after:content-['']">
                {data?.placeById?.imageSet &&
                  data?.placeById?.imageSet.map((image: ImageType) => {
                    return (
                      <div
                        key={image.id}
                        className="duration-[600ms] relative float-left -mr-[100%] w-full transition-transform ease-in-out motion-reduce:transition-none"
                        data-te-carousel-item=""
                      >
                        <Image
                          key={image.id}
                          src={image.url}
                          width={500}
                          height={500}
                          className="block w-full rounded-t-lg"
                          alt={image.name}
                        />
                      </div>
                    );
                  })}
              </div>
              <button
                className="ease-[cubic-bezier(0.25,0.1,0.25,1.0)] absolute bottom-0 left-0 top-0 z-[1] flex w-[15%] items-center justify-center border-0 bg-none p-0 text-center text-white opacity-50 transition-opacity duration-150 hover:text-white hover:no-underline hover:opacity-90 hover:outline-none focus:text-white focus:no-underline focus:opacity-90 focus:outline-none motion-reduce:transition-none"
                type="button"
                data-te-target="#carouselExampleIndicators"
                data-te-slide="prev"
              >
                <span className="inline-block h-8 w-8">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                    className="h-6 w-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 19.5L8.25 12l7.5-7.5"
                    ></path>
                  </svg>
                </span>
                <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
                  Previous
                </span>
              </button>
              <button
                className="ease-[cubic-bezier(0.25,0.1,0.25,1.0)] absolute bottom-0 right-0 top-0 z-[1] flex w-[15%] items-center justify-center border-0 bg-none p-0 text-center text-white opacity-50 transition-opacity duration-150 hover:text-white hover:no-underline hover:opacity-90 hover:outline-none focus:text-white focus:no-underline focus:opacity-90 focus:outline-none motion-reduce:transition-none"
                type="button"
                data-te-target="#carouselExampleIndicators"
                data-te-slide="next"
              >
                <span className="inline-block h-8 w-8">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                    className="h-6 w-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.25 4.5l7.5 7.5-7.5 7.5"
                    ></path>
                  </svg>
                </span>
                <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
                  Next
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>
      <div className="p-5">
        <a href="#">
          <h5 className="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            {data?.placeById?.name}
          </h5>
        </a>

        <p className="mb-3 font-normal text-gray-700 dark:text-gray-400">
          {data?.placeById?.category?.name}
        </p>
        <p className="mb-3 font-normal text-gray-700 dark:text-gray-400">
          {data?.placeById?.description}
        </p>
        <p className="mb-3 font-normal text-gray-700 dark:text-gray-400">
          {data?.placeById?.address?.properties?.addressString}
        </p>
        <a
          href="#"
          className="inline-flex items-center rounded-lg bg-blue-700 px-3 py-2 text-center text-sm font-medium text-white hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
        >
          {" "}
          GO
          <svg
            className="ms-2 h-3.5 w-3.5 rtl:rotate-180"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 14 10"
          >
            <path
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M1 5h12m0 0L9 1m4 4L9 9"
            ></path>
          </svg>
        </a>
      </div>
    </div>
  );
}
