import { Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from 'next/link'
import dynamic from 'next/dynamic'

const SuccessContent = dynamic(() => import('@/components/SuccessContent'), {
  loading: () => <p>Loading...</p>,
  ssr: false
})

export default function SuccessPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-primary">Payment Successful!</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <Suspense fallback={<p>Loading...</p>}>
            <SuccessContent />
          </Suspense>
          <Button asChild className="mt-4">
            <Link href="/">Return to Home</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

