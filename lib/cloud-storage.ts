import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface CloudServiceConnection {
  id: string
  user_id: string | null
  service_id: string
  service_name: string
  connection_type: 'user' | 'system'
  access_token: string
  refresh_token: string | null
  token_expires_at: string | null
  account_info: Record<string, any> | null
  scopes: string[] | null
  is_active: boolean
  last_sync: string | null
  created_at: string
  updated_at: string
}

/**
 * Get the best available cloud storage connection for a user
 * Priority: User connection → System connection
 */
export async function getCloudStorageConnection(
  userId: string,
  serviceId: string
): Promise<CloudServiceConnection | null> {
  // First, try to get user's personal connection
  const userConnection = await getUserCloudStorageConnection(userId, serviceId)
  if (userConnection) {
    return userConnection
  }

  // Fallback to system connection
  return getSystemCloudStorageConnection(serviceId)
}

/**
 * Get system cloud storage connection (platform-wide)
 */
export async function getSystemCloudStorageConnection(
  serviceId: string
): Promise<CloudServiceConnection | null> {
  const { data, error } = await supabase
    .from('cloud_services')
    .select('*')
    .eq('service_id', serviceId)
    .eq('connection_type', 'system')
    .is('user_id', null)
    .eq('is_active', true)
    .single()

  if (error || !data) {
    return null
  }

  return data as CloudServiceConnection
}

/**
 * Get user's personal cloud storage connection
 */
export async function getUserCloudStorageConnection(
  userId: string,
  serviceId: string
): Promise<CloudServiceConnection | null> {
  const { data, error } = await supabase
    .from('cloud_services')
    .select('*')
    .eq('user_id', userId)
    .eq('service_id', serviceId)
    .eq('connection_type', 'user')
    .eq('is_active', true)
    .single()

  if (error || !data) {
    return null
  }

  return data as CloudServiceConnection
}

/**
 * Get system Dropbox user folder path
 */
export function getSystemDropboxUserFolder(userId: string): string {
  return `/Beatheos/Users/${userId}`
}

/**
 * Get system Dropbox project folder path
 */
export function getSystemDropboxProjectFolder(projectId: string): string {
  return `/Beatheos/Projects/${projectId}`
}

/**
 * Get system Dropbox user project folder path
 */
export function getSystemDropboxUserProjectFolder(userId: string, projectId: string): string {
  return `/Beatheos/Users/${userId}/Projects/${projectId}`
}

/**
 * Create folder in Dropbox
 */
export async function createDropboxFolder(
  accessToken: string,
  path: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('https://api.dropboxapi.com/2/files/create_folder_v2', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        path,
        autorename: false
      })
    })

    if (response.status === 409) {
      // Folder already exists, this is fine
      return { success: true }
    }

    if (!response.ok) {
      const error = await response.text()
      return { success: false, error }
    }

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Ensure user folder structure exists in system Dropbox
 */
export async function ensureUserFolderStructure(
  systemConnection: CloudServiceConnection,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const basePath = '/Beatheos'
  const usersPath = '/Beatheos/Users'
  const userPath = getSystemDropboxUserFolder(userId)

  // Create base folder
  const baseResult = await createDropboxFolder(systemConnection.access_token, basePath)
  if (!baseResult.success && !baseResult.error?.includes('already exists')) {
    return baseResult
  }

  // Create Users folder
  const usersResult = await createDropboxFolder(systemConnection.access_token, usersPath)
  if (!usersResult.success && !usersResult.error?.includes('already exists')) {
    return usersResult
  }

  // Create user-specific folder
  const userResult = await createDropboxFolder(systemConnection.access_token, userPath)
  if (!userResult.success && !userResult.error?.includes('already exists')) {
    return userResult
  }

  return { success: true }
}

/**
 * Upload file to Dropbox
 */
