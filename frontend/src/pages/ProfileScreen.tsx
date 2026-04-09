import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi, attendanceApi, faceApi, usersApi } from '@/api/client'
import { useAuthStore } from '@/store/authStore'
import { useWebcam } from '@/hooks/useWebcam'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  User, Mail, Building2, IdCard, Shield, Camera,
  Clock, Save, RefreshCw, CheckCircle
} from 'lucide-react'
import { format } from 'date-fns'
import type { AttendanceLog } from '@/types'

export default function ProfileScreen() {
  const { user, setUser } = useAuthStore()
  const queryClient = useQueryClient()

  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(user?.name || '')
  const [editDepartment, setEditDepartment] = useState(user?.department || '')

  const [showReRegister, setShowReRegister] = useState(false)
  const [reRegisterDone, setReRegisterDone] = useState(false)
  const { videoRef, isActive: isStreaming, start: startCamera, stop: stopCamera, captureBlob } = useWebcam()

  // Recent attendance
  const { data: historyData } = useQuery({
    queryKey: ['profile-history', user?.id],
    queryFn: () => attendanceApi.history(user!.id, { limit: '5' }),
    enabled: !!user?.id,
  })

  const recentLogs: AttendanceLog[] = historyData?.data?.data?.logs || []

  // Save profile
  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await usersApi.update(user!.id, { name: editName, department: editDepartment })
      return res.data
    },
    onSuccess: (data: any) => {
      if (data?.data) setUser(data.data)
      setIsEditing(false)
    },
  })

  // Re-register face
  const reRegisterMutation = useMutation({
    mutationFn: async () => {
      const blob = await captureBlob()
      if (!blob) throw new Error('Failed to capture image')
      const formData = new FormData()
      formData.append('image', blob, 'face.jpg')
      formData.append('name', user!.name)
      formData.append('employeeId', user!.employeeId)
      formData.append('department', user!.department)
      formData.append('role', user!.role)
      return faceApi.register(formData)
    },
    onSuccess: () => {
      setReRegisterDone(true)
      stopCamera()
      setTimeout(() => {
        setShowReRegister(false)
        setReRegisterDone(false)
      }, 3000)
    },
  })

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?'

  const roleBadgeVariant = user?.role === 'ADMIN' ? 'default' : 'outline'

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">My Profile</h1>
        <p className="text-text-secondary mt-1">Manage your account details</p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-accent to-blue-400 flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-accent/20">
              {initials}
            </div>

            {/* Info */}
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-xl font-bold text-white">{user?.name}</h2>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
                <Badge variant={roleBadgeVariant as any}>
                  <Shield className="w-3 h-3 mr-1" />
                  {user?.role}
                </Badge>
                <Badge variant={user?.status === 'ACTIVE' ? 'success' : 'danger'}>
                  {user?.status}
                </Badge>
              </div>
              <p className="text-text-secondary text-sm mt-2">
                Member since {user?.createdAt ? format(new Date(user.createdAt), 'MMMM yyyy') : '—'}
              </p>
            </div>

            {/* Edit Toggle */}
            <div>
              {isEditing ? (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending}
                  >
                    <Save className="w-4 h-4 mr-1" />
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
                  Edit Profile
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-text-secondary flex items-center gap-2">
              <User className="w-4 h-4" /> Full Name
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {isEditing ? (
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            ) : (
              <p className="text-white font-medium">{user?.name}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-text-secondary flex items-center gap-2">
              <Mail className="w-4 h-4" /> Email
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-white font-medium">{user?.email}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-text-secondary flex items-center gap-2">
              <IdCard className="w-4 h-4" /> Employee ID
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-white font-mono">{user?.employeeId}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-text-secondary flex items-center gap-2">
              <Building2 className="w-4 h-4" /> Department
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {isEditing ? (
              <Input value={editDepartment} onChange={(e) => setEditDepartment(e.target.value)} />
            ) : (
              <p className="text-white font-medium">{user?.department}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Re-register Face */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-white flex items-center gap-2">
            <Camera className="w-4 h-4 text-accent" /> Face Registration
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!showReRegister ? (
            <div className="flex items-center justify-between">
              <p className="text-text-secondary text-sm">
                Update your facial recognition data for more accurate detection.
              </p>
              <Button size="sm" variant="ghost" onClick={() => setShowReRegister(true)}>
                <RefreshCw className="w-4 h-4 mr-1" />
                Re-register Face
              </Button>
            </div>
          ) : reRegisterDone ? (
            <div className="text-center py-6">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-white font-medium">Face Re-registered Successfully!</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-surface-light rounded-lg overflow-hidden aspect-video max-w-sm mx-auto">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover mirror"
                  style={{ transform: 'scaleX(-1)' }}
                />
              </div>
              <div className="flex justify-center gap-3">
                {!isStreaming ? (
                  <Button size="sm" onClick={startCamera}>
                    <Camera className="w-4 h-4 mr-1" />
                    Open Camera
                  </Button>
                ) : (
                  <>
                    <Button
                      size="sm"
                      onClick={() => reRegisterMutation.mutate()}
                      disabled={reRegisterMutation.isPending}
                    >
                      {reRegisterMutation.isPending ? 'Submitting...' : 'Capture & Submit'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { stopCamera(); setShowReRegister(false) }}
                    >
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Attendance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-accent" /> Recent Attendance
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recentLogs.length === 0 ? (
            <div className="p-6 text-center text-text-secondary text-sm">
              No attendance records yet.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between px-6 py-3">
                  <div>
                    <p className="text-white text-sm font-medium">
                      {format(new Date(log.entryTime), 'EEEE, MMM dd')}
                    </p>
                    <p className="text-text-secondary text-xs">
                      In: {format(new Date(log.entryTime), 'hh:mm a')}
                      {log.exitTime && ` • Out: ${format(new Date(log.exitTime), 'hh:mm a')}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-text-secondary font-mono">
                      {(log.confidence * 100).toFixed(1)}%
                    </span>
                    <Badge variant={
                      log.status === 'AUTHORIZED' ? 'success' : 'danger'
                    }>
                      {log.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
