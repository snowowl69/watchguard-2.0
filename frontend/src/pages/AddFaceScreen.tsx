import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWebcam } from '@/hooks/useWebcam'
import { faceApi } from '@/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Camera, UserPlus, CheckCircle, RotateCcw } from 'lucide-react'

export default function AddFaceScreen() {
  const navigate = useNavigate()
  const { videoRef, isActive, start, stop, captureBlob } = useWebcam()
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null)
  const [name, setName] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [department, setDepartment] = useState('')
  const [role, setRole] = useState('USER')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleCapture = async () => {
    if (!videoRef.current) return
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth || 640
    canvas.height = videoRef.current.videoHeight || 480
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
    setCapturedImage(dataUrl)

    const blob = await captureBlob()
    setCapturedBlob(blob)
    stop()
  }

  const handleRetake = () => {
    setCapturedImage(null)
    setCapturedBlob(null)
    start()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!capturedBlob) {
      setError('Please capture a photo first')
      return
    }
    if (!name || !employeeId || !department) {
      setError('All fields are required')
      return
    }

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('image', capturedBlob, 'face.jpg')
      formData.append('name', name)
      formData.append('employeeId', employeeId)
      formData.append('department', department)
      formData.append('role', role)

      const { data } = await faceApi.register(formData)
      if (data.success) {
        setSuccess(true)
      } else {
        setError(data.message || 'Registration failed')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit registration')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] animate-fade-in">
        <Card className="w-full max-w-md text-center">
          <CardContent className="py-12">
            <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Registration Submitted!</h2>
            <p className="text-text-secondary mb-6">
              Your face registration request has been submitted for admin approval.
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
              <Button variant="outline" onClick={() => {
                setSuccess(false)
                setName('')
                setEmployeeId('')
                setDepartment('')
                setCapturedImage(null)
                setCapturedBlob(null)
              }}>
                Register Another
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const departments = [
    { value: 'Computer Science', label: 'Computer Science' },
    { value: 'Electrical Engineering', label: 'Electrical Engineering' },
    { value: 'Mechanical Engineering', label: 'Mechanical Engineering' },
    { value: 'Administration', label: 'Administration' },
    { value: 'Security', label: 'Security' },
    { value: 'Other', label: 'Other' },
  ]

  const roles = [
    { value: 'USER', label: 'User / Student' },
    { value: 'ADMIN', label: 'Admin' },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Register New Face</h1>
        <p className="text-text-secondary mt-1">Capture a photo and submit for registration</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Camera / Capture */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Camera className="w-5 h-5 text-accent" />
              Capture Photo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative bg-surface-light rounded-lg overflow-hidden aspect-video mb-4">
              {capturedImage ? (
                <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {!isActive && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <Camera className="w-12 h-12 text-text-secondary mx-auto mb-2 opacity-50" />
                        <p className="text-sm text-text-secondary">Camera not started</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex gap-3">
              {!capturedImage ? (
                <>
                  {!isActive ? (
                    <Button onClick={start} className="flex-1">
                      <Camera className="w-4 h-4 mr-2" /> Start Camera
                    </Button>
                  ) : (
                    <Button onClick={handleCapture} className="flex-1">
                      <Camera className="w-4 h-4 mr-2" /> Capture Photo
                    </Button>
                  )}
                </>
              ) : (
                <Button onClick={handleRetake} variant="outline" className="flex-1">
                  <RotateCcw className="w-4 h-4 mr-2" /> Retake
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Registration Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-accent" />
              Personal Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-danger/10 border border-danger/30 rounded-lg text-danger text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">Full Name</label>
                <Input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Enter full name"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">Employee / Student ID</label>
                <Input
                  value={employeeId}
                  onChange={e => setEmployeeId(e.target.value)}
                  placeholder="e.g., EMP010"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">Department</label>
                <Select
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                  options={departments}
                  placeholder="Select department"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">Role</label>
                <Select
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  options={roles}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading || !capturedImage}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Submitting...
                  </span>
                ) : (
                  <><UserPlus className="w-4 h-4 mr-2" /> Submit Registration</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
