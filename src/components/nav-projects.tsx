"use client"

import * as React from "react"
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
  projects: { id: string; name: string; title: string; logoObjectKey: string | null }[]
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
                    <ProjectNavIcon project={project} />
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

function ProjectNavIcon({
  project,
}: {
  project: { id: string; logoObjectKey: string | null }
}) {
  const [loaded, setLoaded] = React.useState(false)
  const [failed, setFailed] = React.useState(false)

  React.useEffect(() => {
    setLoaded(false)
    setFailed(false)
  }, [project.id, project.logoObjectKey])

  if (!project.logoObjectKey || failed) return <FolderKanban />

  return (
    <span className="relative flex size-4 shrink-0 items-center justify-center overflow-hidden rounded-sm">
      {!loaded ? <FolderKanban className="absolute size-4" /> : null}
      <img
        alt=""
        className={`size-4 object-cover transition-opacity ${loaded ? "opacity-100" : "opacity-0"}`}
        onError={() => setFailed(true)}
        onLoad={() => setLoaded(true)}
        src={`/api/projects/${project.id}/logo`}
      />
    </span>
  )
}
