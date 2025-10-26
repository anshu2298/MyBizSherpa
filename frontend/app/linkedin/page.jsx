"use client";

import { useEffect, useState, useRef } from "react";
import FormCard from "@/components/FormCard";
import IceBreaker from "@/components/IceBreaker";
import Loader from "@/components/Loader";
import ErrorMessage from "@/components/ErrorMessage";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { postData, getData } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Upload } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function LinkedInPage() {
  const [companyName, setCompanyName] = useState("");
  const [linkedinBio, setLinkedinBio] = useState("");
  const [pitchDeck, setPitchDeck] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState([]);
  const [pendingItems, setPendingItems] = useState([]); // NEW: Track pending items
  const { toast } = useToast();
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  const pollIntervalRef = useRef(null);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 20; // 20 retries * 3 seconds = 60 seconds max

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

  const fetchIcebreaker = async () => {
    try {
      const response = await getData(
        `${backendUrl}/api/all_icebreker`
      );
      const icebreakers =
        response.linkedin_icebreakers || [];
      const sortedIcebreakers = icebreakers.sort((a, b) => {
        const dateA = new Date(a.date_generated);
        const dateB = new Date(b.date_generated);
        return dateB - dateA;
      });
      setResults(sortedIcebreakers);
      return sortedIcebreakers;
    } catch (err) {
      console.error("Failed to fetch icebreaker:", err);
      return [];
    }
  };

  // Initial load
  useEffect(() => {
    fetchIcebreaker();
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
      `🔄 Starting to poll for ${pendingItems.length} pending icebreakers`
    );

    pollIntervalRef.current = setInterval(async () => {
      retryCountRef.current++;
      console.log(
        `📡 Polling attempt ${retryCountRef.current}/${MAX_RETRIES}`
      );

      const latestResults = await fetchIcebreaker();

      // Check if any pending items are now complete
      setPendingItems((prevPending) => {
        const stillPending = prevPending.filter(
          (pendingItem) => {
            // Try to find this item in the latest results
            const found = latestResults.find(
              (result) =>
                result.company_name ===
                  pendingItem.company_name &&
                result.linkedin_bio ===
                  pendingItem.linkedin_bio
            );

            if (found) {
              console.log(
                `✅ Found completed icebreaker: ${pendingItem.company_name}`
              );
              toast({
                title: "Success!",
                description: `Icebreaker for ${
                  pendingItem.company_name ||
                  "your prospect"
                } generated successfully`,
              });
              return false; // Remove from pending
            }

            // Check timeout
            const elapsedTime =
              Date.now() - pendingItem.timestamp;
            const timeoutMs = 60000; // 60 seconds

            if (elapsedTime > timeoutMs) {
              console.log(
                `⏱️ Timeout for icebreaker: ${pendingItem.company_name}`
              );
              toast({
                title: "Timeout",
                description:
                  "Generation is taking longer than expected. Please refresh the page.",
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
                "Your icebreaker is still being generated. Refresh the page to see results.",
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

    if (!linkedinBio.trim()) {
      setError(
        "Please enter a LinkedIn bio or about section"
      );
      return;
    }

    setIsLoading(true);

    try {
      // Call the enqueue endpoint
      const response = await postData(
        `${backendUrl}/api/icebreaker`,
        {
          company_name: companyName,
          linkedin_bio: linkedinBio,
          pitch_deck: pitchDeck,
        }
      );

      // Check if queued successfully
      if (response.queued && response.status_code === 201) {
        // Add to pending items immediately
        const pendingItem = {
          id: `pending-${Date.now()}`,
          company_name: companyName,
          linkedin_bio: linkedinBio,
          pitch_deck: pitchDeck,
          timestamp: Date.now(),
          status: "processing",
        };

        setPendingItems((prev) => [pendingItem, ...prev]);

        // Clear form
        setLinkedinBio("");
        setPitchDeck("");
        setCompanyName("");

        toast({
          title: "Processing",
          description:
            "Your icebreaker is being generated. Results will appear shortly.",
        });
      } else {
        throw new Error("Failed to queue icebreaker");
      }
    } catch (err) {
      setError(
        err.message ||
          "Failed to generate icebreaker. Please try again."
      );
      toast({
        title: "Error",
        description:
          err.message || "Failed to generate icebreaker",
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
            LinkedIn Icebreaker
          </h1>
          <p className='text-gray-600'>
            Generate personalized icebreakers based on
            LinkedIn profiles
          </p>
        </div>

        <ErrorMessage message={error} />

        <FormCard
          title='Generate Icebreaker'
          description='Enter LinkedIn bio and optional pitch deck information'
        >
          <form
            onSubmit={handleSubmit}
            className='flex flex-col gap-6'
          >
            <div>
              <Label htmlFor='companyName'>
                Company Name
              </Label>
              <Input
                id='companyName'
                placeholder='Enter Company Name'
                value={companyName}
                onChange={(e) =>
                  setCompanyName(e.target.value)
                }
                className='min-h-[20px] mt-2'
                disabled={isLoading}
              />
            </div>
            <div>
              <Label htmlFor='linkedinBio'>
                LinkedIn About / Bio *
              </Label>
              <Textarea
                id='linkedinBio'
                placeholder="Paste the LinkedIn 'About' section or bio here..."
                value={linkedinBio}
                onChange={(e) =>
                  setLinkedinBio(e.target.value)
                }
                className='min-h-[180px] mt-2'
                disabled={isLoading}
              />
            </div>

            <div>
              <Label htmlFor='pitchDeck'>
                Pitch Deck Text (Optional)
              </Label>
              <Textarea
                id='pitchDeck'
                placeholder='Paste your pitch deck text here or upload a file below...'
                value={pitchDeck}
                onChange={(e) =>
                  setPitchDeck(e.target.value)
                }
                className='min-h-[120px] mt-2'
                disabled={isLoading}
              />
            </div>

            <div className='border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors'>
              <Upload className='h-8 w-8 text-gray-400 mx-auto mb-2' />
              <Label
                htmlFor='fileUpload'
                className='cursor-pointer text-sm text-gray-600 hover:text-gray-900'
              >
                Or upload pitch deck file (.txt)
              </Label>
              <input
                id='fileUpload'
                type='file'
                accept='.txt'
                onChange={handleFileUpload}
                className='hidden'
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
                : "Generate Icebreaker"}
            </Button>
          </form>
        </FormCard>

        {/* Show pending items and results */}
        <div className='mt-10'>
          <IceBreaker
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
