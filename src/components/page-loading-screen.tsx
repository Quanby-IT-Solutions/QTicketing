import Image from "next/image"

import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

export function PageLoadingScreen({
  message = "Loading page...",
  overlay = false,
}: {
  message?: string
  overlay?: boolean
}) {
  return (
    <div
      aria-live="polite"
      aria-busy="true"
      className={cn(
        "flex min-h-svh items-center justify-center bg-background/95 px-6 backdrop-blur-sm",
        overlay && "fixed inset-0 z-[100]",
      )}
      role="status"
    >
      <div className="flex flex-col items-center gap-5 text-center">
        <div className="relative flex size-20 items-center justify-center rounded-2xl border bg-card shadow-xl shadow-primary/10">
          <span className="absolute inset-[-7px] animate-pulse rounded-[1.25rem] border border-primary/20" />
          <Image alt="Ticketing Portal" className="size-12 rounded-full object-cover" height={48} priority src="/qby.png" width={48} />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2 text-sm font-semibold">
            <Spinner className="size-4 text-primary" />
            <span>{message}</span>
          </div>
          <p className="text-xs text-muted-foreground">Please wait a moment.</p>
        </div>
        <div className="h-1 w-40 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/2 animate-[page-loading-slide_1.1s_ease-in-out_infinite] rounded-full bg-primary" />
        </div>
      </div>
    </div>
  )
}
