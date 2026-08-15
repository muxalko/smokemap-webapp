// Found at https://github.com/TanStack/table/issues/4241
import { AccessorFn, ColumnDef, DisplayColumnDef, GroupColumnDef, IdentifiedColumnDef } from "@tanstack/react-table";

/**
 * Helper function to create column definitions for React Table.
 * This is a fallback for `createColumnHelper` which is not working and breaking.
 *
 * @returns Object with methods to create different types of column definitions.
 */
export function generateColumnHelper<TData>() {
  return {
    accessor: <
      TAccessor extends AccessorFn<TData> | keyof TData,
      TValue extends TAccessor extends AccessorFn<TData, infer TReturn> ? TReturn : TAccessor extends keyof TData ? TData[TAccessor] : never
    >(
      accessor: TAccessor,
      column: TAccessor extends AccessorFn<TData> ? DisplayColumnDef<TData, TValue> : IdentifiedColumnDef<TData, TValue>
    ): ColumnDef<TData, TValue> => {
      if (typeof accessor === 'function') {
        return { accessorFn: accessor as AccessorFn<TData, TValue>, ...column } as ColumnDef<TData, TValue>;
      } else {
        return { accessorKey: accessor as keyof TData, ...column } as ColumnDef<TData, TValue>;
      }
    },

    display(id: string, props: Omit<DisplayColumnDef<TData>, 'id'>): DisplayColumnDef<TData> {
      return { id, ...props };
    },
    group(id: string, props: Omit<GroupColumnDef<TData>, 'id'>): GroupColumnDef<TData> {
      return { id, ...props };
    }
  };
}