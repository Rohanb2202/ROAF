// Image Filters Library
// Uses Canvas-based filters (no TensorFlow dependency)

export type FilterType =
  | "none"
  | "grayscale"
  | "sepia"
  | "warm"
  | "cool"
  | "vintage"
  | "bright"
  | "contrast"
  | "saturate"
  | "blur"
  | "fade"
  | "dramatic"

export interface FilterConfig {
  id: FilterType
  name: string
  css: string
}

export const FILTERS: FilterConfig[] = [
  { id: "none", name: "Normal", css: "" },
  { id: "grayscale", name: "B&W", css: "grayscale(100%)" },
  { id: "sepia", name: "Sepia", css: "sepia(80%)" },
  { id: "warm", name: "Warm", css: "sepia(30%) saturate(140%) brightness(105%)" },
  { id: "cool", name: "Cool", css: "saturate(80%) hue-rotate(20deg) brightness(105%)" },
  { id: "vintage", name: "Vintage", css: "sepia(40%) contrast(90%) brightness(90%) saturate(80%)" },
  { id: "bright", name: "Bright", css: "brightness(120%) contrast(105%)" },
  { id: "contrast", name: "Contrast", css: "contrast(140%) brightness(95%)" },
  { id: "saturate", name: "Vivid", css: "saturate(150%)" },
  { id: "blur", name: "Soft", css: "blur(1px) brightness(105%)" },
  { id: "fade", name: "Fade", css: "saturate(70%) brightness(110%) contrast(85%)" },
  { id: "dramatic", name: "Dramatic", css: "contrast(130%) saturate(110%) brightness(90%)" },
]

// Process image with selected filter
export async function processImageWithFilter(
  imageSource: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  filter: FilterType,
  outputWidth?: number,
  outputHeight?: number
): Promise<string> {
  const canvas = document.createElement("canvas")

  // Get source dimensions
  let srcWidth: number
  let srcHeight: number

  if (imageSource instanceof HTMLVideoElement) {
    srcWidth = imageSource.videoWidth
    srcHeight = imageSource.videoHeight
  } else if (imageSource instanceof HTMLCanvasElement) {
    srcWidth = imageSource.width
    srcHeight = imageSource.height
  } else {
    srcWidth = imageSource.naturalWidth || imageSource.width
    srcHeight = imageSource.naturalHeight || imageSource.height
  }

  canvas.width = outputWidth || srcWidth || 1080
  canvas.height = outputHeight || srcHeight || 1920

  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Failed to get canvas context")

  // Apply filter
  const filterConfig = FILTERS.find(f => f.id === filter)
  if (filterConfig?.css) {
    ctx.filter = filterConfig.css
  }

  // Draw image
  ctx.drawImage(imageSource, 0, 0, canvas.width, canvas.height)

  // Reset filter
  ctx.filter = "none"

  return canvas.toDataURL("image/jpeg", 0.9)
}

// Get CSS filter string for preview
export function getFilterCSS(filter: FilterType): string {
  const filterConfig = FILTERS.find(f => f.id === filter)
  return filterConfig?.css || ""
}
