type JsonLdNode = Record<string, unknown>

function normalizeJsonLd(data: object | object[]): JsonLdNode {
  if (!Array.isArray(data)) {
    const node = data as JsonLdNode
    if (!node['@context']) {
      return { '@context': 'https://schema.org', ...node }
    }
    return node
  }

  const graph = data.map((item) => {
    const node = { ...(item as JsonLdNode) }
    delete node['@context']
    return node
  })

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  }
}

export function JsonLd({ data }: { data: object | object[] }) {
  const payload = normalizeJsonLd(data)
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  )
}
