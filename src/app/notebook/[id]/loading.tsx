import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex h-dvh flex-col">
      <div className="border-b px-3 py-2">
        <Skeleton className="h-8 w-56" />
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="w-80 shrink-0 space-y-3 border-r p-4">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
        <div className="flex-1 p-6">
          <Skeleton className="mx-auto h-5 w-80" />
        </div>
      </div>
    </div>
  );
}
