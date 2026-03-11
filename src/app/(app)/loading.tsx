import { Skeleton } from "@/components/ui/skeleton"

export default function AppLoading() {
  return (
    <div className="mx-auto max-w-3xl py-12">
      <Skeleton className="mb-4 h-4 w-32" />
      <Skeleton className="mb-2 h-10 w-80" />
      <Skeleton className="mb-12 h-6 w-96" />
      <Skeleton className="h-32 w-full" />
    </div>
  )
}
