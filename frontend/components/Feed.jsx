"use client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Delete } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { deleteData } from "../lib/api.js";

export default function Feed({ results, onDelete }) {
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

  if (!results || results.length === 0) {
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
                <Delete className='h-4 w-4  ' />
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
