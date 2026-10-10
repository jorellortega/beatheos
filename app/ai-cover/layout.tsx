import type { ReactNode } from 'react'
import { JsonLd } from '@/components/JsonLd'
import {
  FEATURE_FAQS,
  FEATURE_PAGES,
  faqJsonLd,
  pageMetadata,
  softwareAppJsonLd,
} from '@/lib/seo'

const page = FEATURE_PAGES.cover
const faqs = FEATURE_FAQS.cover

export const metadata = pageMetadata({
  title: page.title,
  description: page.description,
  path: page.path,
  keywords: [...page.keywords],
})

export default function AiCoverLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <JsonLd
        data={[
          softwareAppJsonLd({
            name: `${page.title} by Beatheos`,
            description: page.description,
            path: page.path,
            applicationSubCategory: 'AI album cover generator',
          }),
          faqJsonLd(faqs),
        ]}
      />
      {children}
    </>
  )
}
