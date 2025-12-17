"use client"

import { useEffect, type ReactNode } from "react"
import { registerServiceWorker } from "@/lib/pwa/register-sw"

export function ServiceWorkerProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    registerServiceWorker()
  }, [])

  return <>{children}</>
}
