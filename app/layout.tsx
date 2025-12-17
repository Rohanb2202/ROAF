import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { AuthProvider } from "@/lib/context/auth-context"
import { Toaster } from "@/components/ui/toaster"
import { ServiceWorkerProvider } from "@/components/providers/service-worker-provider"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "ROAF - Private Encrypted Chat",
  description: "End-to-end encrypted chat for two",
  generator: "v0.app",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ROAF",
  },
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
}

export const viewport: Viewport = {
  themeColor: "#EF4444",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <ServiceWorkerProvider>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </ServiceWorkerProvider>
      </body>
    </html>
  )
}
