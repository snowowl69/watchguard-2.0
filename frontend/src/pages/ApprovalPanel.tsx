import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSocket } from '@/hooks/useSocket'
import { approvalsApi } from '@/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ClipboardCheck, Check, X, Clock, User } from 'lucide-react'
import type { FaceRequest } from '@/types'

const API_URL = import.meta.env.VITE_API_URL || '/api'

export default function ApprovalPanel() {
  const queryClient = useQueryClient()
  const { on } = useSocket()

  const { data, isLoading } = useQuery({
    queryKey: ['approvals'],
    queryFn: () => approvalsApi.list(),
  })

  // Listen for new requests via socket
  useEffect(() => {
    const unsub = on('approval:new', () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] })
    })
    return unsub
  }, [on, queryClient])

  const approveMutation = useMutation({
    mutationFn: (id: string) => approvalsApi.approve(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['approvals'] }),
  })

  const rejectMutation = useMutation({
    mutationFn: (id: string) => approvalsApi.reject(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['approvals'] }),
  })

  const requests: FaceRequest[] = data?.data?.data || []

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Approval Panel</h1>
          <p className="text-text-secondary mt-1">Review and approve face registration requests</p>
        </div>
        <Badge variant="warning">
          {requests.length} Pending
        </Badge>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-text-secondary">Loading requests...</p>
        </div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <ClipboardCheck className="w-16 h-16 text-text-secondary mx-auto mb-4 opacity-50" />
            <h2 className="text-lg font-semibold text-white mb-1">All Clear!</h2>
            <p className="text-text-secondary">No pending face registration requests.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {requests.map(request => (
            <Card key={request.id} className="hover:border-accent/30 transition-colors">
              <CardContent className="p-5">
                {/* Preview Image */}
                <div className="bg-surface-light rounded-lg overflow-hidden aspect-square mb-4">
                  <img
                    src={`${API_URL.replace('/api', '')}${request.imagePath}`}
                    alt={request.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = ''
                      ;(e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                </div>

                {/* Details */}
                <div className="space-y-2 mb-4">
                  <h3 className="font-semibold text-white text-lg">{request.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-text-secondary">
                    <User className="w-3.5 h-3.5" />
                    <span>{request.employeeId}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-text-secondary">
                    <span className="font-medium">Dept:</span>
                    <span>{request.department}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-text-secondary">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{new Date(request.submittedAt).toLocaleString()}</span>
                  </div>
                  <Badge variant="outline">{request.role}</Badge>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => approveMutation.mutate(request.id)}
                    variant="success"
                    size="sm"
                    className="flex-1"
                    disabled={approveMutation.isPending}
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => rejectMutation.mutate(request.id)}
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    disabled={rejectMutation.isPending}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
