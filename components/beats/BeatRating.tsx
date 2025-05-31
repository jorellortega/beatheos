"use client"

import { useState, useEffect } from 'react'
import { Star } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabaseClient'
import { toast } from 'sonner'

interface BeatRatingProps {
  beatId: string
  initialUserRating?: number | null
  initialAverageRating?: number
  initialTotalRatings?: number
}

export function BeatRating({
  beatId,
  initialUserRating = null,
  initialAverageRating = 0,
  initialTotalRatings = 0
}: BeatRatingProps) {
  const { user } = useAuth()
  const [userRating, setUserRating] = useState<number | null>(initialUserRating)
  const [averageRating, setAverageRating] = useState(initialAverageRating)
  const [totalRatings, setTotalRatings] = useState(initialTotalRatings)
  const [hoveredRating, setHoveredRating] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleRatingClick = async (rating: number) => {
    if (!user) {
      toast.error('Please log in to rate beats')
      return
    }

    setIsLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('Please log in to rate beats')
        return
      }

      const response = await fetch(`/api/beats/${beatId}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ rating })
      })

      if (!response.ok) {
        throw new Error('Failed to save rating')
      }

      const data = await response.json()
      setUserRating(rating)
      setAverageRating(data.averageRating)
      toast.success('Rating saved successfully')
    } catch (error) {
      console.error('Error saving rating:', error)
      toast.error('Failed to save rating')
    } finally {
      setIsLoading(false)
    }
  }

  const displayRating = hoveredRating || userRating || averageRating

  return (
    <div className="flex flex-col items-center space-y-2">
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            onClick={() => handleRatingClick(rating)}
            onMouseEnter={() => setHoveredRating(rating)}
            onMouseLeave={() => setHoveredRating(null)}
            disabled={isLoading}
            className="focus:outline-none"
          >
            <Star
              className={`h-6 w-6 transition-colors ${
                rating <= displayRating
                  ? 'text-yellow-400 fill-yellow-400'
                  : 'text-gray-400'
              }`}
            />
          </button>
        ))}
      </div>
      <div className="text-sm text-gray-400">
        {totalRatings > 0 ? (
          <>
            {averageRating.toFixed(1)} average rating ({totalRatings} {totalRatings === 1 ? 'rating' : 'ratings'})
          </>
        ) : (
          'No ratings yet'
        )}
      </div>
    </div>
  )
} 