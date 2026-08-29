import { useCallback, useState } from "react";

import RequestReactForm from "@/app/requests/request-react-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { CategoryType } from "@/graphql/__generated__/types";
import PlaceCard, {
  type SimplePlaceType,
} from "@/components/places/PlaceCard";

const emptyPlace: SimplePlaceType = {
  place_id: -1,
  name: "None",
  category: -1,
  description: "",
  address: "",
  tags: [],
  images: [],
};

export interface PlaceDialogState {
  place: SimplePlaceType;
  open: boolean;
  selectPlace: (place: SimplePlaceType) => void;
  setOpen: (open: boolean) => void;
}

export function usePlaceDialog(): PlaceDialogState {
  const [place, setPlace] = useState<SimplePlaceType>(emptyPlace);
  const [open, setOpen] = useState(false);

  const selectPlace = useCallback((selectedPlace: SimplePlaceType) => {
    setPlace(selectedPlace);
    setOpen(true);
  }, []);

  return { place, open, selectPlace, setOpen };
}

export function PlaceDetailsDialog({ state }: { state: PlaceDialogState }) {
  return (
    <Dialog open={state.open} onOpenChange={state.setOpen}>
      <DialogTrigger />
      <DialogContent className="h-fit">
        <PlaceCard place={state.place} />
        <DialogFooter>
          <Button type="button" onClick={() => state.setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export interface SubmissionLocationState {
  tracking: boolean;
  coordinates: number[];
  setTracking: (tracking: boolean) => void;
  updateCoordinates: (coordinates: number[]) => void;
}

export function useSubmissionLocation(): SubmissionLocationState {
  const [tracking, setTracking] = useState(false);
  const [coordinates, setCoordinates] = useState<number[]>([0, 0]);
  const updateCoordinates = useCallback((nextCoordinates: number[]) => {
    setCoordinates(nextCoordinates);
  }, []);

  return { tracking, coordinates, setTracking, updateCoordinates };
}

export function SubmissionControls({
  categories,
  location,
}: {
  categories: CategoryType[];
  location: SubmissionLocationState;
}) {
  return (
    <RequestReactForm
      categories={categories}
      enableTracking={location.setTracking}
      crosshairPosition={location.coordinates}
    />
  );
}
