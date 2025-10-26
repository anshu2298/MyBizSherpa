"use client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Delete, Loader2, X } from "lucide-react";
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
      <h2 className='text-2xl font-bold text-gray-900'>
        Results Feed
      </h2>

      {/* PENDING ITEMS */}
      {pendingItems.map((item) => (
        <Card
          key={item.id}
          className='rounded-2xl shadow-sm border-2 border-blue-200 bg-blue-50/30'
        >
          <CardHeader>
            <div className='flex items-start justify-between'>
              <div className='flex-1'>
                <div className='flex items-center gap-2'>
                  <Loader2 className='h-5 w-5 text-blue-600 animate-spin' />
                  <CardTitle className='text-xl text-blue-900'>
                    Processing Transcript...
                  </CardTitle>
                </div>
                <CardDescription className='mt-1 text-blue-700'>
                  {item.company_name || "Your meeting"} •
                  Analyzing with AI
                </CardDescription>
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
              <p className='text-sm text-gray-600 bg-white p-4 rounded-lg line-clamp-3'>
                {item.transcript_text}
              </p>
            </div>
            <div className='bg-blue-100 p-4 rounded-lg'>
              <div className='flex items-center gap-2 text-sm text-blue-800'>
                <div className='flex gap-1'>
                  <div
                    className='w-2 h-2 bg-blue-600 rounded-full animate-bounce'
                    style={{ animationDelay: "0ms" }}
                  ></div>
                  <div
                    className='w-2 h-2 bg-blue-600 rounded-full animate-bounce'
                    style={{ animationDelay: "150ms" }}
                  ></div>
                  <div
                    className='w-2 h-2 bg-blue-600 rounded-full animate-bounce'
                    style={{ animationDelay: "300ms" }}
                  ></div>
                </div>
                <span className='font-medium'>
                  Generating AI insights
                </span>
              </div>
              <p className='text-xs text-blue-700 mt-2'>
                This usually takes 5-15 seconds. Results
                will appear automatically.
              </p>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* COMPLETED RESULTS */}
      {results.map((result) => (
        <Card
          key={result.id}
          className='rounded-2xl shadow-sm'
        >
          <CardHeader>
            <div className='flex items-start justify-between'>
              <div>
                <CardTitle className='text-xl'>
                  Transcript Feedback
                </CardTitle>
                <CardDescription className='mt-1'>
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
                <p className='text-sm text-gray-600 bg-gray-50 p-4 rounded-lg'>
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
