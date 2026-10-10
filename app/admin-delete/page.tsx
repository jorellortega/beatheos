'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type UserRow = {
  id: string
  email: string
  username: string | null
  role: string | null
  created_at: string
  albums: number
  generated_songs: number
  lyrics_sessions: number
  storage_bytes: number
  storage_files: number
  storage_label: string
}

type Totals = {
  bytes: number
  label: string
  files: number
  unassigned_bytes: number
  unassigned_files: number
  unassigned_label: string
}

export default function AdminDeletePage() {
  const [secret, setSecret] = useState('')
  const [users, setUsers] = useState<UserRow[]>([])
  const [totals, setTotals] = useState<Totals | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirmEmail, setConfirmEmail] = useState<Record<string, string>>({})

  async function call(action: string, extra: Record<string, string> = {}) {
    setLoading(true)
    setError(null)
    setStatus(null)
    try {
      const res = await fetch('/api/admin-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret, action, ...extra }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Request failed')
      return json
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Request failed'
      setError(message)
      return null
    } finally {
      setLoading(false)
    }
  }

  async function loadUsers() {
    const json = await call('list')
    if (!json) return
    setUsers(json.users || [])
    setTotals(json.totals || null)
    setStatus(json.note || `Loaded ${json.users?.length || 0} users`)
  }

  async function previewStorage(userId: string) {
    const json = await call('preview-storage', { userId })
    if (!json) return
    setStatus(
      `${json.user?.email}: ${json.fileCount} files · ${json.label || '0 B'}` +
        (json.files?.length ? `\n${json.files.slice(0, 20).join('\n')}` : '')
    )
  }

  async function deleteStorage(userId: string) {
    if (!window.confirm('Delete this user’s files in Storage? This cannot be undone.')) return
    const json = await call('delete-storage', { userId })
    if (!json) return
    setStatus(`Removed ${json.removed} of ${json.attempted} files for ${json.user?.email}`)
  }

  async function deleteUser(user: UserRow) {
    const typed = (confirmEmail[user.id] || '').trim()
    if (typed.toLowerCase() !== user.email.toLowerCase()) {
      setError('Type the user email in the confirm box first')
      return
    }
    if (!window.confirm(`Permanently delete ${user.email} files AND database rows?`)) return
    const json = await call('delete-user', { userId: user.id, confirmEmail: typed })
    if (!json) return
    setStatus(
      `Deleted ${json.user?.email}. Files removed: ${json.removedFiles}. DB: ${JSON.stringify(json.database)}`
    )
    await loadUsers()
  }

  return (
    <div className="min-h-screen bg-[#141414] text-white p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <Card className="bg-black border-red-900">
          <CardHeader>
            <CardTitle className="text-red-400">Temporary storage cleanup</CardTitle>
            <CardDescription>
              No account login. Uses ADMIN_DELETE_SECRET from env. Remove this page when quota is fixed.
              Database size and file Storage are separate — deleting files frees Storage; deleting user
              rows frees Database.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="ADMIN_DELETE_SECRET"
              className="bg-zinc-950 border-zinc-700"
            />
            <Button onClick={loadUsers} disabled={loading || !secret} className="gradient-button text-black">
              {loading ? 'Working…' : 'Unlock and list users'}
            </Button>
            {error && <pre className="text-red-400 text-sm whitespace-pre-wrap">{error}</pre>}
            {status && <pre className="text-gray-300 text-sm whitespace-pre-wrap">{status}</pre>}
            {totals && (
              <div className="rounded-lg border border-zinc-700 p-4 text-sm space-y-1">
                <div className="text-xl font-bold text-primary">{totals.label} total file storage</div>
                <div className="text-gray-400">{totals.files} files</div>
                {totals.unassigned_files > 0 && (
                  <div className="text-gray-500">
                    Unassigned: {totals.unassigned_label} ({totals.unassigned_files} files)
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {users.length > 0 && (
          <div className="space-y-3">
            {users.map((user) => (
              <Card key={user.id} className="bg-black border-zinc-800">
                <CardContent className="pt-6 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div>
                      <div className="font-semibold">{user.email}</div>
                      <div className="text-xs text-gray-500">
                        {user.username || 'no username'} · {user.role || 'user'} · {user.id}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        albums {user.albums} · generated songs {user.generated_songs} · lyrics sessions{' '}
                        {user.lyrics_sessions} · {user.storage_files} files
                      </div>
                    </div>
                    <div className="text-lg font-bold text-primary whitespace-nowrap">
                      {user.storage_label || '0 B'}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => previewStorage(user.id)} disabled={loading}>
                      Preview files
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => deleteStorage(user.id)} disabled={loading}>
                      Delete storage files
                    </Button>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      value={confirmEmail[user.id] || ''}
                      onChange={(e) =>
                        setConfirmEmail((prev) => ({ ...prev, [user.id]: e.target.value }))
                      }
                      placeholder={`Type ${user.email} to delete user`}
                      className="bg-zinc-950 border-zinc-700"
                    />
                    <Button
                      variant="destructive"
                      onClick={() => deleteUser(user)}
                      disabled={loading}
                    >
                      Delete user + data
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
