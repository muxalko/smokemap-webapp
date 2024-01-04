"use client";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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

import { Tag, TagInput } from "@/components/tag-input";
import { Button } from "@/components/ui/button";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useEffect, useState } from "react";
import { toast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckIcon, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CategoryType,
  CreateRequestMutationVariables,
  InputMaybe,
  RequestInput,
  RequestType,
  useCreateRequestMutation,
} from "@/graphql/__generated__/types";
import { ApolloError } from "@apollo/client";

export const dynamic = "force-dynamic";

const minTagLength = 3;
const maxTagLength = 50;
const maxTagsAmount = 10;

const FormSchema = z.object({
  name: z
    .string()
    .min(2, "Name should be more than one symbol")
    .max(255, "maximum name length is reached"),
  category: z.string().regex(/^-?\d+$/, "Should include digits only"), //.transform(Number),
  addressString: z
    .string()
    .min(5, "Please, check your address")
    .max(255, "maximum address length is reached"),
  description: z
    .string()
    .max(255, "maximum description length is reached")
    .optional(),
  tags: z.array(
    z.object({
      id: z.string(),
      text: z
        .string()
        .min(minTagLength, "minimum tag length is " + minTagLength)
        .max(maxTagLength, "maximum tag length is " + maxTagLength),
    })
  ),
});

