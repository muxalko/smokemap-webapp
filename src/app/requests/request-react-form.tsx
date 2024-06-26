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
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
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
  RequestInput,
  RequestType,
  useCreateImageMutation,
  useCreateRequestMutation,
} from "@/graphql/__generated__/types";
import { ApolloError } from "@apollo/client";
import UploadComponent from "@/components/upload/upload-component";
import { getS3PresignedUrl } from "../actions";
import { FileWithPath } from "react-dropzone";

import { randomBytes } from "crypto";
import path from "path";
import { Checkbox } from "@/components/ui/checkbox";
import { omit } from "lodash";
import logger from "redux-logger";
import clogger from "@/lib/clogger";
export const dynamic = "force-dynamic";

const MIN_TAG_LENGTH = 3;
const MAX_TAG_LENGTH = 50;
const MAX_TAGS_AMOUNT = 10;
const MAX_IMAGES_TO_UPLOAD = 3;
const MAX_FILE_SIZE = 5000000;
const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

// form validation schema
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
  consent: z.literal<boolean>(true, {
    errorMap: () => ({
      message:
        "Please, check the aggreement. You must agree to the terms in order form to be processed.",
    }),
  }),
  tags: z.array(
    z.object({
      id: z.string(),
      text: z
        .string()
        .min(MIN_TAG_LENGTH, "minimum tag length is " + MIN_TAG_LENGTH)
        .max(MAX_TAG_LENGTH, "maximum tag length is " + MAX_TAG_LENGTH),
    })
  ),
  images: z
    .any()
    .optional()
    // To not allow empty files
    .refine((files) => files?.length >= 1, { message: "Image is required." })
    // To not allow files other than images
    .refine((files) => ACCEPTED_IMAGE_TYPES.includes(files?.[0]?.type), {
      message: ".jpg, .jpeg, .png and .webp files are accepted.",
    })
    // To not allow files larger than 5MB
    .refine((files) => files?.[0]?.size <= MAX_FILE_SIZE, {
      message: `Max file size is 5MB.`,
    }),
});

