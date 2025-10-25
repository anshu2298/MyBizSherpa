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

  const handleDelete = async (id) => {
    try {
      setDeletingId(id);
      await deleteData(
        `http://127.0.0.1:8000/api/icebreaker/${id}`
      );
      toast({
        title: "Deleted",
        description: "Ice breaker deleted successfully",
      });
      onDelete(id);
    } catch (err) {
      console.error("Failed to delete Ice breaker:", err);
      toast({
        title: "Error",
        description: "Failed to delete Ice breaker",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  function renderBoldHeadings(text) {
    if (!text) return null;

    // Split by '**' and map over the parts
    const parts = text.split(/(\*\*.*?\*\*)/g); // capture **...** blocks
    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={index}>
            {part.slice(2, -2)} {/* remove the ** */}
          </strong>
        );
      }
      return part; // normal text
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
                AI Insights
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
