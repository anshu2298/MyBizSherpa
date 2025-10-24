'use client';

import { useState } from 'react';
import FormCard from '@/components/FormCard';
import Feed from '@/components/Feed';
import Loader from '@/components/Loader';
import ErrorMessage from '@/components/ErrorMessage';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { postData } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Upload } from 'lucide-react';

export default function LinkedInPage() {
  const [linkedinBio, setLinkedinBio] = useState('');
  const [pitchDeck, setPitchDeck] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState([]);
  const { toast } = useToast();

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPitchDeck(event.target?.result);
      };
      reader.readAsText(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!linkedinBio.trim()) {
      setError('Please enter a LinkedIn bio or about section');
      return;
    }

    setIsLoading(true);

    try {
      const response = await postData('/api/linkedin', {
        linkedinBio,
        pitchDeck,
      });

      const newResult = {
        id: Date.now(),
        title: 'LinkedIn Icebreaker',
        timestamp: new Date().toISOString(),
        inputSummary: linkedinBio.substring(0, 150) + '...',
        output: response.icebreaker || response.message || 'Icebreaker generated successfully!',
      };

      setResults([newResult, ...results]);

      setLinkedinBio('');
      setPitchDeck('');

      toast({
        title: 'Success!',
        description: 'Icebreaker generated successfully',
      });
    } catch (err) {
      setError(err.message || 'Failed to generate icebreaker. Please try again.');
      toast({
        title: 'Error',
        description: err.message || 'Failed to generate icebreaker',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">LinkedIn Icebreaker</h1>
          <p className="text-gray-600">
            Generate personalized icebreakers based on LinkedIn profiles
          </p>
        </div>

        <ErrorMessage message={error} />

        <FormCard
          title="Generate Icebreaker"
          description="Enter LinkedIn bio and optional pitch deck information"
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div>
              <Label htmlFor="linkedinBio">LinkedIn About / Bio *</Label>
              <Textarea
                id="linkedinBio"
                placeholder="Paste the LinkedIn 'About' section or bio here..."
                value={linkedinBio}
                onChange={(e) => setLinkedinBio(e.target.value)}
                className="min-h-[180px] mt-2"
                disabled={isLoading}
              />
            </div>

            <div>
              <Label htmlFor="pitchDeck">Pitch Deck Text (Optional)</Label>
              <Textarea
                id="pitchDeck"
                placeholder="Paste your pitch deck text here or upload a file below..."
                value={pitchDeck}
                onChange={(e) => setPitchDeck(e.target.value)}
                className="min-h-[120px] mt-2"
                disabled={isLoading}
              />
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <Label
                htmlFor="fileUpload"
                className="cursor-pointer text-sm text-gray-600 hover:text-gray-900"
              >
                Or upload pitch deck file (.txt)
              </Label>
              <input
                id="fileUpload"
                type="file"
                accept=".txt"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full py-6 text-lg"
            >
              {isLoading ? 'Generating...' : 'Generate Icebreaker'}
            </Button>
          </form>
        </FormCard>

        {isLoading && (
          <div className="mt-10">
            <Loader />
          </div>
        )}

        {!isLoading && results.length > 0 && (
          <div className="mt-10">
            <Feed results={results} />
          </div>
        )}
      </div>
    </div>
  );
}
