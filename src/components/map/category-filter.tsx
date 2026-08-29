import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "@/components/ui/use-toast";
import type { CategoryType } from "@/graphql/__generated__/types";

const CategorySelectorSchema = z.object({
  items: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "You have to select at least one item.",
  }),
});

export interface CategoryFilterProps {
  categories: CategoryType[];
  loading: boolean;
  error: string | null;
  visibility: Map<string, boolean>;
  onCategoryChange: (categoryId: string, visible: boolean) => void;
  onSelectAll: () => void;
  onSelectNone: () => void;
}

export function CategoryFilter({
  categories,
  loading,
  error,
  visibility,
  onCategoryChange,
  onSelectAll,
  onSelectNone,
}: CategoryFilterProps) {
  const form = useForm<z.infer<typeof CategorySelectorSchema>>({
    resolver: zodResolver(CategorySelectorSchema),
    defaultValues: { items: [] },
  });

  useEffect(() => {
    form.setValue(
      "items",
      categories
        .filter((category) => visibility.get(category.id))
        .map((category) => category.name)
    );
  }, [categories, form, visibility]);

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
    <div className="absolute right-5 top-20 z-20">
      <Popover>
        <PopoverTrigger type="button" className="bg-transparent">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24px"
            height="24px"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M19 3H5C3.89543 3 3 3.89543 3 5V6.17157C3 6.70201 3.21071 7.21071 3.58579 7.58579L9.41421 13.4142C9.78929 13.7893 10 14.298 10 14.8284V20V20.2857C10 20.9183 10.7649 21.2351 11.2122 20.7878L12 20L13.4142 18.5858C13.7893 18.2107 14 17.702 14 17.1716V14.8284C14 14.298 14.2107 13.7893 14.5858 13.4142L20.4142 7.58579C20.7893 7.21071 21 6.70201 21 6.17157V5C21 3.89543 20.1046 3 19 3Z"
              stroke="#3f6be3"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </PopoverTrigger>
        <PopoverContent>
          {visibility.size > 0 && (
            <div className="m-1 p-2">
              <Form {...form}>
                <form
                  className="space-y-8"
                  onSubmit={(event) => {
                    void form.handleSubmit(onSubmit)(event);
                  }}
                >
                  <FormField
                    control={form.control}
                    name="items"
                    render={() => (
                      <FormItem>
                        <div className="mb-4">
                          <FormLabel className="text-base">
                            Categories
                          </FormLabel>
                        </div>
                        {loading && <p>Loading ...</p>}
                        {error && <p>{error}</p>}
                        {categories.map((category) => (
                          <FormField
                            control={form.control}
                            key={category.name}
                            name="items"
                            render={({ field }) => (
                              <FormItem
                                className="flex flex-row items-start space-x-3 space-y-0"
                                key={category.id}
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(
                                      category.name
                                    )}
                                    onCheckedChange={(checked) => {
                                      const visible = checked === true;
                                      onCategoryChange(category.id, visible);
                                      return visible
                                        ? field.onChange([
                                            ...field.value,
                                            category.name,
                                          ])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) =>
                                                value !== category.name
                                            )
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {category.name}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      onSelectAll();
                      form.setValue(
                        "items",
                        categories.map((category) => category.name)
                      );
                    }}
                  >
                    select all
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      onSelectNone();
                      form.setValue("items", []);
                    }}
                  >
                    select none
                  </Button>
                </form>
              </Form>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
