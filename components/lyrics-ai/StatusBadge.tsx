"use client"

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { ChevronDown } from 'lucide-react'

interface StatusBadgeProps {
  status: string
  onStatusChange: (newStatus: string) => void
  className?: string
}

const statusOptions = [
  { value: 'draft', label: 'Draft', color: 'bg-gray-500' },
  { value: 'in-progress', label: 'In Progress', color: 'bg-blue-500' },
  { value: 'review', label: 'Review', color: 'bg-yellow-500' },
  { value: 'completed', label: 'Completed', color: 'bg-green-500' },
  { value: 'archived', label: 'Archived', color: 'bg-gray-400' }
]

const getStatusInfo = (status: string) => {
  return statusOptions.find(option => option.value === status) || statusOptions[0]
}

export function StatusBadge({ status, onStatusChange, className = '' }: StatusBadgeProps) {
  const [isOpen, setIsOpen] = useState(false)
  const currentStatus = getStatusInfo(status)

  const handleStatusChange = (newStatus: string) => {
    onStatusChange(newStatus)
    setIsOpen(false)
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Badge 
          className={`cursor-pointer hover:opacity-80 transition-opacity ${currentStatus.color} text-white ${className}`}
        >
          {currentStatus.label}
          <ChevronDown className="ml-1 h-3 w-3" />
        </Badge>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-40">
        {statusOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => handleStatusChange(option.value)}
            className="cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${option.color}`} />
              {option.label}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
