import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { SiteHeader } from "@/components/site-header"

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
})

export const metadata: Metadata = {
  title: "AI Tools Directory - System Prompts & Models of AI Coding Tools",
  description:
    "The definitive directory of 37+ AI coding tools. Explore system prompts, compare features, and analyze the AI tools landscape including Cursor, GitHub Copilot, Claude Code, and more.",
}

export const viewport: Viewport = {
  themeColor: "#0891b2",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <SiteHeader />
        <main>{children}</main>
      </body>
    </html>
  )
}
