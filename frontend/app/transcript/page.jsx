"use client";

import { useEffect, useState, useRef } from "react";
import FormCard from "@/components/FormCard";
import Feed from "@/components/Feed";
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
  const [pendingItems, setPendingItems] = useState([]);
  const { toast } = useToast();
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  const pollIntervalRef = useRef(null);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 60; // 60 retries × 2s = 120s total (60s delay + 60s processing)
  const lastResultsCountRef = useRef(0); // Track when new results arrive

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

  // Polling effect with status updates
  useEffect(() => {
    if (pendingItems.length === 0) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      retryCountRef.current = 0;
      return;
    }

    console.log(
      `🔄 Polling for ${pendingItems.length} items`
    );

    pollIntervalRef.current = setInterval(async () => {
      retryCountRef.current++;
      const currentTime = Date.now();

      // Update status based on time elapsed
      setPendingItems((prevPending) => {
        return prevPending.map((item) => {
          const elapsedSeconds = Math.floor(
            (currentTime - item.timestamp) / 1000
          );

          // Status progression based on time
          if (
            item.status === "queued" &&
            elapsedSeconds >= 3
          ) {
            console.log(
              `📤 ${item.company_name}: Queued → Processing`
            );
            return { ...item, status: "processing" };
          }

          return item;
        });
      });

      // Check for completed items
      const latestResults = await fetchTranscripts();

      // Detect new results
      if (
        latestResults.length > lastResultsCountRef.current
      ) {
        console.log(
          `✅ New results detected: ${
            latestResults.length -
            lastResultsCountRef.current
          } new items`
        );
        lastResultsCountRef.current = latestResults.length;
      }

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
                `🎉 ${pendingItem.company_name}: Processing → Completed`
              );
              toast({
                title: "✅ Analysis Complete!",
                description: `Transcript for ${
                  pendingItem.company_name || "your meeting"
                } is ready`,
              });
              return false; // Remove from pending
            }

            // Check timeout
            const elapsedTime =
              Date.now() - pendingItem.timestamp;
            const timeoutMs = 90000; // 90 seconds

            if (elapsedTime > timeoutMs) {
              console.log(
                `⏱️ Timeout: ${pendingItem.company_name}`
              );
              toast({
                title: "Taking longer than expected",
                description:
                  "Please refresh the page to see results.",
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
        console.log("⚠️ Max retries reached");
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;

        setPendingItems((prev) => {
          if (prev.length > 0) {
            toast({
              title: "Still Processing",
              description:
                "Items are still being processed. Refresh to see results.",
            });
          }
          return [];
        });
      }
    }, 2000); // Poll every 2 seconds for more responsive updates

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [pendingItems.length]);

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
        `${backendUrl}/api/transcript`,
        {
          transcript_text: transcript,
          company_name: company,
          attendees,
          date,
        }
      );

      if (response.queued && response.status_code === 201) {
        // Add to pending items with "queued" status
        const pendingItem = {
          id: `pending-${Date.now()}-${Math.random()}`,
          company_name: company || "Unnamed Meeting",
          transcript_text: transcript,
          attendees,
          date,
          timestamp: Date.now(),
          status: "queued", // Initial status
          messageId: response.qstash_response_text,
        };

        setPendingItems((prev) => [pendingItem, ...prev]);

        // Clear form
        setTranscript("");
        setCompany("");
        setAttendees("");
        setDate("");

        toast({
          title: "🚀 Queued!",
          description:
            "Your transcript has been queued for analysis",
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
      description: "Removed item from queue view",
    });
  };

  // Quick submit helper for testing multiple requests
  const handleQuickSubmit = async (testData) => {
    try {
      const response = await postData(
        `${backendUrl}/api/transcript`,
        testData
      );

      if (response.queued && response.status_code === 201) {
        const pendingItem = {
          id: `pending-${Date.now()}-${Math.random()}`,
          company_name:
            testData.company_name || "Test Company",
          transcript_text: testData.transcript_text,
          attendees: testData.attendees,
          date: testData.date,
          timestamp: Date.now(),
          status: "queued",
          messageId: response.qstash_response_text,
        };

        setPendingItems((prev) => [pendingItem, ...prev]);
      }
    } catch (err) {
      console.error("Quick submit failed:", err);
    }
  };

  // Test button to submit 5 requests at once
  const handleTest5Requests = async () => {
    const testTranscripts = [
      {
        transcript_text:
          "Meeting 1: Discussed Q4 revenue goals and marketing strategy. Team agreed to increase ad spend by 20%.",
        company_name: "TechCorp Alpha",
        attendees: "John, Sarah",
        date: "2025-10-26",
      },
      {
        transcript_text:
          "Meeting 2: Product roadmap review. Feature X needs 2 more weeks. Beta launch scheduled for Nov 15.",
        company_name: "InnovateLabs Beta",
        attendees: "Mike, Lisa",
        date: "2025-10-26",
      },
      {
        transcript_text:
          "Meeting 3: Customer support metrics review. Response time improved by 40%. Need to hire 2 more agents.",
        company_name: "CustomerFirst Gamma",
        attendees: "Emma, David",
        date: "2025-10-26",
      },
      {
        transcript_text:
          "Meeting 4: Investor pitch practice. Refine slides 5-7. Focus more on unit economics and market size.",
        company_name: "StartupXYZ Delta",
        attendees: "Alex, Jennifer",
        date: "2025-10-26",
      },
      {
        transcript_text:
          "Meeting 5: Engineering standup. API integration 80% complete. Database migration scheduled for weekend.",
        company_name: "DevTeam Epsilon",
        attendees: "Tom, Rachel",
        date: "2025-10-26",
      },
    ];

    toast({
      title: "🚀 Submitting 5 Requests",
      description: "Watch them progress through the queue!",
    });

    // Submit all 5 with slight delays to see them queue up
    for (let i = 0; i < testTranscripts.length; i++) {
      await new Promise((resolve) =>
        setTimeout(resolve, 200)
      ); // 200ms between submissions
      await handleQuickSubmit(testTranscripts[i]);
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

        {/* Test Button */}
        <div className='mb-6'>
          <Button
            onClick={handleTest5Requests}
            variant='outline'
            className='w-full py-4 border-2 border-purple-300 hover:bg-purple-50'
          >
            🧪 Test Queue: Submit 5 Requests at Once
          </Button>
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

        {/* Queue Status Summary */}
        {pendingItems.length > 0 && (
          <div className='mt-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='font-semibold text-blue-900'>
                  Queue Status: {pendingItems.length}{" "}
                  item(s) processing
                </p>
                <p className='text-sm text-blue-700'>
                  {
                    pendingItems.filter(
                      (i) => i.status === "queued"
                    ).length
                  }{" "}
                  queued •{" "}
                  {
                    pendingItems.filter(
                      (i) => i.status === "processing"
                    ).length
                  }{" "}
                  processing
                </p>
              </div>
            </div>
          </div>
        )}

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