export default function RequestReactForm({
  categories,
  updateDataCallback,
}: {
  categories: CategoryType[];
  updateDataCallback?: () => unknown;
}) {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: "",
      category: "-1",
      addressString: "",
      description: "",
      tags: [],
    },
  });

  const [comboopen, setComboOpen] = React.useState(false);
  const [combovalue, setComboValue] = React.useState("");

  const [tags, setTags] = React.useState<Tag[]>([]);

  const { setValue } = form;

  const [submission_error, setSubmissionError] = useState<ApolloError>();
  const [submission_result, setSubmissionResult] = useState<RequestType>();

  const [dialogOpen, setDialogOpen] = useState(false);

  const [createRequest, { data: createRequestResponse, loading, error }] =
    useCreateRequestMutation({
      //   const [createRequest, { data: createRequestResponse, loading, error }] =
      //     useMutation(CREATE_REQUEST, {
      fetchPolicy: "no-cache",
      onError: (error) => {
        console.error("GraphQL Error:", error);
        // display an error message
        setSubmissionError(error);
        // form.setError("name", {
        //   message: error.message,
        // });
        toast({
          title: "Submission result:",
          description: (
            <pre className="mt-2 inline-block rounded-md bg-slate-950 p-4 overflow-auto">
              <p className="text-red-700 w-auto">
                {JSON.stringify(error.message)}
              </p>
            </pre>
          ),
        });
      },
      onCompleted: () => {
        setDialogOpen(false);
        form.clearErrors();
        form.reset({
          name: "",
          category: "-1",
          addressString: "",
          description: "",
          tags: [],
        });
        form.setValue("tags", []);

        toast({
          title: "Submission result:",
          description: (
            <pre className="mt-2 w-auto rounded-md bg-slate-950 p-4">
              <p className="text-green-700">
                Success! created with ID:{" "}
                {createRequestResponse?.createRequest?.request?.id}, Name:{" "}
                {createRequestResponse?.createRequest?.request?.name}, Address:{" "}
                {
                  createRequestResponse?.createRequest?.request?.address
                    .properties?.addressString
                }{" "}
                {
                  createRequestResponse?.createRequest?.request?.address
                    .geometry.coordinates
                }
              </p>
            </pre>
          ),
        });

        if (updateDataCallback && typeof updateDataCallback == "function") {
          updateDataCallback();
        }
      },
      // TODO: doesn't work -> need to check how apollo knows what is observable queries vs active
      //   refetchQueries: [
      //     NOT_APPROVED_REQUESTS_QUERY, // DocumentNode object parsed with gql
      //     "GetAllNotApprovedRequests", // Query name
      //   ],
      // update(cache, { data: { createRequest } }) {
      //   console.log("Update function for createRequest: " + cache)
      //   cache.modify({
      //     fields: {
      //       requests(existingRequests = []) {
      //         const newRequestRef = cache.writeFragment({
      //           data: createRequest,
      //           fragment: gql`
      //             fragment NewRequest on Request {
      //               id
      //               name
      //               address {
      //                 id
      //                 address
      //                 lat
      //                 long
      //               }
      //               description
      //               dateCreated
      //             }
      //           `,
      //         });
      //         return [...existingRequests, newRequestRef];
      //       },
      //     },
      //   });
      // },
    });

  useEffect(() => {
    console.log(
      "createRequestResponse updated: " + JSON.stringify(createRequestResponse)
    );
  }, [createRequestResponse]);

  async function onSubmit(submission: z.infer<typeof FormSchema>) {
    console.log("Form control: ", form.control);
    console.log("Submission: ", submission);
    setSubmissionError(undefined); // Reset the error state before making the mutation
    setSubmissionResult(undefined);

    //map submission to mutation input type
    const inputConverted: RequestInput = {
      addressString: submission.addressString,
      category: submission.category,
      name: submission.name,
      description: submission.description,
      tags: submission.tags as unknown as string[],
    };

    // Override and reformat tags as simple String[] and lowercase them
    inputConverted.tags = submission.tags.map((item) => {
      return item.text.toLowerCase();
    });

    const mutation = {
      input: inputConverted,
    };

    await createRequest({ variables: mutation });
  }

  return (
    <>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">+ SPOT</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create a new request</DialogTitle>
            <DialogDescription>
              This action will create a request for a place to be added to the
              map. Your request will be reviewed and confirmed by an
              administrator in 3-5 days.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2">
            <div className="grid flex-1 gap-2">
              <section className="z-10 max-w-5xl w-full flex flex-col items-center text-center gap-5">
                <div className="w-full py-8" id="try">
                  <div className="w-full relative my-4 flex flex-col space-y-2">
                    <div className="preview flex min-h-[350px] w-full justify-center p-10 items-center mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 relative rounded-md border">
                      <Form {...form}>
                        <form
                          className="space-y-8 flex flex-col items-start"
                          // eslint-disable-next-line @typescript-eslint/no-misused-promises
                          onSubmit={form.handleSubmit(onSubmit)}
                        >
                          <Accordion className="w-full" type="multiple">
                            <AccordionItem value="item-1">
                              <AccordionTrigger>
                                Provide name and select category
                              </AccordionTrigger>
                              <AccordionContent>
                                <FormField
                                  control={form.control}
                                  name="name"
                                  render={({ field }) => (
                                    <FormItem className="flex flex-col items-start">
                                      <FormLabel className="text-left">
                                        Name
                                      </FormLabel>
                                      <FormControl className="w-full">
                                        <Input
                                          placeholder="What is the place name?"
                                          {...field}
                                        />
                                      </FormControl>
                                      {/* <FormDescription className="text-left">
                        Provide a name.
                      </FormDescription> */}
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="category"
                                  render={({ field }) => (
                                    <FormItem className="flex flex-col items-start">
                                      <FormLabel className="text-left">
                                        Category
                                      </FormLabel>
                                      <Popover
                                        onOpenChange={setComboOpen}
                                        open={comboopen}
                                      >
                                        <PopoverTrigger asChild>
                                          <FormControl>
                                            <Button
                                              aria-expanded={comboopen}
                                              className={cn(
                                                "w-[200px] justify-between",
                                                !field.value &&
                                                  "text-muted-foreground"
                                              )}
                                              role="combobox"
                                              variant="outline"
                                            >
                                              {field.value
                                                ? categories.find(
                                                    (item: CategoryType) =>
                                                      item.id === field.value
                                                  )?.name
                                                : "Select category"}
                                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                              {/* <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" /> */}
                                            </Button>
                                          </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[200px] p-0">
                                          <Command>
                                            <CommandInput
                                              className="h-9"
                                              placeholder="Search ..."
                                            />
                                            <CommandEmpty>
                                              No category found.
                                            </CommandEmpty>
                                            <CommandGroup>
                                              {categories.map(
                                                (item: CategoryType) => (
                                                  <CommandItem
                                                    key={item.id}
                                                    onSelect={() => {
                                                      form.setValue(
                                                        "category",
                                                        item.id
                                                      );
                                                      setComboOpen(false);
                                                    }}
                                                    value={item.name}
                                                  >
                                                    {item.name}
                                                    <CheckIcon
                                                      className={cn(
                                                        "ml-auto h-4 w-4",
                                                        item.id === field.value
                                                          ? "opacity-100"
                                                          : "opacity-0"
                                                      )}
                                                    />
                                                  </CommandItem>
                                                )
                                              )}
                                            </CommandGroup>
                                          </Command>
                                        </PopoverContent>
                                      </Popover>
                                      <FormDescription>
                                        Choose what best describes the place
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                {/*                 
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem className="flex flex-col items-start">
                      <FormLabel className="text-left">Category</FormLabel>
                      <FormControl className="w-full">
                        <Input placeholder="" {...field} />
                        <Popover open={comboopen} onOpenChange={setComboOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={comboopen}
                              className="w-[200px] justify-between"
                            >
                              {combovalue
                                ? categories.find(
                                    (category) => category.value === combovalue
                                  )?.label
                                : "Select category..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[200px] p-0">
                            <Command>
                              <CommandInput placeholder="Search ..." />
                              <CommandEmpty>No category found.</CommandEmpty>
                              <CommandGroup>
                                {categories.map((category) => (
                                  <CommandItem
                                    key={category.value}
                                    onSelect={(currentComboValue) => {
                                      setComboValue(
                                        currentComboValue === combovalue
                                          ? ""
                                          : currentComboValue
                                      );
                                      setComboOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        combovalue === category.value
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    {category.label}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </FormControl>
                      <FormDescription className="text-left">
                        Provide a name.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem className="flex flex-col items-start">
                      <FormLabel className="text-left">Category</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select one" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>Classical Lounge</SelectLabel>
                            {categories.map((item) => (
                              <SelectItem value={item.value.toString()}>
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-left">
                        Choose what suits your place the best
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                /> 
                */}
                              </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-2">
                              <AccordionTrigger>
                                Where is it located?
                              </AccordionTrigger>
                              <AccordionContent>
                                <FormField
                                  control={form.control}
                                  name="addressString"
                                  render={({ field }) => (
                                    <FormItem className="flex flex-col items-start">
                                      <FormLabel className="text-left">
                                        Address
                                      </FormLabel>
                                      <FormControl className="w-full">
                                        <Input
                                          className="sm:min-w-[350px]"
                                          placeholder="What is the place address?"
                                          {...field}
                                        />
                                      </FormControl>
                                      {/* <FormDescription className="text-left">
                        Provide a name.
                      </FormDescription> */}
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-3">
                              <AccordionTrigger>
                                What do you know about this place?
                              </AccordionTrigger>
                              <AccordionContent>
                                <FormField
                                  control={form.control}
                                  name="tags"
                                  render={({ field }) => (
                                    <FormItem className="flex flex-col items-start">
                                      <FormLabel className="text-left">
                                        Features
                                      </FormLabel>
                                      <FormControl className="w-full">
                                        <TagInput
                                          {...field}
                                          className="sm:min-w-[300px] sm:max-w-[350px] "
                                          maxLength={maxTagLength}
                                          maxTags={maxTagsAmount}
                                          minLength={minTagLength}
                                          placeholder="Special characters are not allowed"
                                          setTags={(newTags) => {
                                            setTags(newTags);
                                            setValue(
                                              "tags",
                                              newTags as [Tag, ...Tag[]]
                                            );
                                          }}
                                          tags={tags}
                                          textCase={"lowercase"}
                                          validateTag={(tag) => {
                                            const format =
                                              /[`!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~]/;
                                            if (tag.match(format)) {
                                              toast({
                                                title: "Tag is not valid",
                                                description:
                                                  "Please enter a tag without special characters",
                                                variant: "destructive",
                                              });
                                              form.setError("tags", {
                                                message:
                                                  "Tag is not valid, try without special characters",
                                              });
                                              return false;
                                            }
                                            form.clearErrors("tags");
                                            // form.setError("tags", { message: "" });
                                            return true;
                                          }}
                                        />
                                      </FormControl>
                                      <FormDescription className="text-left">
                                        {/* {tags && (
                          <p className="text-blue-700">
                            {JSON.stringify(tags)}
                          </p>
                        )}
                        <br /> */}
                                        Enter up to {maxTagsAmount} features for
                                        the place you are adding.
                                        <br />
                                        Use enter or comma to separate each
                                        feature.
                                        <br />
                                        For example: has smoking area, live
                                        music, crowded on weekends
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="description"
                                  render={({ field }) => (
                                    <FormItem className="flex flex-col items-start">
                                      <FormLabel className="text-left">
                                        Description
                                      </FormLabel>
                                      <FormControl className="w-full">
                                        <Textarea
                                          className="sm:min-w-[350px]"
                                          placeholder="..."
                                          {...field}
                                        />
                                      </FormControl>
                                      <FormDescription>
                                        Drop few words if you would like to.
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                          {/* {form && <pre className="text-left text-red-800">{JSON.stringify(form, null, 4)}</pre>} */}

                          <Button
                            className="bg-indigo-500"
                            // disabled={!form.formState.isValid}
                            type="submit"
                            variant={"default"}
                          >
                            {!loading && <p>Submit</p>}

                            {loading && (
                              <>
                                <svg
                                  className="motion-reduce:hidden animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                  ></circle>
                                  <path
                                    className="opacity-75"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    fill="currentColor"
                                  ></path>
                                </svg>
                                <p>Processing...</p>
                              </>
                            )}
                          </Button>

                          {submission_result && (
                            <>
                              <p className="text-green-700">
                                Success! Place created with ID:{" "}
                                {submission_result.id}, Name:{" "}
                                {submission_result.name}, Address:{" "}
                                {
                                  submission_result.address.properties
                                    ?.addressString
                                }{" "}
                                {submission_result.address.geometry.coordinates}
                              </p>
                            </>
                          )}
                          {submission_error ? (
                            <p className="text-red-700">
                              Oh no! {submission_error.message}
                            </p>
                          ) : null}
                          {createRequestResponse &&
                          createRequestResponse.createRequest ? (
                            <p className="text-green-700">Saved!</p>
                          ) : null}
                        </form>
                      </Form>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
          <DialogFooter className="sm:justify-start">
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
