import { useState, useCallback, useRef, useEffect } from 'react'
import { faceApi } from '@/api/client'
import type { RecognitionResult } from '@/types'

interface UseFaceDetectionOptions {
  interval?: number // ms between captures, default 1500
  autoStart?: boolean
}

export function useFaceDetection(
  captureFrame: () => string | null,
  options: UseFaceDetectionOptions = {}
) {
  const { interval = 1500, autoStart = false } = options
  const [isDetecting, setIsDetecting] = useState(false)
  const [result, setResult] = useState<RecognitionResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  const playSound = useCallback((success: boolean) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext()
      }
      const ctx = audioContextRef.current
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()

      oscillator.connect(gain)
      gain.connect(ctx.destination)

      oscillator.frequency.value = success ? 800 : 300
      oscillator.type = 'sine'
      gain.gain.value = 0.1

      oscillator.start()
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
      oscillator.stop(ctx.currentTime + 0.3)
    } catch {
      // Audio not available
    }
  }, [])

  const detectOnce = useCallback(async () => {
    if (isProcessing) return

    const frame = captureFrame()
    if (!frame) return

    setIsProcessing(true)
    try {
      const { data: response } = await faceApi.recognizeBase64(frame)
      if (response.success && response.data) {
        setResult(response.data)
        playSound(response.data.matched)
      }
    } catch (err) {
      console.error('Face detection error:', err)
    } finally {
      setIsProcessing(false)
    }
  }, [captureFrame, isProcessing, playSound])

  const startDetection = useCallback(() => {
    setIsDetecting(true)
    intervalRef.current = setInterval(detectOnce, interval)
  }, [detectOnce, interval])

  const stopDetection = useCallback(() => {
    setIsDetecting(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  useEffect(() => {
    if (autoStart) startDetection()
    return () => stopDetection()
  }, [autoStart, startDetection, stopDetection])

  return {
    isDetecting,
    isProcessing,
    result,
    startDetection,
    stopDetection,
    detectOnce,
  }
}
