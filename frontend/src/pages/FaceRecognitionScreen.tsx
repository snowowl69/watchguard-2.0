import { useEffect, useRef, useState } from 'react'
import { useWebcam } from '@/hooks/useWebcam'
import { useFaceDetection } from '@/hooks/useFaceDetection'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScanFace, Play, Square, Camera, CheckCircle, XCircle } from 'lucide-react'
import type { RecognitionResult } from '@/types'

export default function FaceRecognitionScreen() {
  const { videoRef, isActive, error: webcamError, start, stop, captureFrame } = useWebcam()
  const { isDetecting, isProcessing, result, startDetection, stopDetection } = useFaceDetection(captureFrame, { interval: 1500 })
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [history, setHistory] = useState<RecognitionResult[]>([])

  // Draw bounding box overlay
  useEffect(() => {
    if (!result?.boundingBox || !canvasRef.current || !videoRef.current) return

    const canvas = canvasRef.current
    const video = videoRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const { x, y, w, h } = result.boundingBox
    ctx.strokeStyle = result.matched ? '#22c55e' : '#ef4444'
    ctx.lineWidth = 3
    ctx.strokeRect(x, y, w, h)

    // Label
    ctx.fillStyle = result.matched ? '#22c55e' : '#ef4444'
    ctx.fillRect(x, y - 24, w, 24)
    ctx.fillStyle = '#fff'
    ctx.font = '14px Inter, sans-serif'
    ctx.fillText(
      result.matched ? `${result.user?.name} (${((result.confidence || 0) * 100).toFixed(0)}%)` : 'Unknown',
      x + 4, y - 6
    )
  }, [result, videoRef])

  // Track history
  useEffect(() => {
    if (result) {
      setHistory(prev => [result, ...prev].slice(0, 10))
    }
  }, [result])

  const handleToggleDetection = () => {
    if (isDetecting) {
      stopDetection()
    } else {
      if (!isActive) start()
      startDetection()
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Face Recognition</h1>
          <p className="text-text-secondary mt-1">Real-time face detection and identification</p>
        </div>
        <Badge variant={isDetecting ? 'success' : 'outline'}>
          {isDetecting ? 'Scanning' : 'Idle'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video Feed */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Camera className="w-5 h-5 text-accent" />
              Camera Feed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative bg-surface-light rounded-lg overflow-hidden aspect-video">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
              />

              {!isActive && (
                <div className="absolute inset-0 flex items-center justify-center bg-surface-light">
                  <div className="text-center">
                    <ScanFace className="w-16 h-16 text-text-secondary mx-auto mb-3 opacity-50" />
                    <p className="text-text-secondary">Camera inactive</p>
                    <Button onClick={start} size="sm" className="mt-3">
                      <Camera className="w-4 h-4 mr-2" />
                      Start Camera
                    </Button>
                  </div>
                </div>
              )}

              {isDetecting && (
                <div className="scan-overlay">
                  <div className="scan-line" />
                </div>
              )}

              {isProcessing && (
                <div className="absolute top-3 right-3">
                  <div className="w-3 h-3 bg-accent rounded-full animate-pulse" />
                </div>
              )}

              {webcamError && (
                <div className="absolute inset-0 flex items-center justify-center bg-surface-light">
                  <div className="text-center text-danger">
                    <XCircle className="w-12 h-12 mx-auto mb-2" />
                    <p className="text-sm">{webcamError}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-4">
              <Button
                onClick={handleToggleDetection}
                variant={isDetecting ? 'destructive' : 'default'}
                className="flex-1"
              >
                {isDetecting ? (
                  <><Square className="w-4 h-4 mr-2" /> Stop Scanning</>
                ) : (
                  <><Play className="w-4 h-4 mr-2" /> Start Scanning</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recognition Result Panel */}
        <div className="space-y-4">
          {/* Current Result */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recognition Result</CardTitle>
            </CardHeader>
            <CardContent>
              {result ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    {result.matched ? (
                      <CheckCircle className="w-10 h-10 text-success" />
                    ) : (
                      <XCircle className="w-10 h-10 text-danger" />
                    )}
                    <div>
                      <p className="font-semibold text-white text-lg">
                        {result.matched ? result.user?.name : 'Unknown'}
                      </p>
                      <Badge variant={result.matched ? 'success' : 'danger'}>
                        {result.matched ? 'AUTHORIZED' : 'DENIED'}
                      </Badge>
                    </div>
                  </div>

                  {result.user && (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Employee ID</span>
                        <span className="text-white font-mono">{result.user.employeeId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Department</span>
                        <span className="text-white">{result.user.department}</span>
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-text-secondary">Confidence</span>
                      <span className="text-white font-mono">
                        {((result.confidence || 0) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="confidence-bar">
                      <div
                        className="confidence-fill"
                        style={{
                          width: `${(result.confidence || 0) * 100}%`,
                          backgroundColor: result.matched ? '#22c55e' : '#ef4444',
                        }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-text-secondary">
                  <ScanFace className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Waiting for scan...</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Recent Scans</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-48 overflow-auto">
                {history.length > 0 ? history.map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-[#1f2937] last:border-0">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${item.matched ? 'bg-success' : 'bg-danger'}`} />
                      <span className="text-sm text-white">
                        {item.matched ? item.user?.name : 'Unknown'}
                      </span>
                    </div>
                    <span className="text-xs text-text-secondary font-mono">
                      {((item.confidence || 0) * 100).toFixed(0)}%
                    </span>
                  </div>
                )) : (
                  <p className="text-sm text-text-secondary text-center py-4">No scans yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
