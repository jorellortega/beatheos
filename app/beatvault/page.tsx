"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function BeatVaultPage() {
  // Always use mock data
  const vault = {
    name: "Demo Vault",
    description: "This is a mock vault for preview purposes.",
    cover_image_url: null
  };
  const beats = [
    { id: 1, title: "Mock Beat 1" },
    { id: 2, title: "Mock Beat 2" },
    { id: 3, title: "Mock Beat 3" }
  ];

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">My Beat Vault</h1>
      <Card>
        <CardHeader>
          <CardTitle>{vault.name}</CardTitle>
          <p className="mb-2">{vault.description}</p>
          {vault.cover_image_url && (
            <img src={vault.cover_image_url} alt="Vault Cover" className="mb-4 w-48 h-48 object-cover rounded" />
          )}
        </CardHeader>
        <CardContent>
          <h3 className="font-semibold mb-2">Vault Beats</h3>
          {beats.length > 0 ? (
            <ul className="space-y-2">
              {beats.map((beat) => (
                <li key={beat.id} className="p-2 bg-secondary rounded flex items-center justify-between">
                  <span className="font-medium">{beat.title}</span>
                  {/* Add management actions here, e.g. Edit, Remove */}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400">No beats in this vault yet.</p>
          )}
        </CardContent>
      </Card>
    </main>
  );
} 