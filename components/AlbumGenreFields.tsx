'use client'

import { useEffect, useState } from 'react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabaseClient'

interface GenreRow {
  id: string
  name: string
}

interface AlbumGenreFieldsProps {
  genre: string
  subgenre: string
  onGenreChange: (genre: string) => void
  onSubgenreChange: (subgenre: string) => void
  className?: string
}

export function AlbumGenreFields({
  genre,
  subgenre,
  onGenreChange,
  onSubgenreChange,
  className,
}: AlbumGenreFieldsProps) {
  const [genres, setGenres] = useState<GenreRow[]>([])
  const [subgenres, setSubgenres] = useState<string[]>([])
  const [loadingGenres, setLoadingGenres] = useState(true)

  useEffect(() => {
    async function loadGenres() {
      setLoadingGenres(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        let query = supabase.from('genres').select('id, name').order('name')
        if (user) {
          query = query.or(`user_id.eq.${user.id},is_public.eq.true,user_id.is.null`)
        } else {
          query = query.or('is_public.eq.true,user_id.is.null')
        }
        const { data, error } = await query
        if (!error) {
          setGenres(data || [])
        }
      } finally {
        setLoadingGenres(false)
      }
    }

    loadGenres()
  }, [])

  useEffect(() => {
    async function loadSubgenres() {
      if (!genre) {
        setSubgenres([])
        return
      }

      const { data, error } = await supabase
        .from('genre_subgenres')
        .select('subgenre')
        .eq('genre', genre)
        .order('subgenre')

      if (!error) {
        setSubgenres(data?.map((item) => item.subgenre) || [])
      }
    }

    loadSubgenres()
  }, [genre])

  return (
    <div className={className}>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Genre</Label>
          <Select
            value={genre || 'none'}
            onValueChange={(value) => {
              const nextGenre = value === 'none' ? '' : value
              onGenreChange(nextGenre)
              onSubgenreChange('')
            }}
            disabled={loadingGenres}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder={loadingGenres ? 'Loading genres...' : 'Select genre'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No genre</SelectItem>
              {genres.map((item) => (
                <SelectItem key={item.id} value={item.name}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Subgenre</Label>
          <Select
            value={subgenre || 'none'}
            onValueChange={(value) => onSubgenreChange(value === 'none' ? '' : value)}
            disabled={!genre || subgenres.length === 0}
          >
            <SelectTrigger className="mt-1">
              <SelectValue
                placeholder={
                  !genre
                    ? 'Select a genre first'
                    : subgenres.length === 0
                      ? 'No subgenres available'
                      : 'Select subgenre'
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No subgenre</SelectItem>
              {subgenres.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
