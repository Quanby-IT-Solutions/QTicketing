"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  FolderKanban,
  LayoutDashboard,
  Plus,
  Settings2,
  Ticket,
  UsersRound,
} from "lucide-react"

import { useTicketDialog, type CreateTicketProject } from "@/components/create-ticket-dialog"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

export type NavItem = {
  title: string
  href: string
  icon: "dashboard" | "plus" | "projects" | "settings" | "ticket" | "users"
  match?: "exact" | "new-ticket" | "prefix" | "tickets"
  variant?: "default" | "primary"
  action?: "create-ticket"
  project?: CreateTicketProject
}

const icons = {
  dashboard: LayoutDashboard,
  plus: Plus,
  projects: FolderKanban,
  settings: Settings2,
  ticket: Ticket,
  users: UsersRound,
}

function isItemActive(pathname: string, item: NavItem) {
  switch (item.match) {
    case "prefix":
      return pathname === item.href || pathname.startsWith(`${item.href}/`)
    case "new-ticket":
      return pathname === "/tickets/new" || /^\/tickets\/[^/]+\/new\/?$/.test(pathname)
    case "tickets":
      return pathname === "/tickets" || pathname.startsWith("/tickets/detail/")
    default:
      return pathname === item.href
  }
}

export function NavMain({
  items,
  label,
  className,
}: {
  items: NavItem[]
  label?: string
  className?: string
}) {
  const pathname = usePathname()
  const { setOpenMobile } = useSidebar()
  const { currentRouteProject, openTicketDialog } = useTicketDialog()

  return (
    <SidebarGroup className={className}>
      {label ? <SidebarGroupLabel>{label}</SidebarGroupLabel> : null}
      <SidebarGroupContent>
        <SidebarMenu className="gap-1">
          {items.map((item) => {
            const active = isItemActive(pathname, item)
            const Icon = icons[item.icon]
            const fallbackProject = item.project ?? currentRouteProject
            const href =
              item.action === "create-ticket" && fallbackProject
                ? `/tickets/${encodeURIComponent(fallbackProject.name)}/new`
                : item.href

            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  className={cn(
                    "h-9",
                    item.variant === "primary" &&
                      "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm hover:bg-sidebar-primary/90 hover:text-sidebar-primary-foreground data-active:bg-sidebar-primary data-active:text-sidebar-primary-foreground",
                  )}
                  isActive={active}
                  render={
                    <Link
                      aria-current={active ? "page" : undefined}
                      data-no-page-loading={item.action === "create-ticket" ? "" : undefined}
                      href={href}
                      onClick={(event) => {
                        if (item.action === "create-ticket") {
                          if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
                          event.preventDefault()
                          openTicketDialog(item.project)
                        }
                        setOpenMobile(false)
                      }}
                    />
                  }
                  tooltip={item.title}
                >
                  <Icon />
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