export async function uploadToDropbox(
  accessToken: string,
  filePath: string,
  fileContent: Buffer | Blob,
  fileSize?: number
): Promise<{ success: boolean; error?: string; path?: string }> {
  try {
    // For files larger than 4MB, use chunked upload
    const chunkSize = 4 * 1024 * 1024 // 4MB
    const size = fileSize || (fileContent instanceof Blob ? fileContent.size : fileContent.length)

    if (size > chunkSize) {
      return await uploadLargeFileToDropbox(accessToken, filePath, fileContent, size)
    }

    // Small file upload
    const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': JSON.stringify({
          path: filePath,
          mode: 'add',
          autorename: true,
          mute: false
        })
      },
      body: fileContent
    })

    if (!response.ok) {
      const error = await response.text()
      return { success: false, error }
    }

    const data = await response.json()
    return { success: true, path: data.path_display }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Upload large file to Dropbox using chunked upload
 */
async function uploadLargeFileToDropbox(
  accessToken: string,
  filePath: string,
  fileContent: Buffer | Blob,
  fileSize: number
): Promise<{ success: boolean; error?: string; path?: string }> {
  try {
    const chunkSize = 4 * 1024 * 1024 // 4MB
    let offset = 0
    let sessionId: string | null = null

    // Start upload session
    const startResponse = await fetch('https://content.dropboxapi.com/2/files/upload_session/start', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': JSON.stringify({
          close: false
        })
      },
      body: fileContent instanceof Blob 
        ? fileContent.slice(0, Math.min(chunkSize, fileSize))
        : fileContent.subarray(0, Math.min(chunkSize, fileSize))
    })

    if (!startResponse.ok) {
      const error = await startResponse.text()
      return { success: false, error }
    }

    const startData = await startResponse.json()
    sessionId = startData.session_id
    offset = Math.min(chunkSize, fileSize)

    // Append remaining chunks
    while (offset < fileSize) {
      const chunkEnd = Math.min(offset + chunkSize, fileSize)
      const isLastChunk = chunkEnd >= fileSize

      const appendResponse = await fetch('https://content.dropboxapi.com/2/files/upload_session/append_v2', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/octet-stream',
          'Dropbox-API-Arg': JSON.stringify({
            cursor: {
              session_id: sessionId,
              offset
            },
            close: isLastChunk
          })
        },
        body: fileContent instanceof Blob
          ? fileContent.slice(offset, chunkEnd)
          : fileContent.subarray(offset, chunkEnd)
      })

      if (!appendResponse.ok) {
        const error = await appendResponse.text()
        return { success: false, error }
      }

      offset = chunkEnd
    }

    // Finish upload session
    const finishResponse = await fetch('https://content.dropboxapi.com/2/files/upload_session/finish', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': JSON.stringify({
          cursor: {
            session_id: sessionId,
            offset: fileSize
          },
          commit: {
            path: filePath,
            mode: 'add',
            autorename: true,
            mute: false
          }
        })
      }
    })

    if (!finishResponse.ok) {
      const error = await finishResponse.text()
      return { success: false, error }
    }

    const finishData = await finishResponse.json()
    return { success: true, path: finishData.path_display }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * List files in Dropbox folder
 */
export async function listDropboxFiles(
  accessToken: string,
  path: string = '',
  recursive: boolean = false
): Promise<{ success: boolean; files?: any[]; error?: string }> {
  try {
    const response = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        path,
        recursive
      })
    })

    if (!response.ok) {
      const error = await response.text()
      return { success: false, error }
    }

    const data = await response.json()
    return { success: true, files: data.entries }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Download file from Dropbox
 */
export async function downloadFromDropbox(
  accessToken: string,
  path: string
): Promise<{ success: boolean; data?: ArrayBuffer; error?: string }> {
  try {
    const response = await fetch('https://content.dropboxapi.com/2/files/download', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Dropbox-API-Arg': JSON.stringify({ path })
      }
    })

    if (!response.ok) {
      const error = await response.text()
      return { success: false, error }
    }

    const data = await response.arrayBuffer()
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Delete file/folder from Dropbox
 */
export async function deleteFromDropbox(
  accessToken: string,
  path: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('https://api.dropboxapi.com/2/files/delete_v2', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ path })
    })

    if (!response.ok) {
      const error = await response.text()
      return { success: false, error }
    }

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

