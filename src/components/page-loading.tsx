"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

import { PageLoadingScreen } from "@/components/page-loading-screen"

const loadingFallbackMs = 15_000

function isModifiedClick(event: MouseEvent) {
  return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
}

export function PageLoadingProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [loadingState, setLoadingState] = React.useState<{
    message: string
    pathname: string
  } | null>(null)
  const fallbackTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const startLoading = React.useCallback((message: string, sourcePathname: string) => {
    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current)
    setLoadingState({ message, pathname: sourcePathname })
    fallbackTimerRef.current = setTimeout(() => {
      fallbackTimerRef.current = null
      setLoadingState(null)
    }, loadingFallbackMs)
  }, [])

  React.useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented || isModifiedClick(event)) return

      const target = event.target
      if (!(target instanceof Element)) return

      const anchor = target.closest("a[href]")
      if (!(anchor instanceof HTMLAnchorElement)) return
      if (anchor.dataset.noPageLoading !== undefined) return
      if (anchor.download || (anchor.target && anchor.target !== "_self")) return

      const url = new URL(anchor.href, window.location.href)
      if (url.origin !== window.location.origin) return
      if (url.pathname === window.location.pathname) return

      startLoading(anchor.dataset.loadingMessage || "Loading page...", pathname)
    }

    function handleSubmit(event: SubmitEvent) {
      if (event.defaultPrevented) return

      const form = event.target
      if (!(form instanceof HTMLFormElement) || form.dataset.pageLoading !== "true") return

      startLoading(form.dataset.loadingMessage || "Processing your request...", pathname)
    }

    function handleHistoryNavigation() {
      startLoading("Loading page...", pathname)
    }

    document.addEventListener("click", handleClick, true)
    document.addEventListener("submit", handleSubmit, true)
    window.addEventListener("popstate", handleHistoryNavigation)

    return () => {
      document.removeEventListener("click", handleClick, true)
      document.removeEventListener("submit", handleSubmit, true)
      window.removeEventListener("popstate", handleHistoryNavigation)
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current)
    }
  }, [pathname, startLoading])

  const loadingMessage = loadingState?.pathname === pathname ? loadingState.message : null

  return (
    <>
      {children}
      {loadingMessage ? <PageLoadingScreen message={loadingMessage} overlay /> : null}
    </>
  )
}
