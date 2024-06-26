"use client";
import React, { useEffect, useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ImageType,
  PlaceType,
  useGetPlaceByIdQuery,
} from "@/graphql/__generated__/types";
import { GET_PLACE_BY_ID } from "@/graphql/queries/gql";
import { useQuery } from "@apollo/client";
import Image from "next/image";
import { Button } from "../ui/button";
import clogger from "@/lib/clogger";

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
  const { data, loading, error } = useGetPlaceByIdQuery({
    variables: { id: place.place_id.toString() },
  });

  clogger.debug({ data: place }, "PlaceCard got object");

  const [imageOpen, setImageOpen] = useState(false);
  const [currentImage, setCurrentImage] = useState<ImageType>();

  if (loading) return "Loading...";
  if (error) return `Error! ${error.message}`;

  return (
    <>
      <Dialog open={imageOpen} onOpenChange={setImageOpen}>
        <DialogTrigger></DialogTrigger>
        <DialogContent className="max-h-fit w-full max-w-full">
          {currentImage && (
            <Image
              onClick={(e) => {
                setImageOpen(false);
              }}
              src={currentImage.url}
              width={500}
              height={500}
              className="block w-full rounded-t-lg"
              alt={currentImage.name}
            />
          )}
        </DialogContent>
      </Dialog>
      <Card className="h-fit max-h-fit max-w-xl">
        <CardHeader>
          <CardTitle>{data?.placeById?.name}</CardTitle>

          <CardDescription className="mb-3 font-bold text-gray-700 dark:text-gray-400">
            {data?.placeById?.category?.name}
          </CardDescription>
          <CardDescription className="mb-3 font-normal text-gray-700 dark:text-gray-400">
            {data?.placeById?.description}
          </CardDescription>
          <CardDescription className="mb-3 font-thin italic text-gray-700 dark:text-gray-400">
            {data?.placeById?.address?.properties?.addressString}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Carousel>
            <CarouselContent>
              {data?.placeById?.imageSet &&
                data?.placeById?.imageSet.map((image: ImageType) => {
                  return (
                    <CarouselItem className="basis-full" key={image.id}>
                      <Image
                        onClick={(e) => {
                          setCurrentImage(image);
                          setImageOpen(true);
                        }}
                        src={image.url}
                        width={500}
                        height={500}
                        className="block w-full rounded-t-lg"
                        alt={image.name}
                      />
                    </CarouselItem>
                  );
                })}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </CardContent>
        <CardFooter>
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
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M1 5h12m0 0L9 1m4 4L9 9"
              ></path>
            </svg>
          </a>
        </CardFooter>
      </Card>
    </>
  );
}
