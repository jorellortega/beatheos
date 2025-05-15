"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/contexts/AuthContext"

export default function ContactPage() {
  const { user } = useAuth();
  const [form, setForm] = useState({ name: user?.email ? (user.email.split('@')[0] || "") : "", email: user?.email || "", phone: "", message: "" })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        alert("Failed to send message. Please try again.");
      }
    } catch (err) {
      alert("Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-12 min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-lg bg-card border-primary">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center text-primary">Contact Us</CardTitle>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="text-center py-8">
              <h2 className="text-2xl font-semibold text-primary mb-2">Thank you!</h2>
              <p className="text-gray-300">Your message has been sent. We'll get back to you soon.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">Name</label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className="bg-secondary text-white"
                  disabled={!!user}
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className="bg-secondary text-white"
                  disabled={!!user}
                />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-1">Phone (optional)</label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                  className="bg-secondary text-white"
                  placeholder="e.g. +1 555 123 4567"
                />
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-1">Message</label>
                <Textarea
                  id="message"
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  required
                  rows={5}
                  className="bg-secondary text-white resize-none"
                />
              </div>
              <Button
                type="submit"
                className="w-full gradient-button text-black font-medium hover:text-white"
                disabled={loading}
              >
                {loading ? "Sending..." : "Send Message"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 