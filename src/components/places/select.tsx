"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "@/components/ui/use-toast";
import { CategoryType } from "@/graphql/__generated__/types";

// const items = [
//   {
//     id: "recents",
//     label: "Recents",
//   },
//   {
//     id: "home",
//     label: "Home",
//   },
//   {
//     id: "applications",
//     label: "Applications",
//   },
//   {
//     id: "desktop",
//     label: "Desktop",
//   },
//   {
//     id: "downloads",
//     label: "Downloads",
//   },
//   {
//     id: "documents",
//     label: "Documents",
//   },
// ] as const;

const CategorySelectorSchema = z.object({
  items: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "You have to select at least one item.",
  }),
});

export function CategorySelection({
  categories,
}: {
  categories: CategoryType[];
}) {
  //   console.log("CategorySelection:", categories);
  const categorySelectorForm = useForm<z.infer<typeof CategorySelectorSchema>>({
    resolver: zodResolver(CategorySelectorSchema),
    defaultValues: {
      items: categories.map((category: CategoryType) => category.id),
    },
  });

  function onSubmit(data: z.infer<typeof CategorySelectorSchema>) {
    toast({
      title: "You submitted the following values:",
      description: (
        <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
          <code className="text-white">{JSON.stringify(data, null, 2)}</code>
        </pre>
      ),
    });
  }

  return (
    <Form {...categorySelectorForm}>
      <form
        className="space-y-8"
        onSubmit={() => categorySelectorForm.handleSubmit(onSubmit)}
      >
        <FormField
          control={categorySelectorForm.control}
          name="items"
          render={() => (
            <FormItem>
              <div className="mb-4">
                <FormLabel className="text-base">Categories</FormLabel>
                <FormDescription>
                  Select the categories you wish to appear on the map.
                </FormDescription>
              </div>
              {categories.map((item) => (
                <FormField
                  control={categorySelectorForm.control}
                  key={item.id}
                  name="items"
                  render={({ field }) => {
                    return (
                      <FormItem
                        className="flex flex-row items-start space-x-3 space-y-0"
                        key={item.id}
                      >
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(item.id)}
                            onCheckedChange={(checked) => {
                              return checked
                                ? field.onChange([...field.value, item.id])
                                : field.onChange(
                                    field.value?.filter(
                                      (value) => value !== item.id
                                    )
                                  );
                            }}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">
                          {item.name}
                        </FormLabel>
                      </FormItem>
                    );
                  }}
                />
              ))}
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}
