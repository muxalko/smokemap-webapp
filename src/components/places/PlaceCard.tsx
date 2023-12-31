import Image from "next/image";
import type { User } from "next-auth";
import { PlaceType } from "@/graphql/__generated__/types";

export type SimplePlaceType = {
  name: string;
  category: number;
  description: string;
  address: string;
  tags: string[];
};

type Props = {
  place: SimplePlaceType;
};

export default function PlaceCard({ place }: Props) {
  console.log("PlaceCard: okace=" + JSON.stringify(place));

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

  return (
    <div className="card lg:card-side bg-base-100 shadow-xl">
      <figure>
        <img src="/vercel.svg" alt={place?.name} />
      </figure>
      <div className="card-body">
        <h2 className="card-title">{place?.name}</h2>
        <div className="flex flex-col items-center p-6 bg-white rounded-lg font-bold text-5xl text-black">
          {place?.address}
        </div>
        <p>{place?.description}</p>
        <p>{place?.category}</p>
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
