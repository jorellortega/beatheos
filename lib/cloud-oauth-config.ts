// Helper function to get base URL from request or environment
export function getBaseUrl(request?: { headers: Headers | { get: (key: string) => string | null }, url?: string }): string {
  // If we have a request, use it to determine the base URL dynamically
  if (request) {
    // First, try to get from the request URL itself (most reliable)
    if (request.url) {
      try {
        const url = new URL(request.url)
        // If it's localhost or 127.0.0.1, use that
        if (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname.startsWith('192.168.') || url.hostname.startsWith('10.')) {
          return `${url.protocol}//${url.host}`
        }
      } catch (e) {
        // URL parsing failed, continue with other methods
      }
    }
    
    const origin = request.headers.get('origin')
    const host = request.headers.get('host')
    const referer = request.headers.get('referer')
    const protocol = request.headers.get('x-forwarded-proto') || 
                    (origin ? new URL(origin).protocol.replace(':', '') : 'http')
    
    // Check if host is localhost
    if (host && (host.includes('localhost') || host.includes('127.0.0.1') || host.match(/^\d+\.\d+\.\d+\.\d+:\d+$/))) {
      return `${protocol}://${host}`
    }
    
    if (host) {
      return `${protocol}://${host}`
    }
    
    // Try referer as fallback
    if (referer) {
      try {
        const refererUrl = new URL(referer)
        if (refererUrl.hostname === 'localhost' || refererUrl.hostname === '127.0.0.1') {
          return `${refererUrl.protocol}//${refererUrl.host}`
        }
      } catch (e) {
        // Ignore
      }
    }
    
    if (origin) {
      return origin
    }
  }
  
  // Fallback to environment variable or localhost
  // But check if we're in a development environment
  const isDev = process.env.NODE_ENV === 'development' || 
                process.env.VERCEL_ENV !== 'production' ||
                typeof window !== 'undefined' && window.location.hostname === 'localhost'
  
  if (isDev) {
    return 'http://localhost:3000'
  }
  
  return process.env.NEXT_PUBLIC_SITE_URL || 
         process.env.BASE_URL || 
         process.env.SITE_URL || 
         'http://localhost:3000'
}

export const OAUTH_CONFIG = {
  'google-drive': {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    getRedirectUri: (baseUrl: string) => `${baseUrl}/api/cloud-services/callback/google-drive`,
    scope: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
  },
  'dropbox': {
    clientId: process.env.DROPBOX_CLIENT_ID || '',
    clientSecret: process.env.DROPBOX_CLIENT_SECRET || '',
    getRedirectUri: (baseUrl: string) => `${baseUrl}/api/cloud-services/callback/dropbox`,
    scope: 'files.metadata.write files.content.write files.content.read account_info.read',
    authUrl: 'https://www.dropbox.com/oauth2/authorize',
    tokenUrl: 'https://api.dropbox.com/oauth2/token',
  },
  'onedrive': {
    clientId: process.env.ONEDRIVE_CLIENT_ID || '',
    clientSecret: process.env.ONEDRIVE_CLIENT_SECRET || '',
    getRedirectUri: (baseUrl: string) => `${baseUrl}/api/cloud-services/callback/onedrive`,
    scope: 'Files.Read User.Read',
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
  },
  'box': {
    clientId: process.env.BOX_CLIENT_ID || '',
    clientSecret: process.env.BOX_CLIENT_SECRET || '',
    getRedirectUri: (baseUrl: string) => `${baseUrl}/api/cloud-services/callback/box`,
    scope: 'root_readonly',
    authUrl: 'https://account.box.com/api/oauth2/authorize',
    tokenUrl: 'https://api.box.com/oauth2/token',
  },
} as const

export type CloudServiceId = keyof typeof OAUTH_CONFIG

export function getOAuthConfig(serviceId: string, baseUrl?: string) {
  const config = OAUTH_CONFIG[serviceId as CloudServiceId]
  if (!config) return null
  
  // If baseUrl is provided, return config with dynamic redirectUri
  if (baseUrl) {
    return {
      ...config,
      redirectUri: config.getRedirectUri(baseUrl)
    }
  }
  
  // Otherwise, use environment-based redirectUri (for backward compatibility)
  const fallbackBaseUrl = getBaseUrl()
  return {
    ...config,
    redirectUri: config.getRedirectUri(fallbackBaseUrl)
  }
}

export function generateState(userId: string, serviceId: string): string {
  const timestamp = Date.now()
  return `${userId}:${serviceId}:${timestamp}`
}

export function parseState(state: string): { userId: string; serviceId: string; timestamp: number } | null {
  const parts = state.split(':')
  if (parts.length !== 3) {
    return null
  }
  return {
    userId: parts[0],
    serviceId: parts[1],
    timestamp: parseInt(parts[2], 10)
  }
}

