// Media compression utilities for images and videos

const MAX_IMAGE_WIDTH = 1080
const MAX_IMAGE_HEIGHT = 1080
const IMAGE_QUALITY = 0.85

const MAX_VIDEO_WIDTH = 720
const MAX_VIDEO_HEIGHT = 720

export interface CompressedMedia {
  blob: Blob
  width: number
  height: number
  type: string
}

export async function compressImage(file: File): Promise<CompressedMedia> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")

    if (!ctx) {
      reject(new Error("Failed to get canvas context"))
      return
    }

    img.onload = () => {
      let { width, height } = img

      // Calculate new dimensions maintaining aspect ratio
      if (width > MAX_IMAGE_WIDTH || height > MAX_IMAGE_HEIGHT) {
        const ratio = Math.min(MAX_IMAGE_WIDTH / width, MAX_IMAGE_HEIGHT / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }

      canvas.width = width
      canvas.height = height
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve({ blob, width, height, type: "image/webp" })
          } else {
            reject(new Error("Failed to compress image"))
          }
        },
        "image/webp",
        IMAGE_QUALITY
      )
    }

    img.onerror = () => reject(new Error("Failed to load image"))
    img.src = URL.createObjectURL(file)
  })
}

export async function generateVideoThumbnail(file: File): Promise<CompressedMedia> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video")
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")

    if (!ctx) {
      reject(new Error("Failed to get canvas context"))
      return
    }

    video.onloadedmetadata = () => {
      video.currentTime = Math.min(1, video.duration / 2)
    }

    video.onseeked = () => {
      let { videoWidth: width, videoHeight: height } = video

      // Calculate new dimensions maintaining aspect ratio
      if (width > MAX_VIDEO_WIDTH || height > MAX_VIDEO_HEIGHT) {
        const ratio = Math.min(MAX_VIDEO_WIDTH / width, MAX_VIDEO_HEIGHT / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }

      canvas.width = width
      canvas.height = height
      ctx.drawImage(video, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve({ blob, width, height, type: "image/webp" })
          } else {
            reject(new Error("Failed to generate thumbnail"))
          }
        },
        "image/webp",
        IMAGE_QUALITY
      )

      URL.revokeObjectURL(video.src)
    }

    video.onerror = () => reject(new Error("Failed to load video"))
    video.src = URL.createObjectURL(file)
  })
}

export function getMediaDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    if (file.type.startsWith("image/")) {
      const img = new Image()
      img.onload = () => {
        resolve({ width: img.width, height: img.height })
        URL.revokeObjectURL(img.src)
      }
      img.onerror = () => reject(new Error("Failed to load image"))
      img.src = URL.createObjectURL(file)
    } else if (file.type.startsWith("video/")) {
      const video = document.createElement("video")
      video.onloadedmetadata = () => {
        resolve({ width: video.videoWidth, height: video.videoHeight })
        URL.revokeObjectURL(video.src)
      }
      video.onerror = () => reject(new Error("Failed to load video"))
      video.src = URL.createObjectURL(file)
    } else {
      reject(new Error("Unsupported media type"))
    }
  })
}
