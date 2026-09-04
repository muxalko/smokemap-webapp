"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm, type DefaultValues } from "react-hook-form";

import { TagInput, type Tag } from "@/components/tag-input";
import { Button } from "@/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { CategoryType } from "@/graphql/__generated__/types";
import {
  M3SubmissionSchema,
  type ValidatedM3SubmissionInput,
} from "./m3-schema";
import { ResumeMediaGrid } from "./resume-media-grid";
import { describeFailure } from "./submission-messages";
import { useSubmission } from "./submission-provider";

const emptyValues: DefaultValues<ValidatedM3SubmissionInput> = {
  name: "",
  categorySlug: "other",
  longitude: 0,
  latitude: 0,
  addressLabel: "",
  tags: [],
  description: "",
  website: "",
};

export function ResumeDraftDialog({
  categories,
}: {
  categories: CategoryType[];
}) {
  const {
    resumeStatus,
    restored,
    resumeAction,
    resumeActive,
    editRestored,
    replaceRestoredMedia,
    retryRestoredMedia,
    removeRestoredMedia,
    reorderRestoredMedia,
    finalizeRestored,
    discardRestored,
    dismissResumeAction,
  } = useSubmission();

  const [open, setOpen] = useState(false);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);

  const form = useForm<ValidatedM3SubmissionInput>({
    resolver: zodResolver(M3SubmissionSchema),
    mode: "onChange",
    defaultValues: emptyValues,
  });

  useEffect(() => {
    if (!restored) return;
    form.reset(restored.input);
    setTags(restored.input.tags.map((text) => ({ id: text, text })));
    // Keyed on `restored.input` (stable across media-only updates, replaced
    // only on initial load or a successful save) so this does not clobber
    // in-progress edits every time an unrelated media action re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restored?.input, form]);

  useEffect(() => {
    if (!open) setConfirmingDiscard(false);
  }, [open]);

  if (resumeStatus === "loading") {
    return (
      <p
        aria-live="polite"
        className="absolute left-3 top-5 z-30 rounded-md border bg-background px-3 py-2 text-xs text-muted-foreground shadow"
        role="status"
      >
        Checking for a saved draft…
      </p>
    );
  }

  if (resumeStatus !== "ready" || !restored) return null;

  const isDraft = restored.submissionState === "draft";
  const readyToFinalize =
    isDraft &&
    restored.activeIntents.length === 0 &&
    restored.blockedIntents.length === 0 &&
    !resumeActive;
  const finalizeBlockedReason = !isDraft
    ? undefined
    : restored.activeIntents.length > 0
    ? "Resolve the interrupted photo uploads below before finalizing."
    : restored.blockedIntents.length > 0
    ? // A replacement photo can be added right away, but finalizing stays
      // blocked until the failed upload finishes clearing on the server -
      // that does not happen the moment a replacement is added, so this
      // must not promise finalizing unlocks as soon as you add one.
      "A failed photo upload is still clearing on our end. You can add a replacement below; finalizing will unlock once that finishes."
    : undefined;

  function onSave(values: ValidatedM3SubmissionInput) {
    if (!restored) return;
    editRestored({
      ...values,
      longitude: restored.input.longitude,
      latitude: restored.input.latitude,
    });
  }

  function closeAndDiscard() {
    discardRestored();
    setOpen(false);
  }

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button className="absolute left-3 top-5 z-30" variant="outline">
          {isDraft ? "Resume draft" : "Submission pending review"}
        </Button>
      </DialogTrigger>
      <DialogContent className="no-scrollbar max-h-[80dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isDraft ? "Resume your draft" : "Submission pending review"}
          </DialogTitle>
          <DialogDescription>
            {isDraft
              ? "Pick up where you left off. Each change below saves on its own."
              : "This submission was already finalized and is waiting for review. Nothing further is needed here."}
          </DialogDescription>
        </DialogHeader>

        {resumeAction.phase === "failed" ? (
          <div
            aria-live="polite"
            className="rounded-md border border-red-500 p-2 text-sm text-red-700"
            role="alert"
          >
            <p>{describeFailure(resumeAction.failure?.code)}</p>
            <Button
              className="mt-2"
              onClick={dismissResumeAction}
              size="sm"
              type="button"
              variant="outline"
            >
              Dismiss
            </Button>
          </div>
        ) : null}

        {isDraft ? (
          <>
            <Form {...form}>
              <form
                className="space-y-4"
                id="resume-draft-form"
                // eslint-disable-next-line @typescript-eslint/no-misused-promises
                onSubmit={form.handleSubmit(onSave)}
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
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.slug} value={category.slug}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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

                <p className="text-sm text-muted-foreground">
                  Location: {restored.input.latitude.toFixed(5)},{" "}
                  {restored.input.longitude.toFixed(5)}. Discard this draft and
                  start again to change the location.
                </p>

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
                        <Input placeholder="https://www.smokemap.org" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  disabled={resumeActive || !form.formState.isValid}
                  type="submit"
                >
                  {resumeAction.phase === "editing" ? "Saving…" : "Save changes"}
                </Button>
              </form>
            </Form>

            <ResumeMediaGrid
              activeIntents={restored.activeIntents}
              attachments={restored.attachments}
              blockedIntents={restored.blockedIntents}
              disabled={resumeActive}
              onRemove={removeRestoredMedia}
              onReorder={reorderRestoredMedia}
              onReplace={replaceRestoredMedia}
              onRetry={retryRestoredMedia}
              resumeAction={resumeAction}
            />

            <DialogFooter className="items-center gap-2 border-t pt-4 sm:justify-between">
              {confirmingDiscard ? (
                <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    Discard this draft? This cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setConfirmingDiscard(false)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Keep draft
                    </Button>
                    <Button
                      onClick={closeAndDiscard}
                      size="sm"
                      type="button"
                      variant="destructive"
                    >
                      Discard draft
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <Button
                    disabled={resumeActive}
                    onClick={() => setConfirmingDiscard(true)}
                    type="button"
                    variant="outline"
                  >
                    Discard draft
                  </Button>
                  <Button
                    disabled={!readyToFinalize}
                    onClick={finalizeRestored}
                    title={finalizeBlockedReason}
                    type="button"
                  >
                    {resumeAction.phase === "finalizing"
                      ? "Finalizing…"
                      : "Finalize for review"}
                  </Button>
                </>
              )}
            </DialogFooter>
          </>
        ) : (
          <div className="space-y-4">
            <p className="text-sm">
              <strong>{restored.input.name}</strong> is waiting for review. You
              can safely close this — nothing will be lost.
            </p>
            <DialogFooter>
              <DialogClose asChild>
                <Button onClick={closeAndDiscard} type="button">
                  Got it
                </Button>
              </DialogClose>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
