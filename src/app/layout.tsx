import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";

import { PageLoadingProvider } from "@/components/page-loading";
import { Toaster } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: {
    default: "Ticketing Portal",
    template: "%s | Ticketing Portal",
  },
  description: "Internal project support and ticket management workspace.",
  icons: {
    icon: "/qby.png",
    shortcut: "/qby.png",
    apple: "/qby.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body>
        <TooltipProvider>
          <PageLoadingProvider>{children}</PageLoadingProvider>
        </TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
