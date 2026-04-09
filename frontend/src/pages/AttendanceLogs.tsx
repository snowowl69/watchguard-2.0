import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { attendanceApi } from '@/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import {
  Search, Download, ChevronLeft, ChevronRight, Clock,
  FileSpreadsheet
} from 'lucide-react'
import { format } from 'date-fns'
import type { AttendanceLog, Pagination } from '@/types'

export default function AttendanceLogs() {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [status, setStatus] = useState('')
  const [isExporting, setIsExporting] = useState(false)

  // Debounced search (300ms)
  const debounceTimer = useMemo(() => {
    let timer: ReturnType<typeof setTimeout>
    return (value: string) => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        setDebouncedSearch(value)
        setPage(1)
      }, 300)
    }
  }, [])

  const handleSearch = (value: string) => {
    setSearch(value)
    debounceTimer(value)
  }

  const { data, isLoading } = useQuery({
    queryKey: ['attendance', page, limit, debouncedSearch, dateFrom, dateTo, status],
    queryFn: () =>
      attendanceApi.list({
        page: String(page),
        limit: String(limit),
        search: debouncedSearch || undefined,
        startDate: dateFrom || undefined,
        endDate: dateTo || undefined,
        status: status || undefined,
      } as Record<string, string>),
  })

  const logs: AttendanceLog[] = data?.data?.data?.logs || []
  const pagination: Pagination | undefined = data?.data?.data?.pagination

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const res = await attendanceApi.export({
        search: debouncedSearch || undefined,
        startDate: dateFrom || undefined,
        endDate: dateTo || undefined,
        status: status || undefined,
      } as Record<string, string>)
      const blob = new Blob([res.data], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `attendance_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export failed', err)
    } finally {
      setIsExporting(false)
    }
  }

  const statusColor = (s: string) => {
    switch (s) {
      case 'AUTHORIZED': return 'success'
      case 'DENIED': return 'danger'
      default: return 'outline'
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Attendance Logs</h1>
          <p className="text-text-secondary mt-1">
            {pagination ? `${pagination.total} total records` : 'Loading...'}
          </p>
        </div>
        <Button onClick={handleExport} disabled={isExporting} size="sm">
          {isExporting ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search */}
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <Input
                placeholder="Search name or ID..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Date From */}
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
              className="text-text-secondary"
            />

            {/* Date To */}
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
              className="text-text-secondary"
            />

            {/* Status Filter */}
            <Select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1) }}
            >
              <option value="">All Status</option>
              <option value="AUTHORIZED">Authorized</option>
              <option value="DENIED">Denied</option>
            </Select>

            {/* Page Size */}
            <Select
              value={String(limit)}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1) }}
            >
              <option value="10">10 / page</option>
              <option value="20">20 / page</option>
              <option value="50">50 / page</option>
              <option value="100">100 / page</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 text-text-secondary font-medium">Name</th>
                  <th className="text-left p-4 text-text-secondary font-medium">Employee ID</th>
                  <th className="text-left p-4 text-text-secondary font-medium">Date</th>
                  <th className="text-left p-4 text-text-secondary font-medium">Time In</th>
                  <th className="text-left p-4 text-text-secondary font-medium">Time Out</th>
                  <th className="text-left p-4 text-text-secondary font-medium">Confidence</th>
                  <th className="text-left p-4 text-text-secondary font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-text-secondary">
                      <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin mx-auto mb-2" />
                      Loading records...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center">
                      <FileSpreadsheet className="w-12 h-12 text-text-secondary mx-auto mb-3 opacity-50" />
                      <p className="text-text-secondary font-medium">No records found</p>
                      <p className="text-text-secondary text-xs mt-1">Try adjusting your filters</p>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-border/50 hover:bg-surface-light/50 transition-colors"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent font-semibold text-xs">
                            {log.user?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || '?'}
                          </div>
                          <span className="text-white font-medium">{log.user?.name || 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="p-4 text-text-secondary font-mono text-xs">
                        {log.user?.employeeId || '—'}
                      </td>
                      <td className="p-4 text-text-secondary">
                        {format(new Date(log.entryTime), 'MMM dd, yyyy')}
                      </td>
                      <td className="p-4 text-white">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-accent" />
                          {format(new Date(log.entryTime), 'hh:mm a')}
                        </div>
                      </td>
                      <td className="p-4 text-text-secondary">
                        {log.exitTime
                          ? format(new Date(log.exitTime), 'hh:mm a')
                          : '—'
                        }
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-surface-light rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${(log.confidence * 100)}%`,
                                backgroundColor:
                                  log.confidence > 0.85 ? '#22c55e'
                                    : log.confidence > 0.7 ? '#f59e0b'
                                      : '#ef4444',
                              }}
                            />
                          </div>
                          <span className="text-xs text-text-secondary font-mono">
                            {(log.confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant={statusColor(log.status) as any}>
                          {log.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-border">
              <p className="text-sm text-text-secondary">
                Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, pagination.total)} of {pagination.total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Prev
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                    let pageNum: number
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1
                    } else if (page <= 3) {
                      pageNum = i + 1
                    } else if (page >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i
                    } else {
                      pageNum = page - 2 + i
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                          pageNum === page
                            ? 'bg-accent text-white'
                            : 'text-text-secondary hover:bg-surface-light'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page >= (pagination.totalPages || 1)}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
