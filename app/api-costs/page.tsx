'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, DollarSign, Sparkles, ImageIcon, Type, Music2 } from 'lucide-react'

type ActionCost = {
  action_key: string
  credits_cost: number
  description: string | null
  estimated_usd: number
  model: string | null
  models: string[]
  provider: string | null
  model_note: string | null
}

type UsageBucket = { count: number; credits: number; estimated_usd: number }

type RecentRow = {
  id: string
  type: string
  credits: number
  estimated_usd: number
  model: string | null
  user_id: string
  username: string | null
  email: string | null
  reference_id: string | null
  created_at: string
}

type ConfiguredModels = {
  openai_model: string
  openai_chat_resolved: string
  openai_vision_resolved: string
  image_model: string
  anthropic_model: string
  elevenlabs_music_model: string
}

type ApiCostsResponse = {
  usd_per_credit: number
  days: number
  configuredModels: ConfiguredModels
  actionCosts: ActionCost[]
  usage: {
    byAction: Record<string, UsageBucket>
    totals: UsageBucket
  }
  recent: RecentRow[]
  notes: string[]
}

const ACTION_LABELS: Record<string, { label: string; icon: typeof Sparkles }> = {
  ai_cover: { label: 'AI Cover Art', icon: ImageIcon },
  ai_lyrics: { label: 'AI Lyrics', icon: Sparkles },
  ai_album_titles: { label: 'AI Album Titles', icon: Type },
}

function formatUsd(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value)
}

function formatDate(value: string) {
  return new Date(value).toLocaleString()
}

