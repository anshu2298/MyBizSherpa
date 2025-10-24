import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileText, Linkedin } from "lucide-react";

export default function Home() {
  return (
    <div className='min-h-screen bg-gray-50 overflow-hidden'>
      <div className='max-w-5xl mx-auto px-6 py-16'>
        <div className='text-center mb-16'>
          <h1 className='text-5xl font-bold text-gray-900 mb-4'>
            Welcome to MyBizSherpa
          </h1>
          <p className='text-xl text-gray-600'>
            AI-powered tools to help you analyze transcripts
            and craft perfect LinkedIn icebreakers
          </p>
        </div>

        <div className='grid md:grid-cols-2 gap-8'>
          <Link
            href='/transcript'
            className='group'
          >
            <Card className='rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 h-full cursor-pointer border-2 hover:border-gray-300'>
              <CardHeader className='pb-4'>
                <div className='w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors'>
                  <FileText className='h-7 w-7 text-blue-600' />
                </div>
                <CardTitle className='text-2xl'>
                  Transcript Insight
                </CardTitle>
                <CardDescription className='text-base'>
                  Paste your meeting transcripts and get
                  AI-powered insights, summaries, and action
                  items
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className='text-sm text-gray-500'>
                  Perfect for analyzing sales calls,
                  meetings, and interviews
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link
            href='/linkedin'
            className='group'
          >
            <Card className='rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 h-full cursor-pointer border-2 hover:border-gray-300'>
              <CardHeader className='pb-4'>
                <div className='w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-green-200 transition-colors'>
                  <Linkedin className='h-7 w-7 text-green-600' />
                </div>
                <CardTitle className='text-2xl'>
                  LinkedIn Icebreaker
                </CardTitle>
                <CardDescription className='text-base'>
                  Generate personalized icebreakers based on
                  LinkedIn profiles and your pitch deck
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className='text-sm text-gray-500'>
                  Create compelling outreach messages that
                  get responses
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
