"use client"
import { useState } from "react"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

function PaymentForm({ clientSecret, onSuccess }: { clientSecret: string, onSuccess: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setIsProcessing(true)
    setError(null)
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: "if_required",
    })
    setIsProcessing(false)
    if (paymentIntent?.status === "succeeded") onSuccess()
    if (error) setError(error.message || "Payment failed.")
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto p-4 bg-zinc-900 rounded-lg shadow">
      <PaymentElement />
      {error && <div className="text-red-500 mt-2">{error}</div>}
      <button type="submit" disabled={!stripe || isProcessing} className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded">
        {isProcessing ? "Processing..." : "Pay"}
      </button>
    </form>
  )
}

export default function PaymentsPage() {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [step, setStep] = useState(0)
  const [amount, setAmount] = useState(10) // Default amount, can be dynamic
  const [success, setSuccess] = useState(false)

  // Step 0: Enter amount, Step 1: Payment, Step 2: Success
  const handleStartPayment = async () => {
    const res = await fetch("/api/payments/create-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    })
    const data = await res.json()
    setClientSecret(data.clientSecret)
    setStep(1)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#141414] text-white">
      <div className="w-full max-w-lg">
        <h1 className="text-3xl font-bold mb-6 text-center">Buy Music</h1>
        <div className="mb-4 flex justify-center space-x-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 0 ? 'bg-blue-600' : 'bg-zinc-700'}`}>1</div>
          <div className="w-8 h-1 bg-zinc-700 self-center" />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 1 ? 'bg-blue-600' : 'bg-zinc-700'}`}>2</div>
          <div className="w-8 h-1 bg-zinc-700 self-center" />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 2 ? 'bg-blue-600' : 'bg-zinc-700'}`}>3</div>
        </div>
        {step === 0 && (
          <div className="bg-zinc-900 p-6 rounded-lg shadow">
            <label className="block mb-2">Amount (USD)</label>
            <input
              type="number"
              min={1}
              value={amount}
              onChange={e => setAmount(Number(e.target.value))}
              className="w-full p-2 rounded bg-zinc-800 text-white mb-4"
            />
            <button onClick={handleStartPayment} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded">
              Continue to Payment
            </button>
          </div>
        )}
        {step === 1 && clientSecret && (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <PaymentForm clientSecret={clientSecret} onSuccess={() => { setSuccess(true); setStep(2); }} />
          </Elements>
        )}
        {step === 2 && success && (
          <div className="bg-green-900 p-6 rounded-lg shadow text-center">
            <h2 className="text-2xl font-bold mb-2">Payment Successful!</h2>
            <p className="mb-4">Thank you for your purchase. You will receive your music shortly.</p>
            {/* Add download link or further instructions here */}
          </div>
        )}
      </div>
    </div>
  )
} 