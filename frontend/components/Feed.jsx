"use client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Delete,
  Loader2,
  X,
  Clock,
  Zap,
  CheckCircle2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { deleteData } from "../lib/api.js";

export default function Feed({
  results,
  pendingItems = [],
  onDelete,
  onCancelPending,
}) {
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState(null);
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  const handleDelete = async (id) => {
    try {
      setDeletingId(id);
      await deleteData(
        `${backendUrl}/api/transcript/${id}`
      );
      toast({
        title: "Deleted",
        description: "Transcript deleted successfully",
      });
      onDelete(id);
    } catch (err) {
      console.error("Failed to delete transcript:", err);
      toast({
        title: "Error",
        description: "Failed to delete transcript",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  function formatDate(dateString) {
    if (!dateString) return "";
    const [year, month, day] = dateString.split("-");
    return `${day}/${month}/${year}`;
  }

  // Get status configuration
  const getStatusConfig = (status) => {
    switch (status) {
      case "queued":
        return {
          icon: Clock,
          iconColor: "text-yellow-600",
          bgColor: "bg-yellow-50/50",
          borderColor: "border-yellow-300",
          title: "⏳ Queued",
          subtitle: "Waiting in queue...",
          dotColor: "bg-yellow-500",
          badgeColor: "bg-yellow-100 text-yellow-800",
        };
      case "processing":
        return {
          icon: Zap,
          iconColor: "text-blue-600",
          bgColor: "bg-blue-50/50",
          borderColor: "border-blue-300",
          title: "🔄 Processing",
          subtitle: "AI is analyzing transcript...",
          dotColor: "bg-blue-500",
          badgeColor: "bg-blue-100 text-blue-800",
        };
      default:
        return {
          icon: Loader2,
          iconColor: "text-gray-600",
          bgColor: "bg-gray-50/50",
          borderColor: "border-gray-300",
          title: "Processing",
          subtitle: "Working on it...",
          dotColor: "bg-gray-500",
          badgeColor: "bg-gray-100 text-gray-800",
        };
    }
  };

  const hasAnyContent =
    results.length > 0 || pendingItems.length > 0;

  if (!hasAnyContent) {
    return (
      <div className='text-center py-12 text-gray-500'>
        <p>
          No results yet. Submit a form to see your analysis
          here.
        </p>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h2 className='text-2xl font-bold text-gray-900'>
          Results Feed
        </h2>
        {pendingItems.length > 0 && (
          <div className='flex items-center gap-2 text-sm'>
            <div className='flex items-center gap-1'>
              <div className='w-2 h-2 bg-yellow-500 rounded-full animate-pulse'></div>
              <span className='text-gray-600'>
                {
                  pendingItems.filter(
                    (i) => i.status === "queued"
                  ).length
                }{" "}
                queued
              </span>
            </div>
            <div className='flex items-center gap-1'>
              <div className='w-2 h-2 bg-blue-500 rounded-full animate-pulse'></div>
              <span className='text-gray-600'>
                {
                  pendingItems.filter(
                    (i) => i.status === "processing"
                  ).length
                }{" "}
                processing
              </span>
            </div>
          </div>
        )}
      </div>

      {/* PENDING ITEMS WITH STATUS */}
      {pendingItems.map((item) => {
        const config = getStatusConfig(item.status);
        const StatusIcon = config.icon;
        const elapsedSeconds = Math.floor(
          (Date.now() - item.timestamp) / 1000
        );

        return (
          <Card
            key={item.id}
            className={`rounded-2xl shadow-md border-2 ${config.borderColor} ${config.bgColor} transition-all duration-500`}
          >
            <CardHeader>
              <div className='flex items-start justify-between'>
                <div className='flex-1'>
                  <div className='flex items-center gap-3 mb-2'>
                    <StatusIcon
                      className={`h-6 w-6 ${
                        config.iconColor
                      } ${
                        item.status === "processing"
                          ? "animate-spin"
                          : "animate-pulse"
                      }`}
                    />
                    <div>
                      <div className='flex items-center gap-2'>
                        <CardTitle className='text-xl'>
                          {config.title}
                        </CardTitle>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.badgeColor}`}
                        >
                          {item.status.toUpperCase()}
                        </span>
                      </div>
                      <CardDescription className='mt-1'>
                        {item.company_name} •{" "}
                        {config.subtitle}
                      </CardDescription>
                    </div>
                  </div>

                  {/* Progress Timeline */}
                  <div className='mt-3 flex items-center gap-2'>
                    <div className='flex items-center gap-1.5'>
                      <div
                        className={`w-3 h-3 rounded-full ${
                          item.status === "queued" ||
                          item.status === "processing"
                            ? "bg-green-500"
                            : "bg-gray-300"
                        } flex items-center justify-center`}
                      >
                        {(item.status === "queued" ||
                          item.status === "processing") && (
                          <CheckCircle2 className='w-2 h-2 text-white' />
                        )}
                      </div>
                      <span className='text-xs text-gray-600'>
                        Queued
                      </span>
                    </div>

                    <div className='flex-1 h-0.5 bg-gray-300'>
                      <div
                        className={`h-full transition-all duration-500 ${
                          item.status === "processing"
                            ? "bg-blue-500 w-full"
                            : item.status === "queued"
                            ? "bg-yellow-500 w-1/3"
                            : "bg-gray-300 w-0"
                        }`}
                      />
                    </div>

                    <div className='flex items-center gap-1.5'>
                      <div
                        className={`w-3 h-3 rounded-full ${
                          item.status === "processing"
                            ? "bg-blue-500 animate-pulse"
                            : "bg-gray-300"
                        } flex items-center justify-center`}
                      >
                        {item.status === "processing" && (
                          <Loader2 className='w-2 h-2 text-white animate-spin' />
                        )}
                      </div>
                      <span className='text-xs text-gray-600'>
                        Processing
                      </span>
                    </div>

                    <div className='flex-1 h-0.5 bg-gray-300' />

                    <div className='flex items-center gap-1.5'>
                      <div className='w-3 h-3 rounded-full bg-gray-300' />
                      <span className='text-xs text-gray-600'>
                        Complete
                      </span>
                    </div>
                  </div>

                  {/* Time Elapsed */}
                  <div className='mt-2 text-xs text-gray-500'>
                    ⏱️ {elapsedSeconds}s elapsed
                  </div>
                </div>

                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => onCancelPending(item.id)}
                  className='shrink-0 hover:text-red-500 transition-colors'
                >
                  <X className='h-4 w-4' />
                </Button>
              </div>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div>
                <h4 className='font-semibold text-sm text-gray-700 mb-2'>
                  Input Preview
                </h4>
                <p className='text-sm text-gray-600 bg-white p-4 rounded-lg line-clamp-2'>
                  {item.transcript_text}
                </p>
              </div>

              {/* Status-specific messages */}
              <div
                className={`p-3 rounded-lg ${
                  item.status === "queued"
                    ? "bg-yellow-100"
                    : "bg-blue-100"
                }`}
              >
                <div className='flex items-center gap-2 text-sm'>
                  <div className='flex gap-1'>
                    <div
                      className={`w-2 h-2 ${config.dotColor} rounded-full animate-bounce`}
                      style={{ animationDelay: "0ms" }}
                    ></div>
                    <div
                      className={`w-2 h-2 ${config.dotColor} rounded-full animate-bounce`}
                      style={{ animationDelay: "150ms" }}
                    ></div>
                    <div
                      className={`w-2 h-2 ${config.dotColor} rounded-full animate-bounce`}
                      style={{ animationDelay: "300ms" }}
                    ></div>
                  </div>
                  <span
                    className={`font-medium ${
                      item.status === "queued"
                        ? "text-yellow-800"
                        : "text-blue-800"
                    }`}
                  >
                    {item.status === "queued"
                      ? "In queue - will start processing shortly"
                      : "AI is analyzing your transcript with Groq"}
                  </span>
                </div>
                <p
                  className={`text-xs mt-2 ${
                    item.status === "queued"
                      ? "text-yellow-700"
                      : "text-blue-700"
                  }`}
                >
                  {item.status === "queued"
                    ? "Your request is queued. Processing will begin in a few seconds."
                    : "Generating insights and extracting key information. Results will appear automatically."}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* COMPLETED RESULTS */}
      {results.map((result) => (
        <Card
          key={result.id}
          className='rounded-2xl shadow-sm border-2 border-green-200 bg-green-50/20'
        >
          <CardHeader>
            <div className='flex items-start justify-between'>
              <div className='flex-1'>
                <div className='flex items-center gap-2 mb-1'>
                  <CheckCircle2 className='h-5 w-5 text-green-600' />
                  <CardTitle className='text-xl'>
                    ✅ Completed
                  </CardTitle>
                </div>
                <CardDescription className='mt-1'>
                  {result.company_name || "Transcript"} •{" "}
                  {formatDate(result.date)}
                </CardDescription>
              </div>
              <Button
                variant='ghost'
                size='sm'
                disabled={deletingId === result.id}
                onClick={() => handleDelete(result.id)}
                className='shrink-0 hover:text-red-500 transition-colors'
              >
                <Delete className='h-4 w-4' />
              </Button>
            </div>
          </CardHeader>
          <CardContent className='space-y-4'>
            {result.transcript_text && (
              <div>
                <h4 className='font-semibold text-sm text-gray-700 mb-2'>
                  Input Summary
                </h4>
                <p className='text-sm text-gray-600 bg-white p-4 rounded-lg'>
                  {result.transcript_text}
                </p>
              </div>
            )}
            <div>
              <h4 className='font-semibold text-sm text-gray-700 mb-2'>
                AI Insights
              </h4>
              <div className='text-sm text-gray-800 bg-blue-50 p-4 rounded-lg whitespace-pre-wrap'>
                {result.ai_summary}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
