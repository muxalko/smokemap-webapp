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
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { PublicMediaRenditionType } from "@/graphql/__generated__/types";
import { useGetPlaceByIdQuery } from "@/graphql/__generated__/types";
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

type PublicMedia = Pick<
  PublicMediaRenditionType,
  "publicId" | "url" | "position" | "mimeType" | "byteSize" | "width" | "height"
>;

function PublicMediaImage({
  media,
  alt,
  onOpen,
  onUnavailable,
}: {
  media: PublicMedia;
  alt: string;
  onOpen: () => void;
  onUnavailable: () => void;
}) {
  return (
    <button
      type="button"
      className="block w-full"
      aria-label={`Enlarge ${alt}`}
      onClick={onOpen}
    >
      {/* The backend supplies an application-controlled URL and no-store response. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={media.url}
        width={media.width}
        height={media.height}
        className="block max-h-96 w-full rounded-t-lg object-contain"
        alt={alt}
        loading="lazy"
        onError={onUnavailable}
      />
    </button>
  );
}

export function PublicPlaceMedia({
  media,
  placeName,
}: {
  media: PublicMedia[];
  placeName: string;
}) {
  const [unavailable, setUnavailable] = useState<Set<string>>(() => new Set());
  const [currentMedia, setCurrentMedia] = useState<PublicMedia>();

  useEffect(() => {
    setUnavailable(new Set());
    setCurrentMedia(undefined);
  }, [media]);

  const markUnavailable = (item: PublicMedia) => {
    setUnavailable((current) => new Set(current).add(item.publicId));
    setCurrentMedia((current) =>
      current?.publicId === item.publicId ? undefined : current
    );
  };

  const renderItem = (item: PublicMedia, index: number) => {
    if (unavailable.has(item.publicId)) {
      return (
        <p className="rounded-md bg-muted p-4 text-sm" role="alert">
          Photo unavailable.
        </p>
      );
    }

    return (
      <PublicMediaImage
        media={item}
        alt={`${placeName} view ${index + 1}`}
        onOpen={() => setCurrentMedia(item)}
        onUnavailable={() => markUnavailable(item)}
      />
    );
  };

  if (media.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        No approved photos for this place.
      </p>
    );
  }

  return (
    <>
      <Dialog
        open={currentMedia !== undefined}
        onOpenChange={(open) => {
          if (!open) setCurrentMedia(undefined);
        }}
      >
        <DialogContent className="max-h-[90vh] w-full max-w-4xl">
          <DialogHeader>
            <DialogTitle>{placeName}</DialogTitle>
            <DialogDescription>Approved place photo</DialogDescription>
          </DialogHeader>
          {currentMedia ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentMedia.url}
              width={currentMedia.width}
              height={currentMedia.height}
              className="max-h-[75vh] w-full object-contain"
              alt={`${placeName} enlarged view`}
              onError={() => markUnavailable(currentMedia)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {media.length === 1 ? (
        renderItem(media[0], 0)
      ) : (
        <Carousel aria-label={`${placeName} photos`}>
          <CarouselContent>
            {media.map((item, index) => (
              <CarouselItem className="basis-full" key={item.publicId}>
                {renderItem(item, index)}
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      )}
    </>
  );
}

function DetailStatus({
  title,
  message,
  retry,
}: {
  title: string;
  message: string;
  retry?: () => void;
}) {
  return (
    <Card className="h-fit max-h-fit max-w-xl">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription role={retry ? "alert" : "status"}>
          {message}
        </CardDescription>
      </CardHeader>
      {retry ? (
        <CardFooter>
          <Button type="button" variant="outline" onClick={retry}>
            Retry
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  );
}

export function placeDetailsQueryOptions(placeId: number) {
  return {
    variables: { id: placeId.toString() },
    fetchPolicy: "no-cache" as const,
    nextFetchPolicy: "no-cache" as const,
    notifyOnNetworkStatusChange: true,
    context: { fetchOptions: { cache: "no-store" } },
  };
}

export default function PlaceCard({ place }: Props) {
  const { data, loading, error, refetch } = useGetPlaceByIdQuery(
    placeDetailsQueryOptions(place.place_id)
  );

  clogger.trace({ data: place }, "PlaceCard got object");

  if (loading) {
    return <DetailStatus title={place.name} message="Loading place details…" />;
  }
  if (error || !data?.placeById) {
    return (
      <DetailStatus
        title={place.name}
        message="Place details are unavailable."
        retry={() => void refetch()}
      />
    );
  }

  const detail = data.placeById;

  return (
    <Card className="h-fit max-h-fit max-w-xl">
      <CardHeader>
        <CardTitle>{detail.name}</CardTitle>
        <CardDescription className="mb-3 font-bold text-gray-700 dark:text-gray-400">
          {detail.category.name}
        </CardDescription>
        <CardDescription className="mb-3 font-normal text-gray-700 dark:text-gray-400">
          {detail.description}
        </CardDescription>
        <CardDescription className="mb-3 font-thin italic text-gray-700 dark:text-gray-400">
          {detail.address.properties?.addressString}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <PublicPlaceMedia media={detail.media} placeName={detail.name} />
      </CardContent>
      <CardFooter>
        <a
          href="#"
          className="inline-flex items-center rounded-lg bg-blue-700 px-3 py-2 text-center text-sm font-medium text-white hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
        >
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
            />
          </svg>
        </a>
      </CardFooter>
    </Card>
  );
}