export default function RequestReactForm({
  categories,
  updateDataCallback,
  enableTracking,
  crosshairPosition,
}: {
  categories: CategoryType[];
  updateDataCallback?: () => unknown;
  enableTracking: (value: boolean) => void;
  crosshairPosition: Array<number>;
}) {
  // default form values
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: "",
      category: "-1",
      addressString: "",
      description: "",
      consent: false,
      tags: [],
      images: [],
    },
  });

  const [comboopen, setComboOpen] = React.useState(false);
  const [combovalue, setComboValue] = React.useState("");

  const [tags, setTags] = React.useState<Tag[]>([]);

  const { setValue } = form;

  const [submission_error, setSubmissionError] = useState<ApolloError>();
  const [submission_result, setSubmissionResult] = useState<RequestType>();

  // main form dialog open/close control
  const [dialogOpen, setDialogOpen] = useState(false);
  // const [drawerOpen, setDrawerOpen] = useState(false);

  // when address is unknown (user pressed track with crosshair button )
  // we will pass geolocation [lng,lat] in form.addressString
  const [noAddressMode, setNoAddressMode] = useState(false);
  useEffect(() => {
    if (noAddressMode)
      form.setValue(
        "addressString",
        `[${crosshairPosition.at(0)},${crosshairPosition.at(1)}]`
      );
  }, [crosshairPosition]);

  const clearFormData = () => {
    //console.log("--- Clearing form data ---");
    setDialogOpen(false);
    form.clearErrors();
    form.reset({
      name: "",
      category: "-1",
      addressString: "",
      description: "",
      consent: false,
      tags: [],
      images: [],
    });

    form.setValue("tags", []);
    form.setValue("images", []);

    toast({
      title: "Submission result:",
      description: (
        <pre className="mt-2 w-auto rounded-md bg-slate-950 p-4">
          <p className="text-green-700">
            Success! created with ID:{" "}
            {createRequestResponse?.createRequest?.request?.id}, Name:{" "}
            {createRequestResponse?.createRequest?.request?.name}, Address:{" "}
            {
              createRequestResponse?.createRequest?.request?.address.properties
                ?.addressString
            }{" "}
            {
              createRequestResponse?.createRequest?.request?.address.geometry
                .coordinates
            }
          </p>
        </pre>
      ),
    });

    if (updateDataCallback && typeof updateDataCallback == "function") {
      updateDataCallback();
    }
  };

  const postCreateRequest = (newRequest: RequestType) => {
    //console.log("--- Show submission results ---");

    toast({
      title: "Submission result:",
      description: (
        <pre className="mt-2 w-auto rounded-md bg-slate-950 p-4">
          <p className="text-wrap text-green-700">
            Success! created with ID: {newRequest?.id}, Name: {newRequest?.name}
            , Address: {newRequest?.address.properties?.addressString}
            {"["}
            {(newRequest?.address.geometry.coordinates as Array<number>).at(0)},
            {(newRequest?.address.geometry.coordinates as Array<number>).at(1)}
            {"]"}
          </p>
        </pre>
      ),
    });

    if (updateDataCallback && typeof updateDataCallback == "function") {
      updateDataCallback();
    }
  };

  const [createImage] = useCreateImageMutation({
    fetchPolicy: "no-cache",
    onError: (error) => {
      clogger.error("GraphQL Error:", error);
      // display an error message
      toast({
        title: "Image upload error:",
        description: (
          <pre className="mt-2 inline-block overflow-auto rounded-md bg-slate-950 p-4">
            <p className="w-auto text-red-700">
              {JSON.stringify(error.message)}
            </p>
          </pre>
        ),
      });
    },
    onCompleted: (data) => {
      //console.log("CreateImage response:", data);
    },
  });

  const [
    createRequest,
    {
      data: createRequestResponse,
      loading: loading_createRequest,
      error: error_createRequest,
    },
  ] = useCreateRequestMutation({
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
          <pre className="mt-2 inline-block overflow-auto rounded-md bg-slate-950 p-4">
            <p className="w-auto text-red-700">
              {JSON.stringify(error.message)}
            </p>
          </pre>
        ),
      });
    },
    onCompleted: (createRequestResponse_data) => {
      //console.log(
      //   "Update backend images with created request ",
      //   JSON.stringify(createRequestResponse_data)
      // );
      // count files to upload
      let files2upload = (form.getValues("images") as FileWithPath[]).length;
      const filesCount = files2upload;
      /*
      // V1: Each file upload uses new s3 url
      // iterate over each file and get temporary S3 URL for uploading an image
      (form.getValues("images") as File[]).forEach((file) => {
        const s3Post = getS3PresignedUrl().then((response) => {
          //console.log("getS3PresignedUrl() response:", response);
          //build formData
          const token = response.data.s3PresignedUrl;
          const formUpload = new FormData();
          Object.keys(token.fields).forEach((k) => {
            const v = token.fields[k];
            formUpload.append(k, v);
          });

          formUpload.append("file", file);

          const uploadStatus = fetch(token.url as string, {
            method: "POST",
            body: formUpload,
          }).then((data) => {
            //console.log("upload response data:", data);
            return data;
          });

          //console.log("uploadStatus: ", uploadStatus);
          return uploadStatus;
        }); // getS3PresignedUrl promise
      }); // forEach file
      */

      // V2: Each file upload uses same s3 url
      const uploadStatus = getS3PresignedUrl().then((response) => {
        clogger.debug(response, "getS3PresignedUrl() response");
        //build formData
        const token = response.data.s3PresignedUrl;
        const formUpload = new FormData();
        Object.keys(token.fields).forEach((k) => {
          const v = token.fields[k];
          formUpload.append(k, v);
        });

        // iterate over each file and get temporary S3 URL for uploading an image
        (form.getValues("images") as FileWithPath[]).forEach((file) => {
          clogger.debug({ current: file }, "processing image");
          // replace target filename with our own
          const extention = path.extname(file.name);
          const filename = randomBytes(16).toString("hex") + extention;
          formUpload.set("file", file, filename);
          formUpload.set("Content-Type", file.type);
          clogger.debug({ data: formUpload }, "formUpload");
          // S3 upload
          const s3Post = fetch(token.url as string, {
            method: "POST",
            // headers: {
            //   "Content-Type": "multipart/form-data",
            // },
            body: formUpload,
          }).then((data) => {
            const message = data
              .text()
              .then((res) =>
                clogger.debug({ message: res }, "S3 upload response")
              );
            const newRequest = createRequestResponse_data?.createRequest
              ?.request as RequestType;
            if (files2upload >= 1) {
              const mutation = {
                input: {
                  requestId: newRequest?.id,
                  name: newRequest.name + "_" + (filesCount - files2upload),
                  url:
                    data.url + token.fields.key.split("/")[0] + "/" + filename,
                  metadata: JSON.stringify(file),
                },
              };

              createImage({ variables: mutation })
                .then((res) => {
                  return res;
                })
                .catch((err) => clogger.error(err, "S3 Images Upload failed"));

              files2upload -= 1;
            }

            // detect last iteration
            if (files2upload <= 0) {
              //console.log("Uploaded all images");
              clearFormData();
              postCreateRequest(newRequest);
            }

            return data;
          });
        }); // forEach file

        return response;
      }); // getS3PresignedUrl promise
    },

    // TODO: doesn't work -> need to check how apollo knows what is observable queries vs active
    //   refetchQueries: [
    //     NOT_APPROVED_REQUESTS_QUERY, // DocumentNode object parsed with gql
    //     "GetAllNotApprovedRequests", // Query name
    //   ],
    // update(cache, { data: { createRequest } }) {
    //   //console.log("Update function for createRequest: " + cache)
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

  // useEffect(() => {
  //   if (createRequestResponse != undefined) {
  //     console.log(
  //       "createRequestResponse updated: " +
  //         JSON.stringify(createRequestResponse)
  //     );
  //   }
  // }, [createRequestResponse]);

  async function onSubmit(submission: z.infer<typeof FormSchema>) {
    //console.log("Form control: ", form.control);
    //console.log("Submission: ", submission);
    setSubmissionError(undefined); // Reset the error state before making the mutation
    setSubmissionResult(undefined);

    //map submission to mutation input type
    const inputConverted: RequestInput = {
      addressString: submission.addressString,
      category: submission.category,
      name: submission.name,
      description: submission.description,
      // TODO: send consent to server + user + IP
      tags: submission.tags as unknown as string[],
      // instead of uploading images to our backend, we will upload directly to s3
      // images: submission.images as File[],
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
      {/* {crosshairPosition && (
        <div className="absolute left-1/2 top-1/2 z-10 text-xl">
          [{crosshairPosition.at(0)},{crosshairPosition.at(1)}]
        </div>
      )} */}
      {noAddressMode && (
        <Button
          type="button"
          variant="ghost"
          className="absolute left-1/2 top-1/2 z-10 -translate-x-[16px] -translate-y-[27px] hover:bg-transparent  hover:text-red-600"
          onClick={() => {
            enableTracking(false);
            setNoAddressMode(false);
            setDialogOpen(true);
          }}
          // className={`"translate-x-[${centroid.x}] translate-y-[${centroid.y}] scale-[${scale}]"`}
        >
          +
        </Button>
      )}
      {/* 
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerTrigger asChild>
          <Button
            variant="outline"
            className="absolute left-5 top-10 z-40 text-2xl"
          >
            +
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Create a new request</DrawerTitle>
            <DrawerDescription>
              This action will create a request for a place to be added to the
              map. Your request will be reviewed and confirmed by an
              administrator in 3-5 days.
            </DrawerDescription>
          </DrawerHeader>

          <DrawerFooter>
            <Button>Submit</Button>
            <DrawerClose>
              <Button>Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer> */}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="absolute right-3 top-5 z-30 text-2xl"
          >
            +
          </Button>
        </DialogTrigger>
        <DialogContent className="no-scrollbar h-dvh max-h-[70%] overflow-y-scroll sm:max-w-md">
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
              <section className="z-10 flex w-full max-w-5xl flex-col items-center gap-5 text-center">
                <div className="w-full py-0" id="try">
                  <div className="relative my-0 flex w-full flex-col space-y-2">
                    <div className="relative mt-2 flex min-h-[350px] w-full items-center justify-center rounded-md p-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                      <Form {...form}>
                        <form
                          className="flex flex-col items-start space-y-8"
                          // eslint-disable-next-line @typescript-eslint/no-misused-promises
                          //onSubmit={form.handleSubmit(onSubmit)}
                        >
                          <Accordion className="w-full px-2" type="multiple">
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
                                          className="block w-full"
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
                                      <FormDescription>
                                        Choose what best describes the place
                                      </FormDescription>
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
                                          className="block w-full"
                                          placeholder="What is the place address?"
                                          {...field}
                                        />
                                      </FormControl>
                                      <FormDescription className="text-left">
                                        If you do not know the address
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          onClick={() => {
                                            enableTracking(true);
                                            setNoAddressMode(true);
                                            setDialogOpen(false);
                                          }}
                                        >
                                          Show on the map
                                        </Button>
                                      </FormDescription>
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
                                          className="block w-full"
                                          // className="sm:min-w-[300px] sm:max-w-[350px] "
                                          maxLength={MAX_TAG_LENGTH}
                                          maxTags={MAX_TAGS_AMOUNT}
                                          minLength={MIN_TAG_LENGTH}
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
                                        Enter up to {MAX_TAGS_AMOUNT} features
                                        for the place you are adding.
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
                                  name="images"
                                  render={({ field }) => (
                                    <FormItem className="flex flex-col items-start">
                                      <FormLabel className="py-2 text-left">
                                        Images
                                      </FormLabel>
                                      <FormControl className="w-full">
                                        <UploadComponent
                                          setCallbackHandler={(
                                            uploadedFiles: FileWithPath[]
                                          ) =>
                                            form.setValue(
                                              "images",
                                              uploadedFiles
                                            )
                                          }
                                        />
                                      </FormControl>
                                      <FormDescription className="text-left">
                                        Upload up to {MAX_IMAGES_TO_UPLOAD}{" "}
                                        images for the place you are adding.
                                        <br />
                                        Only *.jpg or *.png format is accepted.
                                        Up to 2MB per file.
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
                                      <FormLabel className="py-2 text-left">
                                        Description
                                      </FormLabel>
                                      <FormControl className="w-full">
                                        <Textarea
                                          className="block w-full"
                                          // className="sm:min-w-[350px]"
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
                          <FormField
                            control={form.control}
                            name="consent"
                            render={({ field }) => (
                              <FormItem className="flex flex-col items-start">
                                <FormLabel className="py-2 text-left">
                                  I have read the{" "}
                                  <a
                                    className="text-blue-950 hover:underline"
                                    data-what="privacy"
                                    href="/privacy"
                                    target="_blank"
                                  >
                                    privacy policy
                                  </a>{" "}
                                  and agree to the storage of my form data.
                                </FormLabel>
                                <FormControl className="w-full">
                                  <div className="items-top flex space-x-2">
                                    <Checkbox
                                      id="terms1"
                                      // {...omit(field, "value")}
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                      // value="true"
                                      // onCheckedChange={(checked: boolean) => {
                                      //   //console.log(checked);
                                      //   form.setValue("consent", checked);
                                      //   return checked;
                                      // }}
                                    />
                                    <div className="grid gap-1.5 leading-none">
                                      <label
                                        htmlFor="terms1"
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                      >
                                        Accept terms and conditions
                                      </label>
                                    </div>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          {/* {form && (
                            <pre className="text-left text-red-800">
                              {JSON.stringify(form, null, 4)}
                            </pre>
                          )} */}

                          {submission_result && (
                            <>
                              <p className="text-green-700">
                                Success! Request ID: {submission_result.id},
                                Name: {submission_result.name}, Address:{" "}
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
          <DialogFooter className="sm:flex-row-reverse sm:justify-center">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Close
              </Button>
            </DialogClose>
            <Button
              type="button"
              onClick={() => {
                form.reset();
              }}
              variant="secondary"
            >
              Reset
            </Button>
            <Button
              disabled={!form.formState.isValid}
              type="button"
              // eslint-disable-next-line @typescript-eslint/no-misused-promises
              onClick={form.handleSubmit(onSubmit)}
              variant={"default"}
            >
              {!loading_createRequest && <p>Submit</p>}

              {loading_createRequest && (
                <>
                  <svg
                    className="-ml-1 mr-3 h-5 w-5 animate-spin text-white motion-reduce:hidden"
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
