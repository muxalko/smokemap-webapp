import type { RequestType } from "@/graphql/__generated__/types";
import { completeWithoutImages } from "./submission-completion";

it("completes a successful zero-image submission without starting uploads", () => {
  const request = { id: "42", name: "Zero image place" } as RequestType;
  const complete = jest.fn();
  expect(completeWithoutImages([], request, complete)).toBe(true);
  expect(complete).toHaveBeenCalledWith(request);
});

it("leaves image submissions for the upload path", () => {
  const request = { id: "42" } as RequestType;
  const complete = jest.fn();
  const image = new File(["image"], "place.png", { type: "image/png" });
  expect(completeWithoutImages([image], request, complete)).toBe(false);
  expect(complete).not.toHaveBeenCalled();
});
