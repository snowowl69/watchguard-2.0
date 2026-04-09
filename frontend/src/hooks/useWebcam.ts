import { useRef, useState, useCallback, useEffect } from 'react'

interface UseWebcamOptions {
  width?: number
  height?: number
  facingMode?: 'user' | 'environment'
}

export function useWebcam(options: UseWebcamOptions = {}) {
  const { width = 640, height = 480, facingMode = 'user' } = options
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [isActive, setIsActive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const start = useCallback(async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: width }, height: { ideal: height }, facingMode },
        audio: false,
      })

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setIsActive(true)
    } catch (err: any) {
      setError(err.message || 'Failed to access webcam')
      setIsActive(false)
    }
  }, [width, height, facingMode])

  const stop = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsActive(false)
  }, [])

  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current || !isActive) return null

    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth || width
    canvas.height = videoRef.current.videoHeight || height
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.8)
  }, [isActive, width, height])

  const captureBlob = useCallback(async (): Promise<Blob | null> => {
    if (!videoRef.current || !isActive) return null

    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth || width
    canvas.height = videoRef.current.videoHeight || height
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.8)
    })
  }, [isActive, width, height])

  // Cleanup on unmount
  useEffect(() => {
    return () => { stop() }
  }, [stop])

  return { videoRef, isActive, error, start, stop, captureFrame, captureBlob }
}
