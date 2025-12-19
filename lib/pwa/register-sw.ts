"use client"

export function registerServiceWorker() {
  if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    window.addEventListener("load", async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          updateViaCache: "none", // Always check for new SW, bypass HTTP cache
        })
        console.log("Service Worker registered:", registration)

        // Check for updates immediately and periodically
        registration.update()

        // Check for updates every 60 seconds
        setInterval(() => {
          registration.update()
        }, 60 * 1000)

        // When a new service worker is found, activate it immediately
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                // New content is available, reload the page
                console.log("New content available, reloading...")
                window.location.reload()
              }
            })
          }
        })
      } catch (error) {
        console.error("Service Worker registration failed:", error)
      }
    })
  }
}
