'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Copy, Check } from 'lucide-react'

interface StripeWebhookSetupModalProps {
  isOpen: boolean
  onClose: () => void
}

export function StripeWebhookSetupModal({ isOpen, onClose }: StripeWebhookSetupModalProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Get the current host and port
  const webhookUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/webhooks/stripe`
    : 'localhost:3000/api/webhooks/stripe'

  const steps = [
    {
      number: 1,
      title: 'Download and Login',
      description: 'Download the Stripe CLI and log in with your Stripe account',
      command: 'stripe login',
    },
    {
      number: 2,
      title: 'Forward Events',
      description: 'Forward events to your destination',
      command: `stripe listen --forward-to ${webhookUrl}`,
    },
    {
      number: 3,
      title: 'Trigger Events',
      description: 'Trigger events with the CLI',
      command: 'stripe trigger payment_intent.succeeded',
    },
  ]

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a1a1a] border-yellow-400 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white">
            Set up a local listener
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Run the following steps using the Stripe CLI
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {steps.map((step, index) => (
            <div key={step.number} className="space-y-2">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-400 text-black flex items-center justify-center text-sm font-bold">
                  {step.number}
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-white mb-1">
                    {step.title}
                  </h3>
                  <p className="text-sm text-gray-400 mb-3">
                    {step.description}
                  </p>
                  <div className="relative">
                    <div className="bg-gray-900 border border-gray-700 rounded-md p-3 pr-10">
                      <code className="text-sm text-gray-300 font-mono break-all">
                        {step.command}
                      </code>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(step.command, index)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-800"
                      title="Copy command"
                    >
                      {copiedIndex === index ? (
                        <Check className="h-4 w-4 text-green-400" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div className="pt-4 border-t border-gray-700">
            <Button
              variant="ghost"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-yellow-400 hover:text-yellow-300 hover:bg-gray-800 p-0 h-auto font-normal"
            >
              {showAdvanced ? 'Hide' : 'Show'} advanced options
            </Button>
            {showAdvanced && (
              <div className="mt-4 space-y-2 text-sm text-gray-400">
                <p>Advanced options for webhook testing:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Use <code className="bg-gray-900 px-1 py-0.5 rounded text-xs">--events</code> to filter specific events</li>
                  <li>Use <code className="bg-gray-900 px-1 py-0.5 rounded text-xs">--print-json</code> to print event JSON</li>
                  <li>Use <code className="bg-gray-900 px-1 py-0.5 rounded text-xs">--skip-verify</code> to skip TLS verification (development only)</li>
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-700">
          <div className="flex justify-end">
            <Button
              onClick={onClose}
              className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-6"
            >
              Done
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-3 text-right">
            Listen to events in your Stripe account on your webhook endpoint so your integration can automatically trigger reactions.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

