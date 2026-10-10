import type { ReactNode } from 'react'
import { JsonLd } from '@/components/JsonLd'
import {
  FEATURE_FAQS,
  FEATURE_PAGES,
  faqJsonLd,
  pageMetadata,
  softwareAppJsonLd,
} from '@/lib/seo'

const page = FEATURE_PAGES.song
const faqs = FEATURE_FAQS.song

export const metadata = pageMetadata({
  title: page.title,
  description: page.description,
  path: page.path,
  keywords: [...page.keywords],
})

export default function CreateSongLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <JsonLd
        data={[
          softwareAppJsonLd({
            name: `${page.title} by Beatheos`,
            description: page.description,
            path: page.path,
            applicationSubCategory: 'AI song generator',
          }),
          faqJsonLd(faqs),
        ]}
      />
      {children}
    </>
  )
}
