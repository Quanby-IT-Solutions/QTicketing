"use client"

import { Fragment } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { CreateTicketButton } from "@/components/create-ticket-dialog"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import type { UserRole } from "@/db/schema"

type Crumb = {
  label: string
  href?: string
}

function decodeSegment(segment: string) {
  try {
    return decodeURIComponent(segment).replace(/[-_]/g, " ")
  } catch {
    return segment.replace(/[-_]/g, " ")
  }
}

function getBreadcrumbs(pathname: string): Crumb[] {
  if (pathname === "/dashboard") return [{ label: "Dashboard" }]
  if (pathname === "/tickets") return [{ label: "Tickets" }]
  if (pathname === "/tickets/new") {
    return [{ label: "Tickets", href: "/tickets" }, { label: "New ticket" }]
  }
  if (pathname.startsWith("/tickets/detail/")) {
    return [{ label: "Tickets", href: "/tickets" }, { label: "Ticket details" }]
  }

  const projectTicket = pathname.match(/^\/tickets\/([^/]+)$/)
  if (projectTicket) {
    return [{ label: "Tickets", href: "/tickets" }, { label: decodeSegment(projectTicket[1]) }]
  }

  const newProjectTicket = pathname.match(/^\/tickets\/([^/]+)\/new$/)
  if (newProjectTicket) {
    const projectCode = decodeSegment(newProjectTicket[1])
    return [
      { label: "Tickets", href: "/tickets" },
      { label: projectCode, href: `/tickets/${newProjectTicket[1]}` },
      { label: "New ticket" },
    ]
  }

  if (pathname === "/admin/users") {
    return [{ label: "Administration" }, { label: "Users" }]
  }
  if (pathname === "/admin/projects") {
    return [{ label: "Administration" }, { label: "Projects" }]
  }
  if (pathname === "/settings") return [{ label: "Settings" }]

  const segments = pathname.split("/").filter(Boolean)
  return segments.length > 0
    ? segments.map((segment, index) => ({
        label: decodeSegment(segment),
        href: index < segments.length - 1 ? `/${segments.slice(0, index + 1).join("/")}` : undefined,
      }))
    : [{ label: "Dashboard" }]
}

export function SiteHeader({
  user,
}: {
  user: { name: string; role: UserRole }
}) {
  const pathname = usePathname()
  const breadcrumbs = getBreadcrumbs(pathname)

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/75 md:h-16 md:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator className="mx-1 h-4" orientation="vertical" />
        <Breadcrumb className="min-w-0">
          <BreadcrumbList className="flex-nowrap">
            {breadcrumbs.map((crumb, index) => {
              const current = index === breadcrumbs.length - 1
              return (
                <Fragment key={`${crumb.label}-${index}`}>
                  {index > 0 ? <BreadcrumbSeparator className="hidden sm:list-item" /> : null}
                  <BreadcrumbItem className={current ? "min-w-0" : "hidden sm:inline-flex"}>
                    {current ? (
                      <BreadcrumbPage className="truncate font-medium">{crumb.label}</BreadcrumbPage>
                    ) : crumb.href ? (
                      <BreadcrumbLink render={<Link href={crumb.href} />}>{crumb.label}</BreadcrumbLink>
                    ) : (
                      <span>{crumb.label}</span>
                    )}
                  </BreadcrumbItem>
                </Fragment>
              )
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="hidden items-center gap-2 lg:flex">
          <span className="max-w-40 truncate text-sm font-medium">{user.name}</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium capitalize text-muted-foreground">
            {user.role}
          </span>
        </div>
        <CreateTicketButton
          aria-label="Create a new ticket"
          label={<span className="hidden sm:inline">New ticket</span>}
          size="sm"
        />
      </div>
    </header>
  )
}
