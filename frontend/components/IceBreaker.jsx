"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Delete, Loader2, X, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { deleteData } from "../lib/api.js";

export default function IceBreaker({
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
        `${backendUrl}/api/icebreaker/${id}`
      );
      toast({
        title: "Deleted",
        description: "Icebreaker deleted successfully",
      });
      onDelete(id);
    } catch (err) {
      console.error("Failed to delete icebreaker:", err);
      toast({
        title: "Error",
        description: "Failed to delete icebreaker",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  function renderBoldHeadings(text) {
    if (!text) return null;
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={index}>{part.slice(2, -2)}</strong>
        );
      }
      return part;
    });
  }

  function formatDate(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(
      2,
      "0"
    );
    const year = date.getFullYear();
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
          className='rounded-2xl shadow-sm border-2 border-purple-200 bg-purple-50/30'
        >
          <CardHeader>
            <div className='flex items-start justify-between'>
              <div className='flex-1'>
                <div className='flex items-center gap-2'>
                  <Sparkles className='h-5 w-5 text-purple-600 animate-pulse' />
                  <CardTitle className='text-xl text-purple-900'>
                    Generating Icebreaker...
                  </CardTitle>
                </div>
                <CardDescription className='mt-1 text-purple-700'>
                  {item.company_name || "Your prospect"} •
                  Crafting personalized message
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
                LinkedIn Bio Preview
              </h4>
              <p className='text-sm text-gray-600 bg-white p-4 rounded-lg line-clamp-3'>
                {item.linkedin_bio}
              </p>
            </div>
            <div className='bg-purple-100 p-4 rounded-lg'>
              <div className='flex items-center gap-2 text-sm text-purple-800'>
                <div className='flex gap-1'>
                  <div
                    className='w-2 h-2 bg-purple-600 rounded-full animate-bounce'
                    style={{ animationDelay: "0ms" }}
                  ></div>
                  <div
                    className='w-2 h-2 bg-purple-600 rounded-full animate-bounce'
                    style={{ animationDelay: "150ms" }}
                  ></div>
                  <div
                    className='w-2 h-2 bg-purple-600 rounded-full animate-bounce'
                    style={{ animationDelay: "300ms" }}
                  ></div>
                </div>
                <span className='font-medium'>
                  AI is analyzing profile and crafting
                  message
                </span>
              </div>
              <p className='text-xs text-purple-700 mt-2'>
                This usually takes 5-15 seconds. Your
                personalized icebreaker will appear
                automatically.
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
                  {`Icebreaker for ${result.company_name}`}
                </CardTitle>
                <CardDescription className='mt-1'>
                  {formatDate(result.date_generated)}
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
            <div>
              <h4 className='font-semibold text-sm text-gray-700 mb-2'>
                AI Generated Icebreaker
              </h4>
              <div className='text-sm text-gray-800 bg-blue-50 p-4 rounded-lg whitespace-pre-wrap'>
                {renderBoldHeadings(result.icebreaker_text)}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
