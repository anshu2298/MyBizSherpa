"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

export default function Feed({ results }) {
  const [copiedId, setCopiedId] = useState(null);

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

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
                  {result.title}
                </CardTitle>
                <CardDescription className='mt-1'>
                  {new Date(
                    result.timestamp
                  ).toLocaleString()}
                </CardDescription>
              </div>
              <Button
                variant='ghost'
                size='sm'
                onClick={() =>
                  handleCopy(result.output, result.id)
                }
                className='shrink-0'
              >
                {copiedId === result.id ? (
                  <Check className='h-4 w-4' />
                ) : (
                  <Copy className='h-4 w-4' />
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className='space-y-4'>
            {result.inputSummary && (
              <div>
                <h4 className='font-semibold text-sm text-gray-700 mb-2'>
                  Input Summary
                </h4>
                <p className='text-sm text-gray-600 bg-gray-50 p-4 rounded-lg'>
                  {result.inputSummary}
                </p>
              </div>
            )}
            <div>
              <h4 className='font-semibold text-sm text-gray-700 mb-2'>
                AI Insights
              </h4>
              <div className='text-sm text-gray-800 bg-blue-50 p-4 rounded-lg whitespace-pre-wrap'>
                {result.output}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
