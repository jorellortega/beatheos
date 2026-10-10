import type { Metadata } from 'next'

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://www.beatheos.com'
).replace(/\/$/, '')

export const SITE_NAME = 'Beatheos'

export const SITE_TAGLINE = 'AI music tools for artists, producers, and creators'

export const SITE_DESCRIPTION =
  'Beatheos is an AI music platform for artists, producers, and creators. Write lyrics, generate songs, create album covers, and build albums in one place.'

export function absoluteUrl(path = '/') {
  if (!path.startsWith('/')) return `${SITE_URL}/${path}`
  return `${SITE_URL}${path}`
}

export function pageMetadata({
  title,
  description,
  path,
  keywords = [],
}: {
  title: string
  description: string
  path: string
  keywords?: string[]
}): Metadata {
  const url = absoluteUrl(path)
  const fullTitle = `${title} | ${SITE_NAME}`

  return {
    title,
    description,
    keywords,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      siteName: SITE_NAME,
      title: fullTitle,
      description,
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
    },
    robots: {
      index: true,
      follow: true,
    },
  }
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    sameAs: ['https://instagram.com/beat.heos'],
  }
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
    },
  }
}

export function softwareAppJsonLd({
  name,
  description,
  path,
  applicationSubCategory,
}: {
  name: string
  description: string
  path: string
  applicationSubCategory: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name,
    description,
    url: absoluteUrl(path),
    applicationCategory: 'MultimediaApplication',
    applicationSubCategory,
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    provider: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
    isPartOf: {
      '@type': 'WebSite',
      name: SITE_NAME,
      url: SITE_URL,
    },
  }
}

export function faqJsonLd(faqs: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }
}

export const FEATURE_FAQS = {
  cover: [
    {
      question: 'What is Beatheos AI Cover?',
      answer:
        'AI Cover is the Beatheos artwork tool for generating album and single covers from a text description, with optional reference images.',
    },
    {
      question: 'Can I use the covers for releases?',
      answer:
        'Yes. Generated covers are made for streaming, promo, albums, and singles, and can be saved to your Beatheos library.',
    },
    {
      question: 'How does this fit with the rest of Beatheos?',
      answer:
        'Beatheos combines lyrics, song generation, cover art, and album tools so you can move from writing to release assets in one platform.',
    },
  ],
  lyrics: [
    {
      question: 'What is Beatheos AI Lyrics?',
      answer:
        'AI Lyrics is the Beatheos writing studio for generating, editing, and organizing song lyrics, verses, hooks, and related creative writing.',
    },
    {
      question: 'Can lyrics from this tool become a song?',
      answer:
        'Yes. After you write or generate lyrics, you can use them in Beatheos Create Song to generate a vocal or instrumental track.',
    },
    {
      question: 'What is Beatheos?',
      answer:
        'Beatheos is an AI music platform where artists and producers write lyrics, generate songs, create album covers, and manage a music library.',
    },
  ],
  song: [
    {
      question: 'What is Beatheos Create Song?',
      answer:
        'Create Song is a Beatheos AI music tool that turns lyrics and a style prompt into a generated song. You can make a vocal track or an instrumental.',
    },
    {
      question: 'Can I use lyrics I already wrote?',
      answer:
        'Yes. Paste lyrics or choose writing from your Beatheos lyrics library, then generate a song that follows that text and your production notes.',
    },
    {
      question: 'Who is Beatheos for?',
      answer:
        'Beatheos is an AI music platform for artists, producers, rappers, and creators who want lyrics, songs, covers, and albums in one place.',
    },
  ],
} as const

export const FEATURE_PAGES = {
  cover: {
    path: '/ai-cover',
    title: 'AI Cover Maker',
    description:
      'Create album and single artwork with Beatheos AI Cover. Describe the look you want and generate streaming-ready cover art for releases, playlists, and promo.',
    keywords: [
      'AI album cover',
      'AI cover maker',
      'album artwork generator',
      'music cover art AI',
      'Beatheos',
    ],
  },
  lyrics: {
    path: '/lyrics-ai',
    title: 'AI Lyrics',
    description:
      'Write and edit song lyrics with Beatheos AI Lyrics. Generate verses, hooks, and full songs, organize drafts, and send finished lyrics into song creation.',
    keywords: [
      'AI lyrics generator',
      'AI songwriter',
      'rap lyrics AI',
      'song lyrics editor',
      'Beatheos',
    ],
  },
  song: {
    path: '/create-song',
    title: 'Create Song',
    description:
      'Create a song on Beatheos from lyrics and a style prompt. Generate vocal tracks or instrumentals, then download and keep your recent songs.',
    keywords: [
      'AI song generator',
      'create song from lyrics',
      'AI music maker',
      'generate vocals from lyrics',
      'Beatheos',
    ],
  },
} as const
