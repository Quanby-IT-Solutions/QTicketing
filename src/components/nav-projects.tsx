"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { FolderKanban } from "lucide-react"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

export function NavProjects({
  projects,
}: {
  projects: { id: string; name: string; title: string }[]
}) {
  const pathname = usePathname()
  const { setOpenMobile } = useSidebar()

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Projects</SidebarGroupLabel>
      <SidebarGroupContent>
        {projects.length > 0 ? (
          <SidebarMenu className="gap-1">
            {projects.map((project) => {
              const href = `/tickets/${encodeURIComponent(project.name)}`
              const active =
                pathname === href ||
                (pathname.startsWith(`${href}/`) && !pathname.endsWith("/new"))

              return (
                <SidebarMenuItem key={project.id}>
                  <SidebarMenuButton
                    className="h-9 pr-16"
                    isActive={active}
                    render={
                      <Link
                        aria-current={active ? "page" : undefined}
                        href={href}
                        onClick={() => setOpenMobile(false)}
                      />
                    }
                    tooltip={`${project.title} (${project.name})`}
                  >
                    <FolderKanban />
                    <span>{project.title}</span>
                  </SidebarMenuButton>
                  <SidebarMenuBadge className="max-w-14 truncate font-mono text-[10px] text-muted-foreground">
                    {project.name}
                  </SidebarMenuBadge>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        ) : (
          <p className="px-2 py-1 text-xs leading-5 text-muted-foreground group-data-[collapsible=icon]:hidden">
            No project access yet.
          </p>
        )}
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
