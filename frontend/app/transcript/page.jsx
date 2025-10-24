"use client";

import { useEffect, useState } from "react";
import FormCard from "@/components/FormCard";
import Feed from "@/components/Feed";
import Loader from "@/components/Loader";
import ErrorMessage from "@/components/ErrorMessage";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { postData, getData } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function TranscriptPage() {
  const [transcript, setTranscript] = useState("");
  const [company, setCompany] = useState("");
  const [attendees, setAttendees] = useState("");
  const [date, setDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState([]);
  const { toast } = useToast();

  console.log(results);

  const fetchTranscripts = async () => {
    try {
      const response = await getData(
        "http://127.0.0.1:8000/api/transcripts"
      );
      setResults(response.transcripts || []);
    } catch (err) {
      console.error("Failed to fetch transcripts:", err);
      toast({
        title: "Error",
        description: "Failed to load transcripts",
        variant: "destructive",
      });
    }
  };
  useEffect(() => {
    fetchTranscripts();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!transcript.trim()) {
      setError("Please enter a transcript");
      return;
    }

    setIsLoading(true);

    try {
      const response = await postData(
        "http://127.0.0.1:8000/api/transcript",
        {
          transcript,
          company,
          attendees,
          date,
        }
      );
      fetchTranscripts();
      setTranscript("");
      setCompany("");
      setAttendees("");
      setDate("");

      toast({
        title: "Success!",
        description: "Transcript analyzed successfully",
      });
    } catch (err) {
      setError(
        err.message ||
          "Failed to analyze transcript. Please try again."
      );
      toast({
        title: "Error",
        description:
          err.message || "Failed to analyze transcript",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='max-w-3xl mx-auto px-6 py-10'>
        <div className='mb-10'>
          <h1 className='text-4xl font-bold text-gray-900 mb-2'>
            Transcript Insight
          </h1>
          <p className='text-gray-600'>
            Paste your meeting transcript below and get
            AI-powered insights
          </p>
        </div>

        <ErrorMessage message={error} />

        <FormCard
          title='Analyze Transcript'
          description='Enter your transcript and optional metadata'
        >
          <form
            onSubmit={handleSubmit}
            className='flex flex-col gap-6'
          >
            <div>
              <Label htmlFor='transcript'>
                Transcript *
              </Label>
              <Textarea
                id='transcript'
                placeholder='Paste your transcript here...'
                value={transcript}
                onChange={(e) =>
                  setTranscript(e.target.value)
                }
                className='min-h-[200px] mt-2'
                disabled={isLoading}
              />
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div>
                <Label htmlFor='company'>Company</Label>
                <Input
                  id='company'
                  placeholder='e.g., Acme Corp'
                  value={company}
                  onChange={(e) =>
                    setCompany(e.target.value)
                  }
                  className='mt-2'
                  disabled={isLoading}
                />
              </div>

              <div>
                <Label htmlFor='attendees'>Attendees</Label>
                <Input
                  id='attendees'
                  placeholder='e.g., John, Sarah'
                  value={attendees}
                  onChange={(e) =>
                    setAttendees(e.target.value)
                  }
                  className='mt-2'
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <Label htmlFor='date'>Date</Label>
              <Input
                id='date'
                type='date'
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className='mt-2'
                disabled={isLoading}
              />
            </div>

            <Button
              type='submit'
              disabled={isLoading}
              className='w-full py-6 text-lg'
            >
              {isLoading
                ? "Analyzing..."
                : "Analyze Transcript"}
            </Button>
          </form>
        </FormCard>

        {isLoading && (
          <div className='mt-10'>
            <Loader />
          </div>
        )}

        {!isLoading && results.length > 0 && (
          <div className='mt-10'>
            <Feed results={results} />
          </div>
        )}
      </div>
    </div>
  );
}
