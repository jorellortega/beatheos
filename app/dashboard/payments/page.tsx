"use client"
import { useState } from "react"

const TABS = [
  { label: "Payment Methods" },
  { label: "Transactions" },
  { label: "Subscriptions" },
  { label: "Payouts/Balance" },
]

export default function PaymentsDashboard() {
  const [tab, setTab] = useState(0)
  // TODO: Replace with real data from Stripe/Supabase
  const mockCards = []
  const mockTransactions = []
  const mockSubscriptions = []
  const mockPayouts = {
    available: 0,
    pending: 0,
    bank: "JPMORGAN CHASE BANK, NA •••• 4955",
    payoutsEnabled: true,
    chargesEnabled: true,
  }
  const [showPayoutSummary, setShowPayoutSummary] = useState(false)

  return (
    <div className="min-h-screen bg-[#141414] text-white p-8">
      <h1 className="text-3xl font-bold mb-8">Manage Payments</h1>
      {/* Tab Navigation */}
      <div className="flex space-x-4 mb-8">
        {TABS.map((t, i) => (
          <button
            key={t.label}
            className={`px-4 py-2 rounded ${tab === i ? 'bg-blue-600' : 'bg-zinc-800 hover:bg-zinc-700'}`}
            onClick={() => setTab(i)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {/* Tab Content */}
      <div className="bg-zinc-900 rounded-lg shadow p-6">
        {tab === 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Saved Payment Methods</h2>
            {/* TODO: List saved cards/bank accounts from Stripe */}
            {mockCards.length === 0 ? (
              <div className="mb-6 text-zinc-400">No saved payment methods found.</div>
            ) : (
              <ul>{/* Map cards here */}</ul>
            )}
            <h3 className="text-lg font-semibold mt-8 mb-2">Add New Payment Method</h3>
            {/* TODO: Stripe Elements form for adding new card */}
            <div className="bg-zinc-800 p-4 rounded mb-2">[Stripe Elements Card Form Here]</div>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">Save Payment Method</button>
          </div>
        )}
        {tab === 1 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Transactions</h2>
            {/* TODO: Paginated list of transactions from backend */}
            {mockTransactions.length === 0 ? (
              <div className="text-zinc-400">No transactions found.</div>
            ) : (
              <ul>{/* Map transactions here */}</ul>
            )}
          </div>
        )}
        {tab === 2 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Subscriptions</h2>
            {/* TODO: List subscriptions from backend */}
            {mockSubscriptions.length === 0 ? (
              <div className="text-zinc-400">No subscriptions found.</div>
            ) : (
              <ul>{/* Map subscriptions here */}</ul>
            )}
          </div>
        )}
        {tab === 3 && (
          <div>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1 bg-zinc-800 p-4 rounded">
                <div className="text-zinc-400 text-sm">Available Balance</div>
                <div className="text-2xl font-bold">${mockPayouts.available.toFixed(2)}</div>
                <div className="text-zinc-500 text-xs mt-1">Last updated: Today</div>
              </div>
              <div className="flex-1 bg-zinc-800 p-4 rounded">
                <div className="text-zinc-400 text-sm">Pending Incoming</div>
                <div className="text-2xl font-bold text-green-400">${mockPayouts.pending.toFixed(2)}</div>
                <div className="text-zinc-500 text-xs mt-1">Next payout: --</div>
              </div>
              <div className="flex-1 bg-zinc-800 p-4 rounded">
                <div className="text-zinc-400 text-sm">Bank Account</div>
                <div className="text-lg font-semibold">{mockPayouts.bank}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-green-400 text-xs">{mockPayouts.payoutsEnabled ? 'Payouts Active' : 'Payouts Inactive'}</span>
                  <span className="text-green-400 text-xs">{mockPayouts.chargesEnabled ? 'Payments Active' : 'Payments Inactive'}</span>
                </div>
              </div>
            </div>
            <button
              className="mb-4 text-blue-400 underline"
              onClick={() => setShowPayoutSummary(s => !s)}
            >
              {showPayoutSummary ? 'Hide' : 'Show'} Stripe Payout Summary
            </button>
            {showPayoutSummary && (
              <div className="bg-zinc-800 p-4 rounded mb-4">
                <div className="font-semibold mb-2">Stripe Payout Summary</div>
                <div>On the way to your bank: <span className="font-mono">${mockPayouts.pending.toFixed(2)}</span></div>
                <div>Available in your balance: <span className="font-mono">${mockPayouts.available.toFixed(2)}</span></div>
                <div>Total balance: <span className="font-mono">${(mockPayouts.available + mockPayouts.pending).toFixed(2)}</span></div>
                <div>Payouts go to: <span className="font-mono">{mockPayouts.bank}</span></div>
              </div>
            )}
            <h3 className="text-lg font-semibold mt-8 mb-2">Add/Update Bank Account</h3>
            {/* TODO: Bank account form for Stripe Connect */}
            <div className="bg-zinc-800 p-4 rounded mb-2">[Bank Account Form Here]</div>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">Save Bank Account</button>
          </div>
        )}
      </div>
    </div>
  )
} 