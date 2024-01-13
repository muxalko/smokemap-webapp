"use client";
import {
  ImageType,
  PlaceType,
  useGetPlaceByIdQuery,
} from "@/graphql/__generated__/types";
import { GET_PLACE_BY_ID } from "@/graphql/queries/request";
import { useQuery } from "@apollo/client";
import Image from "next/image";

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

  const placeNameDisplay = place?.name ? (
    <div className="flex flex-col items-center p-6 bg-white rounded-lg font-bold text-5xl text-black">
      Place name: {place?.name}!
    </div>
  ) : null;

  const placeCategoryDisplay = place?.category ? (
    <div className="flex flex-col items-center p-6 bg-white rounded-lg font-bold text-5xl text-black">
      {place?.category}
    </div>
  ) : null;

  const placeAddressDisplay = place?.address ? (
    <div className="flex flex-col items-center p-6 bg-white rounded-lg font-bold text-5xl text-black">
      {place?.address}
    </div>
  ) : null;

  const placeDescriptionDisplay = place?.description ? (
    <>
      {" "}
      <Image
        alt={place?.name ?? "Place image"}
        className="border-4 border-black dark:border-slate-500 drop-shadow-xl shadow-black rounded-full mx-auto mt-8"
        height={200}
        priority={true}
        src={"/vercel.svg"}
        width={200}
      />
      <p className="text-2xl text-center">Description: {place?.description}</p>
    </>
  ) : null;

  if (loading) return "Loading...";
  if (error) return `Error! ${error.message}`;

  return (
    <div className="card lg:card-side bg-base-100 shadow-xl">
      <div className="card-body overflow-y-scroll max-h-screen">
        <div className="flex flex-col items-center p-5 bg-white rounded-lg font-bold text-2xl text-black">
          {data?.placeById?.category?.name}
        </div>
        <h2 className="card-title font-bold text-2xl">
          {data?.placeById?.name}
        </h2>

        <figure>
          {data?.placeById?.imageSet &&
            data?.placeById?.imageSet.map((image: ImageType) => {
              return (
                <Image
                  key={image.id}
                  src={image.url}
                  width={500}
                  height={500}
                  alt={image.name}
                />
              );
            })}
        </figure>
        <p>{data?.placeById?.description}</p>
        <p>{data?.placeById?.address?.properties?.addressString}</p>
        <div className="card-actions justify-end">
          <button className="btn btn-primary">Close</button>
        </div>
      </div>
    </div>

    // <section className="flex flex-col gap-4">
    //   <p className="text-2xl text-center">Category: {placeCategoryDisplay}</p>

    //   {placeNameDisplay}
    //   <p className="text-2xl text-center">Address: {placeAddressDisplay}</p>

    //   {placeDescriptionDisplay}
    // </section>
  );
}
