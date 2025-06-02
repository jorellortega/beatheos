import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

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
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Database Test Page</h1>
      
      {/* Add Name Form */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Add New Name</CardTitle>
        </CardHeader>
        <CardContent>
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
                className="min-w-[120px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Name'
                )}
              </Button>
            </div>
            
            {submitError && (
              <Alert variant="destructive">
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}
            
            {submitSuccess && (
              <Alert className="bg-green-50 border-green-200">
                <AlertDescription className="text-green-800">
                  {submitSuccess}
                </AlertDescription>
              </Alert>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Existing Names List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Existing Names</CardTitle>
          <Button 
            onClick={fetchNames}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              'Refresh Names'
            )}
          </Button>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2">
              {names.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No names found in the database.
                </p>
              ) : (
                names.map((item) => (
                  <div 
                    key={item.id}
                    className="p-4 bg-secondary/20 rounded-lg hover:bg-secondary/30 transition-colors"
                  >
                    {item.name}
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 