import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  const publicPaths = [
    '/',
    '/create-song',
    '/lyrics-ai',
    '/ai-cover',
    '/aicovermaker',
    '/ai-lyrics-editor',
    '/ai-album-creation',
    '/subscriptionplans',
    '/features-info',
    '/beats',
    '/artists',
    '/login',
  ]

  return publicPaths.map((path) => ({
    url: `${SITE_URL}${path === '/' ? '' : path}`,
    lastModified: now,
    changeFrequency: path === '/' ? 'daily' : 'weekly',
    priority: path === '/' ? 1 : path === '/create-song' || path === '/lyrics-ai' || path === '/ai-cover' ? 0.9 : 0.7,
  }))
}
