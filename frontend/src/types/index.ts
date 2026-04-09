export interface User {
  id: string
  name: string
  employeeId: string
  email: string
  role: 'ADMIN' | 'USER'
  department: string
  faceImagePath?: string
  status: 'ACTIVE' | 'PENDING' | 'REJECTED'
  createdAt: string
  updatedAt: string
}

export interface AttendanceLog {
  id: string
  userId: string
  entryTime: string
  exitTime?: string
  confidence: number
  status: 'AUTHORIZED' | 'DENIED'
  cameraId?: string
  createdAt: string
  user?: {
    name: string
    employeeId: string
    department: string
    faceImagePath?: string
  }
  camera?: {
    name: string
    location: string
  }
}

export interface FaceRequest {
  id: string
  name: string
  employeeId: string
  department: string
  role: 'ADMIN' | 'USER'
  imagePath: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  submittedAt: string
  reviewedBy?: string
  reviewedAt?: string
}

export interface Camera {
  id: string
  name: string
  location: string
  streamUrl: string
  isActive: boolean
}

export interface Notification {
  id: string
  message: string
  type: 'INFO' | 'WARNING' | 'DANGER'
  isRead: boolean
  createdAt: string
  userId: string
}

export interface AttendanceStats {
  presentToday: number
  totalToday: number
  authorized: number
  denied: number
  peakHour: string
}

export interface RecognitionResult {
  matched: boolean
  user?: {
    id: string
    name: string
    employeeId: string
    department: string
  }
  confidence: number
  status: 'AUTHORIZED' | 'DENIED'
  boundingBox?: { x: number; y: number; w: number; h: number }
  reason?: string
  logId?: string
}

export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface ApiResponse<T = any> {
  success: boolean
  message?: string
  data?: T
}
