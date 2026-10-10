import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { timingSafeEqual } from 'crypto'

export const maxDuration = 60

function getSecret() {
  return process.env.ADMIN_DELETE_SECRET?.trim() || ''
}

function secretsMatch(provided: string, expected: string) {
  if (!expected || !provided) return false
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function unauthorized() {
  return NextResponse.json({ error: 'Invalid secret' }, { status: 401 })
}

function notConfigured() {
  return NextResponse.json(
    {
      error:
        'Set ADMIN_DELETE_SECRET in .env.local (and Vercel env if deployed), then restart the app.',
    },
    { status: 503 }
  )
}

function formatBytes(bytes: number) {
  if (!bytes || bytes < 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toFixed(unit === 0 ? 0 : 2)} ${units[unit]}`
}

function objectSize(metadata: unknown): number {
  if (!metadata || typeof metadata !== 'object') return 0
  const size = (metadata as { size?: number | string }).size
  const n = typeof size === 'string' ? Number(size) : size
  return Number.isFinite(n) ? Number(n) : 0
}

async function listAllStorageObjects(supabase: ReturnType<typeof adminClient>) {
  const { data: buckets } = await supabase.storage.listBuckets()
  const bucketIds = (buckets || []).map((b) => b.id)
  if (!bucketIds.includes('beats')) bucketIds.push('beats')

  const objects: { name: string; bucket_id: string; bytes: number }[] = []

  for (const bucket of bucketIds) {
    let from = 0
    const pageSize = 1000
    while (true) {
      const { data, error } = await supabase
        .schema('storage')
        .from('objects')
        .select('name, bucket_id, metadata')
        .eq('bucket_id', bucket)
        .range(from, from + pageSize - 1)

      if (error) break
      const rows = data || []
      for (const row of rows) {
        if (!row.name) continue
        objects.push({
          name: row.name,
          bucket_id: row.bucket_id,
          bytes: objectSize(row.metadata),
        })
      }
      if (rows.length < pageSize) break
      from += pageSize
    }
  }

  return objects
}

function uuidFromPath(name: string) {
  return name.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi) || []
}

async function listFolderFiles(
  supabase: ReturnType<typeof adminClient>,
  bucket: string,
  prefix: string
): Promise<string[]> {
  const files: string[] = []
  const queue = [prefix.replace(/\/$/, '')]

  while (queue.length > 0) {
    const current = queue.shift() || ''
    const { data, error } = await supabase.storage.from(bucket).list(current, {
      limit: 1000,
      offset: 0,
    })
    if (error || !data) continue
    for (const item of data) {
      const path = current ? `${current}/${item.name}` : item.name
      const isFolder = !item.id || item.metadata == null
      if (isFolder) queue.push(path)
      else files.push(path)
    }
  }

  return files
}

async function removeFiles(
  supabase: ReturnType<typeof adminClient>,
  bucket: string,
  paths: string[]
) {
  let removed = 0
  for (let i = 0; i < paths.length; i += 100) {
    const chunk = paths.slice(i, i + 100)
    const { error } = await supabase.storage.from(bucket).remove(chunk)
    if (!error) removed += chunk.length
  }
  return removed
}

async function storagePathsForUser(
  supabase: ReturnType<typeof adminClient>,
  userId: string
) {
  const prefixes = [`generated_songs/${userId}`, `user_uploads/${userId}`]

  const { data: albums } = await supabase.from('albums').select('id').eq('user_id', userId)
  for (const album of albums || []) {
    prefixes.push(`albums/${album.id}`)
    prefixes.push(`album_tracks/${album.id}`)
  }

  const paths: string[] = []
  for (const prefix of prefixes) {
    const found = await listFolderFiles(supabase, 'beats', prefix)
    paths.push(...found)
  }

  const { data: objects } = await supabase
    .schema('storage')
    .from('objects')
    .select('name, bucket_id')
    .eq('bucket_id', 'beats')
    .ilike('name', `%${userId}%`)
    .limit(2000)

  for (const obj of objects || []) {
    if (obj.name && !paths.includes(obj.name)) paths.push(obj.name)
  }

  return [...new Set(paths)]
}

export async function POST(req: NextRequest) {
  const expected = getSecret()
  if (!expected) return notConfigured()

  let body: {
    secret?: string
    action?: string
    userId?: string
    confirmEmail?: string
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!secretsMatch(body.secret || '', expected)) return unauthorized()

  const supabase = adminClient()
  const action = body.action || 'list'

  if (action === 'unlock' || action === 'list') {
    const { data: userRows, error } = await supabase
      .from('users')
      .select('id, email, username, role, created_at')
      .order('created_at', { ascending: false })
      .limit(300)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const rows = userRows || []
    const userIds = rows.map((u) => u.id)

    const albumCounts: Record<string, number> = {}
    const songCounts: Record<string, number> = {}
    const lyricsCounts: Record<string, number> = {}
    const albumOwner: Record<string, string> = {}
    const userIdSet = new Set(userIds)

    if (userIds.length > 0) {
      const { data: albums } = await supabase.from('albums').select('id, user_id')
      for (const row of albums || []) {
        if (row.user_id) {
          albumCounts[row.user_id] = (albumCounts[row.user_id] || 0) + 1
          albumOwner[row.id] = row.user_id
        }
      }
      const { data: songs } = await supabase
        .from('generated_songs')
        .select('user_id')
        .in('user_id', userIds)
      for (const row of songs || []) {
        songCounts[row.user_id] = (songCounts[row.user_id] || 0) + 1
      }
      const { data: sessions } = await supabase
        .from('sessions')
        .select('user_id')
        .in('user_id', userIds)
      for (const row of sessions || []) {
        lyricsCounts[row.user_id] = (lyricsCounts[row.user_id] || 0) + 1
      }
    }

    const objects = await listAllStorageObjects(supabase)
    const storageBytes: Record<string, number> = {}
    const storageFiles: Record<string, number> = {}
    let unassignedBytes = 0
    let unassignedFiles = 0
    let totalBytes = 0

    for (const obj of objects) {
      totalBytes += obj.bytes
      const ids = uuidFromPath(obj.name)
      let owner: string | null = null
      for (const id of ids) {
        if (userIdSet.has(id)) {
          owner = id
          break
        }
        if (albumOwner[id]) {
          owner = albumOwner[id]
          break
        }
      }
      if (owner) {
        storageBytes[owner] = (storageBytes[owner] || 0) + obj.bytes
        storageFiles[owner] = (storageFiles[owner] || 0) + 1
      } else {
        unassignedBytes += obj.bytes
        unassignedFiles += 1
      }
    }

    const users = rows
      .map((user) => ({
        ...user,
        albums: albumCounts[user.id] || 0,
        generated_songs: songCounts[user.id] || 0,
        lyrics_sessions: lyricsCounts[user.id] || 0,
        storage_bytes: storageBytes[user.id] || 0,
        storage_files: storageFiles[user.id] || 0,
        storage_label: formatBytes(storageBytes[user.id] || 0),
      }))
      .sort((a, b) => b.storage_bytes - a.storage_bytes)

    return NextResponse.json({
      success: true,
      totals: {
        bytes: totalBytes,
        label: formatBytes(totalBytes),
        files: objects.length,
        unassigned_bytes: unassignedBytes,
        unassigned_files: unassignedFiles,
        unassigned_label: formatBytes(unassignedBytes),
      },
      users,
      note: `Total file Storage: ${formatBytes(totalBytes)} across ${objects.length} files. Database size is separate.`,
    })
  }

  const userId = body.userId?.trim()
  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  }

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, email, username')
    .eq('id', userId)
    .maybeSingle()

  if (userError || !user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  if (action === 'preview-storage') {
    const paths = await storagePathsForUser(supabase, userId)
    const objects = await listAllStorageObjects(supabase)
    const pathSet = new Set(paths)
    const bytes = objects
      .filter((obj) => pathSet.has(obj.name) || obj.name.includes(userId))
      .reduce((sum, obj) => sum + obj.bytes, 0)
    return NextResponse.json({
      success: true,
      user,
      fileCount: paths.length,
      bytes,
      label: formatBytes(bytes),
      files: paths.slice(0, 200),
    })
  }

  if (action === 'delete-storage') {
    const paths = await storagePathsForUser(supabase, userId)
    const removed = await removeFiles(supabase, 'beats', paths)
    return NextResponse.json({
      success: true,
      user,
      removed,
      attempted: paths.length,
    })
  }

  if (action === 'delete-user') {
    const confirmEmail = (body.confirmEmail || '').trim().toLowerCase()
    if (!user.email || confirmEmail !== user.email.toLowerCase()) {
      return NextResponse.json(
        { error: 'Type the user email exactly to confirm full delete' },
        { status: 400 }
      )
    }

    const paths = await storagePathsForUser(supabase, userId)
    const removed = await removeFiles(supabase, 'beats', paths)

    const db: Record<string, string | null> = {}
    const tables = [
      'generated_songs',
      'credit_transactions',
      'sessions',
      'saved_music_prompts',
      'albums',
    ]

    for (const table of tables) {
      const { error } = await supabase.from(table).delete().eq('user_id', userId)
      db[table] = error ? error.message : 'ok'
    }

    const { error: userDeleteError } = await supabase.from('users').delete().eq('id', userId)
    db.users = userDeleteError ? userDeleteError.message : 'ok'

    return NextResponse.json({
      success: true,
      user,
      removedFiles: removed,
      attemptedFiles: paths.length,
      database: db,
    })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
