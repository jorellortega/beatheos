"use client"

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import Header from "@/components/header";
import { supabase } from "@/lib/supabaseClient";

export default function BeatVaultPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [vault, setVault] = useState<any>(null);
  const [vaults, setVaults] = useState<any[]>([]);
  const [vaultBeats, setVaultBeats] = useState<Record<string, any[]>>({});
  const [hasVault, setHasVault] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [producer, setProducer] = useState<any>(null);
  const [producerCount, setProducerCount] = useState<number>(0);
  const [producers, setProducers] = useState<any[]>([]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    async function fetchVault() {
      if (!user) return;
      setPageLoading(true);
      // Get all producers by user id
      const { data: producerRows, error: producerError } = await supabase
        .from("producers")
        .select("*")
        .eq("user_id", user.id);
      if (producerError) console.error("Producer query error:", producerError);
      setProducers(producerRows || []);
      setProducerCount((producerRows || []).length);
      if (!producerRows || producerRows.length === 0) {
        setProducer(null);
        setPageLoading(false);
        return;
      }
      if (producerRows.length > 1) {
        setProducer(null);
        setPageLoading(false);
        return;
      }
      const producerData = producerRows[0];
      setProducer(producerData);
      // Get all vaults by producer id
      const { data: vaultRows, error: vaultError } = await supabase
        .from("beat_vault")
        .select("*")
        .eq("producer_id", producerData.id);
      if (vaultError) console.error("Vault query error:", vaultError);
      setVaults(vaultRows || []);
      setHasVault((vaultRows || []).length > 0);
      // For each vault, fetch its beats
      if (vaultRows && vaultRows.length > 0) {
        // Optionally, fetch beats for the first vault only, or for all vaults
        // Here, we'll fetch for all vaults and store as a map
        const beatsMap: Record<string, any[]> = {};
        for (const v of vaultRows) {
          const { data: beats, error: beatsError } = await supabase
            .from("beats")
            .select("*")
            .eq("vault_id", v.id);
          if (beatsError) console.error(`Beats query error for vault ${v.id}:`, beatsError);
          beatsMap[v.id] = beats || [];
        }
        setVaultBeats(beatsMap); // vaultBeats is now a map: { [vaultId]: beats[] }
      } else {
        setVaultBeats({});
      }
      setPageLoading(false);
    }
    if (user) fetchVault();
  }, [user]);

  const handleCreateVault = async () => {
    if (!user) return;
    // Get producer by user id
    const { data: producer, error: producerError } = await supabase
      .from("producers")
      .select("*")
      .eq("user_id", user.id)
      .single();
    if (producerError) console.error("Producer query error (create vault):", producerError);
    if (!producer) return;
    const { error } = await supabase
      .from("beat_vault")
      .insert({
        producer_id: producer.id,
        name: `${producer.display_name}'s Vault`,
        description: "Your private vault for unreleased or exclusive beats.",
        is_public: false,
      });
    if (error) {
      console.error("Vault insert error:", error);
    }
    if (!error) {
      toast({ title: "Vault Created", description: "Your Beat Vault has been created." });
      // Refetch vault
      const { data: vaultData, error: vaultError } = await supabase
        .from("beat_vault")
        .select("*")
        .eq("producer_id", producer.id)
        .single();
      if (vaultError) console.error("Vault query error (after create):", vaultError);
      setVault(vaultData);
      setHasVault(true);
    } else {
      toast({ title: "Error", description: "Failed to create vault.", variant: "destructive" });
    }
  };

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">My Beat Vault</h1>
        {/* Debug output for troubleshooting */}
        <div className="mb-4 p-2 bg-yellow-100 text-yellow-800 rounded">
          <div><b>Debug Info:</b></div>
          <div>User ID: {user?.id}</div>
          <div>Producers found: {producerCount}</div>
          <div>Producer(s): {producers && producers.length > 0 ? JSON.stringify(producers) : 'Not found'}</div>
          <div>Vaults: {vaults && vaults.length > 0 ? JSON.stringify(vaults) : 'Not found'}</div>
        </div>
        {pageLoading ? (
          <div>Loading...</div>
        ) : producerCount === 0 ? (
          <div className="text-center mb-4 text-red-600">No producer profile found for your account. Please create one or contact support.</div>
        ) : producerCount > 1 ? (
          <div className="text-center mb-4 text-red-600">Multiple producer profiles found for your account. Please contact support or clean up your data.</div>
        ) : !hasVault ? (
          <div className="text-center mb-4">
            <Button onClick={handleCreateVault} className="gradient-button text-black font-medium hover:text-white">
              Create Vault
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {vaults.map((v) => (
              <Card key={v.id}>
                <CardHeader>
                  <CardTitle>{v.name}</CardTitle>
                  <p className="mb-2">{v.description}</p>
                  {v.cover_image_url && (
                    <img src={v.cover_image_url} alt="Vault Cover" className="mb-4 w-48 h-48 object-cover rounded" />
                  )}
                </CardHeader>
                <CardContent>
                  <h3 className="font-semibold mb-2">Vault Beats</h3>
                  {vaultBeats && vaultBeats[v.id] && vaultBeats[v.id].length > 0 ? (
                    <ul className="space-y-2">
                      {vaultBeats[v.id].map((beat: any) => (
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
            ))}
          </div>
        )}
      </main>
    </>
  );
} 