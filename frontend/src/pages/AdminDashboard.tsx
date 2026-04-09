import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useSocket } from '@/hooks/useSocket'
import { attendanceApi, camerasApi } from '@/api/client'
import { useAuthStore } from '@/store/authStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Users, ShieldCheck, ShieldX, Clock, ScanFace, UserPlus, FileText, Camera, Activity
} from 'lucide-react'
import type { AttendanceStats } from '@/types'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { on } = useSocket()

  const [stats, setStats] = useState<AttendanceStats>({
    presentToday: 0, totalToday: 0, authorized: 0, denied: 0, peakHour: '09:00'
  })
  const [lastDetection, setLastDetection] = useState<any>(null)

  const { data: statsData } = useQuery({
    queryKey: ['attendance-stats'],
    queryFn: () => attendanceApi.stats(),
    refetchInterval: 15000,
  })

  const { data: camerasData } = useQuery({
    queryKey: ['cameras'],
    queryFn: () => camerasApi.list(),
  })

  useEffect(() => {
    if (statsData?.data?.data) {
      setStats(statsData.data.data)
    }
  }, [statsData])

  // Listen for real-time stats
  useEffect(() => {
    const unsub1 = on('attendance:update', (data: any) => {
      if (data.stats) setStats(data.stats)
    })
    const unsub2 = on('face:detected', (data: any) => {
      setLastDetection(data)
    })
    return () => { unsub1(); unsub2() }
  }, [on])

  const statCards = [
    { label: 'Present Today', value: stats.presentToday, icon: Users, color: 'text-accent' },
    { label: 'Authorized', value: stats.authorized, icon: ShieldCheck, color: 'text-success' },
    { label: 'Denied', value: stats.denied, icon: ShieldX, color: 'text-danger' },
    { label: 'Peak Hour', value: stats.peakHour, icon: Clock, color: 'text-warning' },
  ]

  const cameras = camerasData?.data?.data || []

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-text-secondary mt-1">Welcome back, {user?.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-success animate-pulse" />
          <span className="text-sm text-success">System Online</span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(card => {
          const Icon = card.icon
          return (
            <Card key={card.label} className="hover:border-accent/30 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-secondary">{card.label}</p>
                    <p className="text-3xl font-bold text-white mt-1">{card.value}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-lg bg-surface-light flex items-center justify-center ${card.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Live Camera + Detection */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Camera Feed */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Camera className="w-5 h-5 text-accent" />
                Live Camera Feeds
              </CardTitle>
              <Badge variant="success">
                <span className="w-2 h-2 bg-success rounded-full mr-1 animate-pulse" />
                Live
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cameras.length > 0 ? cameras.slice(0, 4).map((cam: any) => (
                <div key={cam.id} className="relative bg-surface-light rounded-lg overflow-hidden aspect-video">
                  <div className="absolute inset-0 flex items-center justify-center text-text-secondary">
                    <div className="text-center">
                      <Camera className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">{cam.name}</p>
                      <p className="text-xs text-text-secondary">{cam.location}</p>
                    </div>
                  </div>
                  {/* Scan overlay */}
                  <div className="scan-overlay">
                    <div className="scan-line" />
                  </div>
                  <div className="absolute bottom-2 left-2">
                    <Badge variant={cam.isActive ? 'success' : 'danger'} className="text-[10px]">
                      {cam.isActive ? 'ACTIVE' : 'OFFLINE'}
                    </Badge>
                  </div>
                </div>
              )) : (
                <div className="col-span-2 text-center py-12 text-text-secondary">
                  <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No cameras configured</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Last Detection Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ScanFace className="w-5 h-5 text-accent" />
              Last Detection
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lastDetection ? (
              <div className="space-y-4">
                <div className="w-20 h-20 mx-auto rounded-full bg-surface-light flex items-center justify-center">
                  <span className="text-3xl font-bold text-accent">
                    {lastDetection.name?.charAt(0) || '?'}
                  </span>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-white text-lg">{lastDetection.name || 'Unknown'}</p>
                  <Badge variant={lastDetection.status === 'AUTHORIZED' ? 'success' : 'danger'} className="mt-1">
                    {lastDetection.status}
                  </Badge>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Confidence</span>
                    <span className="text-white">{((lastDetection.confidence || 0) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="confidence-bar">
                    <div
                      className="confidence-fill"
                      style={{
                        width: `${(lastDetection.confidence || 0) * 100}%`,
                        backgroundColor: lastDetection.status === 'AUTHORIZED' ? '#22c55e' : '#ef4444',
                      }}
                    />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Time</span>
                    <span className="text-white">
                      {new Date(lastDetection.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-text-secondary">
                <ScanFace className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No detections yet</p>
                <p className="text-xs mt-1">Start scanning to see results</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Button
          onClick={() => navigate('/recognition')}
          className="h-auto py-4 flex flex-col items-center gap-2"
        >
          <ScanFace className="w-6 h-6" />
          <span>Face Recognition</span>
        </Button>
        <Button
          onClick={() => navigate('/add-face')}
          variant="outline"
          className="h-auto py-4 flex flex-col items-center gap-2"
        >
          <UserPlus className="w-6 h-6" />
          <span>Register New Face</span>
        </Button>
        <Button
          onClick={() => navigate('/attendance')}
          variant="outline"
          className="h-auto py-4 flex flex-col items-center gap-2"
        >
          <FileText className="w-6 h-6" />
          <span>View Attendance Logs</span>
        </Button>
      </div>
    </div>
  )
}
