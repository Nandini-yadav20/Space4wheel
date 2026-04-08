import { LoadingAnimation } from "@/components/ui/loading-animation"

export default function Loading() {
  return (
    <div className="container mx-auto h-[70vh] flex items-center justify-center">
      <LoadingAnimation text="Loading parking plots" />
    </div>
  )
}
