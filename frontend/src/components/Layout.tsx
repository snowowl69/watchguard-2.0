import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { authApi, notificationsApi } from '@/api/client'
import { useQuery } from '@tanstack/react-query'
import { useSocket } from '@/hooks/useSocket'
import { useEffect, useState } from 'react'
import {
  Shield, LayoutDashboard, ScanFace, UserPlus, ClipboardCheck,
  FileText, User, LogOut, Bell, Menu, X
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default function Layout() {
  const { user, logout } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const { on } = useSocket()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const { data: notificationsData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list(),
    refetchInterval: 30000,
  })

  useEffect(() => {
    if (notificationsData?.data?.data) {
      const unread = notificationsData.data.data.filter((n: any) => !n.isRead).length
      setUnreadCount(unread)
    }
  }, [notificationsData])

  useEffect(() => {
    const unsub = on('notification:new', () => {
      setUnreadCount(c => c + 1)
    })
    return unsub
  }, [on])

  const handleLogout = async () => {
    try { await authApi.logout() } catch {}
    logout()
    navigate('/login')
  }

  const isAdmin = user?.role === 'ADMIN'

  const navItems = [
    ...(isAdmin ? [{ path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }] : []),
    { path: '/recognition', label: 'Face Recognition', icon: ScanFace },
    ...(isAdmin ? [{ path: '/add-face', label: 'Register Face', icon: UserPlus }] : []),
    ...(isAdmin ? [{ path: '/approvals', label: 'Approvals', icon: ClipboardCheck }] : []),
    { path: '/attendance', label: 'Attendance Logs', icon: FileText },
    { path: '/profile', label: 'Profile', icon: User },
  ]

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-surface border-r border-[#1f2937] transform transition-transform duration-200
        lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center gap-3 px-6 py-5 border-b border-[#1f2937]">
          <Shield className="w-8 h-8 text-accent" />
          <div>
            <h1 className="font-bold text-lg text-white">Watch Guard</h1>
            <p className="text-xs text-text-secondary">Security System</p>
          </div>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon
            const active = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-accent/10 text-accent border border-accent/20'
                    : 'text-text-secondary hover:bg-surface-light hover:text-text-primary'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[#1f2937]">
          <div className="flex items-center gap-3 mb-3 px-3">
            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-sm">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-text-secondary">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-text-secondary hover:bg-surface-light hover:text-danger transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="flex items-center justify-between px-6 py-4 bg-surface border-b border-[#1f2937]">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-surface-light"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-4">
            <button
              onClick={async () => {
                try { await notificationsApi.markAllRead(); setUnreadCount(0) } catch {}
              }}
              className="relative p-2 rounded-lg hover:bg-surface-light transition-colors"
              title="Mark all notifications as read"
            >
              <Bell className="w-5 h-5 text-text-secondary" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            <div className="flex items-center gap-2">
              <Badge variant={isAdmin ? 'warning' : 'default'}>
                {user?.role}
              </Badge>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
