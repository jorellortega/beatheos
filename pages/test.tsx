import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface TestName {
  id: number;
  name: string;
}

export default function TestPage() {
  const [names, setNames] = useState<TestName[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const fetchNames = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/test-db');
      if (!response.ok) {
        throw new Error('Failed to fetch names');
      }
      const data = await response.json();
      setNames(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      setIsSubmitting(true);
      setSubmitError(null);
      setSubmitSuccess(null);

      const response = await fetch('/api/add-name', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newName.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to add name');
      }

      setSubmitSuccess('Name added successfully!');
      setNewName('');
      fetchNames(); // Refresh the list
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to add name');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    fetchNames();
  }, []);

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Database Test Page</h1>
      
      {/* Add Name Form */}
      <div className="mb-8 p-6 bg-secondary/20 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Add New Name</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-4">
            <Input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter a name"
              className="flex-1"
              disabled={isSubmitting}
            />
            <Button 
              type="submit"
              disabled={isSubmitting || !newName.trim()}
            >
              {isSubmitting ? 'Adding...' : 'Add Name'}
            </Button>
          </div>
          
          {submitError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {submitError}
            </div>
          )}
          
          {submitSuccess && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              {submitSuccess}
            </div>
          )}
        </form>
      </div>

      {/* Existing Names List */}
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-xl font-semibold">Existing Names</h2>
        <Button 
          onClick={fetchNames}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Refresh Names'}
        </Button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <p>Loading names...</p>
      ) : (
        <div className="space-y-2">
          {names.length === 0 ? (
            <p>No names found in the database.</p>
          ) : (
            names.map((item) => (
              <div 
                key={item.id}
                className="p-4 bg-secondary rounded-lg"
              >
                {item.name}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
} 