export default function ApiCostsPage() {
  const { user, isLoading: authLoading, getAccessToken } = useAuth()
  const router = useRouter()
  const [days, setDays] = useState('30')
  const [data, setData] = useState<ApiCostsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isAdminOrCEO = user && (user.role === 'admin' || user.role === 'ceo')

  useEffect(() => {
    if (!authLoading && (!user || !isAdminOrCEO)) {
      router.push('/login')
    }
  }, [user, authLoading, router, isAdminOrCEO])

  useEffect(() => {
    if (!user || !isAdminOrCEO) return

    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        setError(null)
        const token = await getAccessToken()
        if (!token) {
          throw new Error('Missing auth token')
        }

        const res = await fetch(`/api/api-costs?days=${days}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const json = await res.json()
        if (!res.ok) {
          throw new Error(json.error || 'Failed to load API costs')
        }
        if (!cancelled) setData(json)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load API costs')
          setData(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [user, isAdminOrCEO, days, getAccessToken])

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#141414] text-white">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isAdminOrCEO) return null

  return (
    <div className="min-h-screen bg-[#141414] text-white">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
              <DollarSign className="h-8 w-8" />
              API Costs
            </h1>
            <p className="text-gray-400 mt-1">
              Estimated provider cost per generation and platform usage. Admin / CEO only.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger className="w-[160px] bg-black border-zinc-700">
                <SelectValue placeholder="Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" asChild>
              <Link href="/credits">Credits</Link>
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : data ? (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-black border-primary/40">
                <CardHeader className="pb-2">
                  <CardDescription>Generations ({days}d)</CardDescription>
                  <CardTitle className="text-3xl text-primary">{data.usage.totals.count}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="bg-black border-primary/40">
                <CardHeader className="pb-2">
                  <CardDescription>Credits used</CardDescription>
                  <CardTitle className="text-3xl text-primary">{data.usage.totals.credits}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="bg-black border-primary/40">
                <CardHeader className="pb-2">
                  <CardDescription>Estimated API cost</CardDescription>
                  <CardTitle className="text-3xl text-primary">
                    {formatUsd(data.usage.totals.estimated_usd)}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            <Card className="bg-black border-zinc-800">
              <CardHeader>
                <CardTitle>Configured models</CardTitle>
                <CardDescription>
                  Current platform models from{' '}
                  <Link href="/ai-settings" className="text-primary hover:underline">
                    /ai-settings
                  </Link>
                  . Change them there to update generation.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                <div className="rounded-lg border border-zinc-800 p-3">
                  <div className="text-gray-400">OpenAI chat (lyrics)</div>
                  <div className="font-mono text-primary mt-1">{data.configuredModels.openai_chat_resolved}</div>
                  {data.configuredModels.openai_model !== data.configuredModels.openai_chat_resolved && (
                    <div className="text-xs text-gray-500 mt-1">
                      stored: {data.configuredModels.openai_model}
                    </div>
                  )}
                </div>
                <div className="rounded-lg border border-zinc-800 p-3">
                  <div className="text-gray-400">OpenAI vision (titles)</div>
                  <div className="font-mono text-primary mt-1">{data.configuredModels.openai_vision_resolved}</div>
                </div>
                <div className="rounded-lg border border-zinc-800 p-3">
                  <div className="text-gray-400">Cover image model</div>
                  <div className="font-mono text-primary mt-1">{data.configuredModels.image_model}</div>
                </div>
                <div className="rounded-lg border border-zinc-800 p-3">
                  <div className="text-gray-400">Anthropic</div>
                  <div className="font-mono text-primary mt-1">{data.configuredModels.anthropic_model}</div>
                </div>
                <div className="rounded-lg border border-zinc-800 p-3">
                  <div className="text-gray-400">ElevenLabs music</div>
                  <div className="font-mono text-primary mt-1">{data.configuredModels.elevenlabs_music_model}</div>
                  <div className="text-xs text-gray-500 mt-1">Not on credits ledger yet</div>
                </div>
              </CardContent>
            </Card>

            <div>
              <h2 className="text-xl font-semibold mb-3">Cost per generation</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {data.actionCosts.map((action) => {
                  const meta = ACTION_LABELS[action.action_key] || {
                    label: action.action_key,
                    icon: Sparkles,
                  }
                  const Icon = meta.icon
                  const usage = data.usage.byAction[action.action_key]
                  return (
                    <Card key={action.action_key} className="bg-black border-zinc-800">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Icon className="h-5 w-5 text-primary" />
                          {meta.label}
                        </CardTitle>
                        <CardDescription>{action.description || action.action_key}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between gap-3">
                          <span className="text-gray-400 shrink-0">Model</span>
                          <span className="font-mono text-right text-primary">
                            {action.model || '—'}
                          </span>
                        </div>
                        {action.models.length > 1 && (
                          <div className="flex justify-between gap-3">
                            <span className="text-gray-400 shrink-0">Also</span>
                            <span className="font-mono text-right text-gray-300 text-xs">
                              {action.models.slice(1).join(', ')}
                            </span>
                          </div>
                        )}
                        {action.provider && (
                          <div className="flex justify-between gap-3">
                            <span className="text-gray-400 shrink-0">Provider</span>
                            <span className="text-right">{action.provider}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-400">Credits charged</span>
                          <span>{action.credits_cost}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Est. provider cost</span>
                          <span className="text-primary font-semibold">
                            {formatUsd(action.estimated_usd)}
                          </span>
                        </div>
                        {action.model_note && (
                          <p className="text-xs text-gray-500 pt-1">{action.model_note}</p>
                        )}
                        {usage && (
                          <div className="pt-2 border-t border-zinc-800 space-y-1">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Uses ({days}d)</span>
                              <span>{usage.count}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Spend ({days}d)</span>
                              <span>{formatUsd(usage.estimated_usd)}</span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>

            <Card className="bg-black border-zinc-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Music2 className="h-5 w-5 text-primary" />
                  Not tracked in credits yet
                </CardTitle>
                <CardDescription>
                  ElevenLabs instrumental / music generation uses model{' '}
                  <span className="font-mono text-primary">{data.configuredModels.elevenlabs_music_model}</span>
                  {' '}and does not deduct platform credits, so it will not show in usage below.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-black border-zinc-800">
              <CardHeader>
                <CardTitle>Recent generations</CardTitle>
                <CardDescription>
                  Latest credit deductions for AI actions in the selected range.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data.recent.length === 0 ? (
                  <p className="text-gray-400 text-sm">No AI credit usage in this range.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-zinc-800 text-left text-gray-400">
                          <th className="py-2 pr-4 font-medium">When</th>
                          <th className="py-2 pr-4 font-medium">Action</th>
                          <th className="py-2 pr-4 font-medium">Model</th>
                          <th className="py-2 pr-4 font-medium">User</th>
                          <th className="py-2 pr-4 font-medium">Credits</th>
                          <th className="py-2 font-medium">Est. cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.recent.map((row) => (
                          <tr key={row.id} className="border-b border-zinc-900">
                            <td className="py-2 pr-4 whitespace-nowrap text-gray-300">
                              {formatDate(row.created_at)}
                            </td>
                            <td className="py-2 pr-4">
                              {ACTION_LABELS[row.type]?.label || row.type}
                            </td>
                            <td className="py-2 pr-4 font-mono text-xs text-primary">
                              {row.model || '—'}
                            </td>
                            <td className="py-2 pr-4">
                              <div>{row.username || '—'}</div>
                              <div className="text-xs text-gray-500">{row.email || row.user_id}</div>
                            </td>
                            <td className="py-2 pr-4">{row.credits}</td>
                            <td className="py-2 text-primary">{formatUsd(row.estimated_usd)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="text-xs text-gray-500 space-y-1">
              {data.notes.map((note) => (
                <p key={note}>• {note}</p>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
