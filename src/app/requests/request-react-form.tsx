"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckIcon, ChevronsUpDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm, type DefaultValues } from "react-hook-form";

import { TagInput, type Tag } from "@/components/tag-input";
import UploadComponent from "@/components/upload/upload-component";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import type { CategoryType } from "@/graphql/__generated__/types";
import { cn } from "@/lib/utils";
import {
  M3FormSchema,
  type ValidatedM3FormInput,
} from "@/app/submissions/m3-schema";
import { useSubmission } from "@/app/submissions/submission-provider";

const emptyForm: DefaultValues<ValidatedM3FormInput> = {
  name: "",
  longitude: Number.NaN,
  latitude: Number.NaN,
  addressLabel: "",
  tags: [],
  description: "",
  website: "",
  consent: false,
};

export default function RequestReactForm({
  authenticated,
  categories,
  updateDataCallback,
  enableTracking,
  crosshairPosition,
}: {
  authenticated: boolean;
  categories: CategoryType[];
  updateDataCallback?: () => unknown;
  enableTracking: (value: boolean) => void;
  crosshairPosition: number[];
}) {
  const form = useForm<ValidatedM3FormInput>({
    resolver: zodResolver(M3FormSchema),
    mode: "onChange",
    defaultValues: emptyForm,
  });
  const { active, progress, submit } = useSubmission();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [choosingLocation, setChoosingLocation] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const completedSubmissionRef = useRef<string>();

  useEffect(() => {
    if (
      progress.phase !== "pending" ||
      completedSubmissionRef.current === progress.submissionId
    ) {
      return;
    }
    completedSubmissionRef.current = progress.submissionId;
    setDialogOpen(false);
    setTags([]);
    setImages([]);
    form.reset(emptyForm);
    updateDataCallback?.();
  }, [form, progress, updateDataCallback]);

  function confirmLocation() {
    const [longitude, latitude] = crosshairPosition;
    form.setValue("longitude", longitude, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    form.setValue("latitude", latitude, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    enableTracking(false);
    setChoosingLocation(false);
    setDialogOpen(true);
  }

  function onSubmit(values: ValidatedM3FormInput) {
    const { consent: _consent, ...input } = values;
    submit(input, images);
  }

  if (!authenticated) {
    return (
      <Button asChild className="absolute right-3 top-5 z-30" variant="outline">
        <a href="/api/auth/signin?callbackUrl=%2F">Sign in to submit</a>
      </Button>
    );
  }

  return (
    <>
      {choosingLocation ? (
        <Button
          aria-label="Confirm submission location"
          className="absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 text-2xl"
          onClick={confirmLocation}
          type="button"
        >
          +
        </Button>
      ) : null}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button
            className="absolute right-3 top-5 z-30 text-2xl"
            disabled={active}
            variant="outline"
          >
            +
          </Button>
        </DialogTrigger>
        <DialogContent className="no-scrollbar max-h-[80dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Submit a place</DialogTitle>
            <DialogDescription>
              Your private submission will enter review after it is finalized.
              You may attach up to 3 photos (JPEG, PNG, or WebP; 5 MB max each).
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form
              className="space-y-5"
              id="m3-submission-form"
              // eslint-disable-next-line @typescript-eslint/no-misused-promises
              onSubmit={form.handleSubmit(onSubmit)}
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Place name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="categorySlug"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Category</FormLabel>
                    <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            aria-expanded={categoryOpen}
                            className={cn(
                              "w-full justify-between",
                              !field.value && "text-muted-foreground"
                            )}
                            role="combobox"
                            type="button"
                            variant="outline"
                          >
                            {categories.find(
                              (category) => category.slug === field.value
                            )?.name ?? "Select category"}
                            <ChevronsUpDown className="h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                        <Command>
                          <CommandInput placeholder="Search categories" />
                          <CommandEmpty>No category found.</CommandEmpty>
                          <CommandGroup>
                            {categories.map((category) => (
                              <CommandItem
                                key={category.slug}
                                onSelect={() => {
                                  form.setValue(
                                    "categorySlug",
                                    category.slug as ValidatedM3FormInput["categorySlug"],
                                    {
                                      shouldDirty: true,
                                      shouldTouch: true,
                                      shouldValidate: true,
                                    }
                                  );
                                  setCategoryOpen(false);
                                }}
                                value={category.name}
                              >
                                {category.name}
                                <CheckIcon
                                  className={cn(
                                    "ml-auto h-4 w-4",
                                    category.slug === field.value
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="addressLabel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address label (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Human-readable address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <Button
                  onClick={() => {
                    enableTracking(true);
                    setChoosingLocation(true);
                    setDialogOpen(false);
                  }}
                  type="button"
                  variant="outline"
                >
                  Choose location on map
                </Button>
                {Number.isFinite(form.watch("longitude")) &&
                Number.isFinite(form.watch("latitude")) ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Selected: {form.watch("longitude").toFixed(5)},{" "}
                    {form.watch("latitude").toFixed(5)}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-red-700">
                    A confirmed map location is required.
                  </p>
                )}
              </div>

              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Features (optional)</FormLabel>
                    <FormControl>
                      <TagInput
                        {...field}
                        maxLength={50}
                        maxTags={10}
                        minLength={3}
                        placeholder="Press enter or comma after each tag"
                        setTags={(nextTagsOrUpdater) => {
                          const nextTags =
                            typeof nextTagsOrUpdater === "function"
                              ? nextTagsOrUpdater(tags)
                              : nextTagsOrUpdater;
                          setTags(nextTags);
                          form.setValue(
                            "tags",
                            nextTags.map((tag) => tag.text),
                            {
                              shouldDirty: true,
                              shouldTouch: true,
                              shouldValidate: true,
                            }
                          );
                        }}
                        tags={tags}
                      />
                    </FormControl>
                    <FormDescription>Up to 10 distinct tags.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="What should reviewers know?"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website (optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://www.smokemap.org"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <p className="text-sm font-medium leading-none">
                  Photos (optional)
                </p>
                <UploadComponent setCallbackHandler={setImages} />
              </div>

              <FormField
                control={form.control}
                name="consent"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-start gap-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          id="submission-consent"
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel htmlFor="submission-consent">
                        I agree to the storage of this form data under the{" "}
                        <a
                          className="underline"
                          href="/privacy"
                          target="_blank"
                        >
                          privacy policy
                        </a>
                        .
                      </FormLabel>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>

          <DialogFooter>
            <DialogClose asChild>
              <Button disabled={active} type="button" variant="outline">
                Close
              </Button>
            </DialogClose>
            <Button
              disabled={active || !form.formState.isValid}
              form="m3-submission-form"
              type="submit"
            >
              {active ? "Processing…" : "Submit for review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
