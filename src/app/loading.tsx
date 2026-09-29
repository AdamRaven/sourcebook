import { Skeleton } from "@/components/ui/skeleton";

// Shown while a server component is still fetching. Without this the browser
// sits on the previous page and the app feels frozen.
export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Skeleton className="mb-8 h-8 w-40" />
      <Skeleton className="mb-6 h-10 w-44" />
      <div className="space-y-2">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    </div>
  );
}
