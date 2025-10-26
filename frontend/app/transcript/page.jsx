"use client";

import { useEffect, useState, useRef } from "react";
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
  const [pendingItems, setPendingItems] = useState([]); // NEW: Track pending items
  const { toast } = useToast();
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  const pollIntervalRef = useRef(null);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 20; // 20 retries * 3 seconds = 60 seconds max

  const fetchTranscripts = async () => {
    try {
      const response = await getData(
        `${backendUrl}/api/transcripts`
      );
      const transcripts = response.transcripts || [];
      const sortedTranscripts = transcripts.sort((a, b) => {
        const dateA = new Date(a.date_generated);
        const dateB = new Date(b.date_generated);
        return dateB - dateA;
      });
      setResults(sortedTranscripts);
      return sortedTranscripts;
    } catch (err) {
      console.error("Failed to fetch transcripts:", err);
      return [];
    }
  };

  // Initial load
  useEffect(() => {
    fetchTranscripts();
  }, []);

  // Polling effect - starts when there are pending items
  useEffect(() => {
    if (pendingItems.length === 0) {
      // No pending items, stop polling
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      retryCountRef.current = 0;
      return;
    }

    // Start polling
    console.log(
      `🔄 Starting to poll for ${pendingItems.length} pending items`
    );

    pollIntervalRef.current = setInterval(async () => {
      retryCountRef.current++;
      console.log(
        `📡 Polling attempt ${retryCountRef.current}/${MAX_RETRIES}`
      );

      const latestResults = await fetchTranscripts();

      // Check if any pending items are now complete
      setPendingItems((prevPending) => {
        const stillPending = prevPending.filter(
          (pendingItem) => {
            // Try to find this item in the latest results
            const found = latestResults.find(
              (result) =>
                result.company_name ===
                  pendingItem.company_name &&
                result.transcript_text ===
                  pendingItem.transcript_text
            );

            if (found) {
              console.log(
                `✅ Found completed item: ${pendingItem.company_name}`
              );
              toast({
                title: "Success!",
                description: `Transcript for ${
                  pendingItem.company_name || "your meeting"
                } analyzed successfully`,
              });
              return false; // Remove from pending
            }

            // Check timeout
            const elapsedTime =
              Date.now() - pendingItem.timestamp;
            const timeoutMs = 60000; // 60 seconds

            if (elapsedTime > timeoutMs) {
              console.log(
                `⏱️ Timeout for item: ${pendingItem.company_name}`
              );
              toast({
                title: "Timeout",
                description:
                  "Analysis is taking longer than expected. Please refresh the page.",
                variant: "destructive",
              });
              return false; // Remove from pending
            }

            return true; // Still pending
          }
        );

        return stillPending;
      });

      // Stop polling if max retries reached
      if (retryCountRef.current >= MAX_RETRIES) {
        console.log(
          "⚠️ Max retries reached, stopping poll"
        );
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;

        setPendingItems((prev) => {
          if (prev.length > 0) {
            toast({
              title: "Processing",
              description:
                "Your transcript is still being processed. Refresh the page to see results.",
              variant: "default",
            });
          }
          return [];
        });
      }
    }, 3000); // Poll every 3 seconds

    // Cleanup on unmount
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [pendingItems.length]); // Re-run when pending items count changes

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!transcript.trim()) {
      setError("Please enter a transcript");
      return;
    }

    setIsLoading(true);

    try {
      // Call the enqueue endpoint
      const response = await postData(
        `${backendUrl}/api/transcript`,
        {
          transcript_text: transcript,
          company_name: company,
          attendees,
          date,
        }
      );

      // Check if queued successfully
      if (response.queued && response.status_code === 201) {
        // Add to pending items immediately
        const pendingItem = {
          id: `pending-${Date.now()}`,
          company_name: company,
          transcript_text: transcript,
          attendees,
          date,
          timestamp: Date.now(),
          status: "processing",
        };

        setPendingItems((prev) => [pendingItem, ...prev]);

        // Clear form
        setTranscript("");
        setCompany("");
        setAttendees("");
        setDate("");

        toast({
          title: "Processing",
          description:
            "Your transcript is being analyzed. Results will appear shortly.",
        });
      } else {
        throw new Error("Failed to queue transcript");
      }
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

  const handleDeleteLocal = (id) => {
    setResults((prev) =>
      prev.filter((item) => item.id !== id)
    );
  };

  const handleCancelPending = (id) => {
    setPendingItems((prev) =>
      prev.filter((item) => item.id !== id)
    );
    toast({
      title: "Cancelled",
      description: "Removed pending item from view",
    });
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
                ? "Submitting..."
                : "Analyze Transcript"}
            </Button>
          </form>
        </FormCard>

        {/* Show pending items and results */}
        <div className='mt-10'>
          <Feed
            results={results}
            pendingItems={pendingItems}
            onDelete={handleDeleteLocal}
            onCancelPending={handleCancelPending}
          />
        </div>
      </div>
    </div>
  );
}
