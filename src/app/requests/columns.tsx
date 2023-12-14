"use client";

import { AddressType, RequestType } from "@/graphql/__generated__/graphql";
import { ColumnDef } from "@tanstack/react-table";
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

export const columns: ColumnDef<RequestType>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "description",
    header: "Description",
  },
  {
    accessorKey: "dateCreated",
    header: "Created at",
  },
  {
    accessorKey: "address",
    header: () => <div className="text-right">Address</div>,
    cell: ({ row }) => {
      const address: AddressType = row.getValue("address");
      // const formatted = new Intl.NumberFormat("en-US", {
      //   style: "currency",
      //   currency: "USD",
      // }).format(amount)

      return (
        <div className="text-right font-medium">
          {address.properties?.addressString} ({address.geometry.coordinates[0]}
          ,{address.geometry.coordinates[1]})
        </div>
      );
    },
  },
  {
    accessorKey: "tags",
    header: "Tags",
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const request = row.original;
      const onClickDeleteHandler = async (id: String) => {
        console.log("Send delete request id=", id);
        const response = await fetch('/api/request', {
          method: 'DELETE',
          body: JSON.stringify({id: id})
        })
     
        // Handle response if necessary
        const data = await response.json()
        // ...
        console.log("Got delete aprove response: ", data);
      }

      const onClickApproveHandler = async (id: String) => {
        
        console.log("Send approve request id=", id);
        const response = await fetch('/api/request', {
          method: 'POST',
          body: JSON.stringify({id: id})
        })
     
        // Handle response if necessary
        const data = await response.json()
        // ...
        console.log("Got response: ", data);
      };
      return (
        <>
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
              onClick = { async () => {
                const deleteRequestResult = await deleteRequest(request.id)
                console.log("Got deleteRequest response: ", deleteRequestResult);
              }}
            >
              Delete
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick = { async () => {
                const approveRequestResult = await approveRequest(request.id)
                console.log("Got approveRequest response: ", approveRequestResult);
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
  },
];
