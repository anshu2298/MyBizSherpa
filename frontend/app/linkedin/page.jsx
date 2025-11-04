"use client";

import { useEffect, useState, useRef } from "react";
import FormCard from "@/components/FormCard";
import IceBreaker from "@/components/IceBreaker";
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
  const [pendingItems, setPendingItems] = useState([]);
  const { toast } = useToast();
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  const pollIntervalRef = useRef(null);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 60; // 60 retries × 2s = 120s total (60s delay + 60s processing)
  const lastResultsCountRef = useRef(0);

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

  useEffect(() => {
    fetchIcebreaker();
  }, []);

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
      `🔄 Polling for ${pendingItems.length} icebreakers`
    );

    pollIntervalRef.current = setInterval(async () => {
      retryCountRef.current++;
      const currentTime = Date.now();

      setPendingItems((prevPending) => {
        return prevPending.map((item) => {
          const elapsedSeconds = Math.floor(
            (currentTime - item.timestamp) / 1000
          );

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

      const latestResults = await fetchIcebreaker();

      if (
        latestResults.length > lastResultsCountRef.current
      ) {
        console.log(
          `✅ New icebreakers: ${
            latestResults.length -
            lastResultsCountRef.current
          }`
        );
        lastResultsCountRef.current = latestResults.length;
      }

      setPendingItems((prevPending) => {
        const stillPending = prevPending.filter(
          (pendingItem) => {
            const found = latestResults.find(
              (result) =>
                result.company_name ===
                  pendingItem.company_name &&
                result.linkedin_bio ===
                  pendingItem.linkedin_bio
            );

            if (found) {
              console.log(
                `🎉 ${pendingItem.company_name}: Processing → Completed`
              );
              toast({
                title: "✅ Icebreaker Ready!",
                description: `Personalized message for ${
                  pendingItem.company_name ||
                  "your prospect"
                } is ready`,
              });
              return false;
            }

            const elapsedTime =
              Date.now() - pendingItem.timestamp;
            if (elapsedTime > 90000) {
              console.log(
                `⏱️ Timeout: ${pendingItem.company_name}`
              );
              toast({
                title: "Taking longer than expected",
                description:
                  "Please refresh to see results.",
                variant: "destructive",
              });
              return false;
            }

            return true;
          }
        );

        return stillPending;
      });

      if (retryCountRef.current >= MAX_RETRIES) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
        setPendingItems([]);
      }
    }, 2000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [pendingItems.length]);

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
      const response = await postData(
        `${backendUrl}/api/icebreaker`,
        {
          company_name: companyName,
          linkedin_bio: linkedinBio,
          pitch_deck: pitchDeck,
        }
      );

      if (response.queued && response.status_code === 201) {
        const pendingItem = {
          id: `pending-${Date.now()}-${Math.random()}`,
          company_name: companyName || "Prospect",
          linkedin_bio: linkedinBio,
          pitch_deck: pitchDeck,
          timestamp: Date.now(),
          status: "queued",
          messageId: response.qstash_response_text,
        };

        setPendingItems((prev) => [pendingItem, ...prev]);
        setLinkedinBio("");
        setPitchDeck("");
        setCompanyName("");

        toast({
          title: "🚀 Queued!",
          description:
            "Your icebreaker request has been queued",
        });
      } else {
        throw new Error("Failed to queue icebreaker");
      }
    } catch (err) {
      setError(
        err.message || "Failed to generate icebreaker."
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
      description: "Removed from queue view",
    });
  };

  const handleQuickSubmit = async (testData) => {
    try {
      const response = await postData(
        `${backendUrl}/api/icebreaker`,
        testData
      );

      if (response.queued && response.status_code === 201) {
        const pendingItem = {
          id: `pending-${Date.now()}-${Math.random()}`,
          company_name: testData.company_name,
          linkedin_bio: testData.linkedin_bio,
          pitch_deck: testData.pitch_deck,
          timestamp: Date.now(),
          status: "queued",
        };

        setPendingItems((prev) => [pendingItem, ...prev]);
      }
    } catch (err) {
      console.error("Quick submit failed:", err);
    }
  };

  const handleTest5Requests = async () => {
    const testData = [
      {
        company_name: "DataFlow AI",
        linkedin_bio:
          "Sarah Chen - CEO of DataFlow AI. Former Salesforce PM. Stanford MBA. Democratizing data analytics for SMBs.",
        pitch_deck:
          "AI-powered analytics for small businesses. $500K ARR. Raising Series A.",
      },
      {
        company_name: "CloudSecure",
        linkedin_bio:
          "Michael Rodriguez - VP Sales at CloudSecure. 15+ years in cybersecurity. Former Palo Alto Networks.",
        pitch_deck:
          "Zero-trust security for enterprises. 500+ Fortune 1000 customers. $50M Series B.",
      },
      {
        company_name: "BrandBoost",
        linkedin_bio:
          "Jessica Park - Head of Marketing at BrandBoost. Growth expert. Former Warby Parker and Glossier.",
        pitch_deck:
          "AI marketing platform for DTC brands. 1,200+ customers. Recently raised $8M Series A.",
      },
      {
        company_name: "DevTools Pro",
        linkedin_bio:
          "Tom Anderson - CTO at DevTools Pro. 20 years building dev tools. MIT Computer Science.",
        pitch_deck:
          "Developer productivity tools. Used by 50K+ developers. Self-funded and profitable.",
      },
      {
        company_name: "HealthTech Inc",
        linkedin_bio:
          "Dr. Lisa Wong - Founder of HealthTech Inc. Johns Hopkins MD. Using AI to improve patient outcomes.",
        pitch_deck:
          "AI-powered healthcare diagnostics. Partnered with 20+ hospitals. $3M seed round.",
      },
    ];

    toast({
      title: "🚀 Submitting 5 Requests",
      description: "Watch them progress through the queue!",
    });

    for (let i = 0; i < testData.length; i++) {
      await new Promise((resolve) =>
        setTimeout(resolve, 200)
      );
      await handleQuickSubmit(testData[i]);
    }
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

        {pendingItems.length > 0 && (
          <div className='mt-6 p-4 bg-purple-50 border-2 border-purple-200 rounded-lg'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='font-semibold text-purple-900'>
                  Queue Status: {pendingItems.length}{" "}
                  item(s) processing
                </p>
                <p className='text-sm text-purple-700'>
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
