import { AppSidebar } from "@/components/app-sidebar"
import { TicketDialogProvider } from "@/components/create-ticket-dialog"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import type { UserRole } from "@/db/schema"

export function AppShell({
  user,
  projects,
  children,
}: {
  user: { name: string; email: string; role: UserRole }
  projects: { id: string; name: string; title: string; logoObjectKey: string | null }[]
  children: React.ReactNode
}) {
  return (
    <TicketDialogProvider projects={projects}>
      <SidebarProvider>
        <AppSidebar projects={projects} user={user} />
        <SidebarInset className="min-h-svh md:border md:border-sidebar-border/70">
          <SiteHeader user={user} />
          <div className="@container/main flex flex-1 flex-col">
            <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col p-4 sm:p-6 lg:p-8">
              {children}
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TicketDialogProvider>
  )
}
