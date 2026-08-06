import Link from "next/link"

import { NavMain, type NavItem } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import type { UserRole } from "@/db/schema"

export function AppSidebar({
  user,
  projects,
}: {
  user: { name: string; email: string; role: UserRole }
  projects: { id: string; name: string; title: string }[]
}) {
  const workspaceItems: NavItem[] = [
    { title: "Dashboard", href: "/dashboard", icon: "dashboard" },
    { title: "All tickets", href: "/tickets", icon: "ticket", match: "tickets" },
    { title: "Settings", href: "/settings", icon: "settings", match: "prefix" },
  ]

  const adminItems: NavItem[] =
    user.role === "admin"
      ? [
          { title: "User management", href: "/admin/users", icon: "users", match: "prefix" },
          { title: "Projects", href: "/admin/projects", icon: "projects", match: "prefix" },
        ]
      : []

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader className="gap-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<Link aria-label="Ticketing home" href="/dashboard" />}
              size="lg"
              tooltip="Ticketing"
            >
              <span className="flex aspect-square size-8 items-center justify-center overflow-hidden rounded-lg bg-sidebar-primary shadow-sm">
                <img alt="" className="size-full object-cover" src="/qby.png" />
              </span>
              <span className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">Ticketing</span>
                <span className="truncate text-xs text-muted-foreground">Internal service desk</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <NavMain
          className="p-0"
          items={[
            {
              title: "New ticket",
              href: "/tickets/new",
              icon: "plus",
              match: "new-ticket",
              variant: "primary",
              action: "create-ticket",
            },
          ]}
        />
      </SidebarHeader>

      <SidebarSeparator />
      <SidebarContent>
        <NavMain items={workspaceItems} label="Workspace" />
        <NavProjects projects={projects} />
        {adminItems.length > 0 ? <NavMain items={adminItems} label="Administration" /> : null}
      </SidebarContent>

      <SidebarSeparator />
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
