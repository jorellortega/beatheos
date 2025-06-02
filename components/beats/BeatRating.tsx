"use client"

import { useState, useEffect } from 'react'
import { Star } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabaseClient'
import { toast } from 'sonner'

interface BeatRatingProps {
  beatId: string
  initialAverageRating?: number
  initialTotalRatings?: number
}

export function BeatRating({
  beatId,
  initialAverageRating = 0,
  initialTotalRatings = 0
}: BeatRatingProps) {
  const [averageRating, setAverageRating] = useState(initialAverageRating)
  const [totalRatings, setTotalRatings] = useState(initialTotalRatings)
  const [hoveredRating, setHoveredRating] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Sync state with props when they change
  useEffect(() => {
    setAverageRating(initialAverageRating);
    setTotalRatings(initialTotalRatings);
  }, [initialAverageRating, initialTotalRatings]);

  const handleRatingClick = async (rating: number) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/beats/${beatId}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rating })
      })
      if (!response.ok) {
        throw new Error('Failed to save rating')
      }
      const data = await response.json()
      setAverageRating(data.averageRating)
      setTotalRatings(data.totalRatings)
      toast.success('Rating saved successfully')
    } catch (error) {
      console.error('Error saving rating:', error)
      toast.error('Failed to save rating')
    } finally {
      setIsLoading(false)
    }
  }

  const displayRating = hoveredRating || averageRating

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