import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'

import { ProtectedRoute, AdminRoute } from '@/components/ProtectedRoute'
import Layout from '@/components/Layout'

import SplashScreen from '@/pages/SplashScreen'
import LoginScreen from '@/pages/LoginScreen'
import AdminDashboard from '@/pages/AdminDashboard'
import FaceRecognitionScreen from '@/pages/FaceRecognitionScreen'
import AddFaceScreen from '@/pages/AddFaceScreen'
import ApprovalPanel from '@/pages/ApprovalPanel'
import AttendanceLogs from '@/pages/AttendanceLogs'
import ProfileScreen from '@/pages/ProfileScreen'

export default function App() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#111827',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff',
          },
        }}
      />
      <Routes>
        {/* Public */}
        <Route path="/" element={<SplashScreen />} />
        <Route path="/login" element={<LoginScreen />} />

        {/* Protected – any authenticated user */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/recognition" element={<FaceRecognitionScreen />} />
            <Route path="/profile" element={<ProfileScreen />} />
            <Route path="/attendance" element={<AttendanceLogs />} />

            {/* Admin-only */}
            <Route element={<AdminRoute />}>
              <Route path="/dashboard" element={<AdminDashboard />} />
              <Route path="/add-face" element={<AddFaceScreen />} />
              <Route path="/approvals" element={<ApprovalPanel />} />
            </Route>
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
