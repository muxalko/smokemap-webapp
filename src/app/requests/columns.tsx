"use client";

import {
  AddressType,
  CategoryType,
  ImageType,
  RequestType,
} from "@/graphql/__generated__/types";
import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import { approveRequest, deleteRequest } from "../actions";
import { generateColumnHelper } from "@/lib/table-utils";
import Image from "next/image";

// const columnHelper = createColumnHelper<RequestType>();
const columnHelper = generateColumnHelper<RequestType>();

// This is how the request response looks like:
// id
// name
// category {
//     name
// }
// address {
//     properties {
//         addressString
//     }
//     geometry {
//         coordinates
//     }
// }
// description
// tags
// dateCreated

// example without columnHelper has issues with types
// export const columns: ColumnDef<RequestType, unknown>[] = [
//   {
//     accessorKey: "id",
//     header: "Id",
//   }
// ]

export const columns: ColumnDef<RequestType>[] = [
  columnHelper.accessor("id", {
    header: "Id",
    cell: (props) => props.getValue(),
  }),
  columnHelper.accessor("category", {
    header: () => <div>Category</div>,
    cell: ({ row }) => {
      const category: CategoryType = row.getValue("category");
      return <div className="text-right font-medium">{category?.name}</div>;
    },
  }),
  columnHelper.accessor("name", {
    header: "Name",
    cell: (props) => props.getValue(),
  }),
  columnHelper.accessor("address", {
    header: () => <div>Address</div>,
    cell: ({ row }) => {
      const address: AddressType = row.getValue("address");
      // const formatted = new Intl.NumberFormat("en-US", {
      //   style: "currency",
      //   currency: "USD",
      // }).format(amount)

      return (
        <div className="text-right font-medium">
          {address?.properties?.addressString} {address.geometry.coordinates}
        </div>
      );
    },
  }),
  columnHelper.accessor("imageSet", {
    header: () => <div>Images</div>,
    cell: ({ row }) => {
      const images: ImageType[] = row.getValue("imageSet");

      return (
        <div className="text-right font-medium">
          {images &&
            images.map((image) => (
              <Image
                key={image.id}
                src={image.url}
                width={500}
                height={500}
                alt={image.name}
              />
            ))}
        </div>
      );
    },
  }),
  columnHelper.accessor("dateCreated", {
    header: "Created at",
    cell: (props) => props.getValue(),
  }),
  columnHelper.accessor("description", {
    header: "Description",
    cell: (props) => props.getValue(),
  }),
  columnHelper.accessor("tags", {
    header: "Tags",
    cell: (props) => props.getValue(),
  }),
  columnHelper.display("actions", {
    cell: ({ row }) => {
      const request = row.original;

      return (
        <>
          <Button
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            onClick={async () => {
              const approveRequestResult = await approveRequest(request.id);
              console.log(
                "Got approveRequest response: ",
                approveRequestResult
              );
            }}
          >
            Approve
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                // eslint-disable-next-line @typescript-eslint/no-misused-promises
                onClick={async () => {
                  const deleteRequestResult = await deleteRequest(request.id);
                  console.log(
                    "Got deleteRequest response: ",
                    deleteRequestResult
                  );
                }}
              >
                Delete
              </DropdownMenuItem>
              <DropdownMenuItem
                // eslint-disable-next-line @typescript-eslint/no-misused-promises
                onClick={async () => {
                  const approveRequestResult = await approveRequest(request.id);
                  console.log(
                    "Got approveRequest response: ",
                    approveRequestResult
                  );
                }}
              >
                Approve
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {/* <DropdownMenuItem>View customer</DropdownMenuItem>
            <DropdownMenuItem>View payment details</DropdownMenuItem> */}
            </DropdownMenuContent>
          </DropdownMenu>
          {/* {request && <pre className="text-left text-red-800">{JSON.stringify(request, null, 4)}</pre>} */}
        </>
      );
    },
  }),
] as Array<ColumnDef<RequestType, unknown>>;
