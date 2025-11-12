'use client';

/**
 * Offers (Lead Magnets) Management UI
 * Create valuable content to capture leads
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, FileText, Video, Calendar, FileCode, GraduationCap } from 'lucide-react';

export default function OffersPage() {
  const offerTypes = [
    {
      icon: FileText,
      title: 'Free Guides & Ebooks',
      description: 'Downloadable PDF guides, checklists, and ebooks',
    },
    {
      icon: Video,
      title: 'Webinars & Workshops',
      description: 'Live or recorded educational sessions',
    },
    {
      icon: Calendar,
      title: 'Free Trials',
      description: 'Limited-time access to your product or service',
    },
    {
      icon: FileCode,
      title: 'Templates & Tools',
      description: 'Ready-to-use templates, spreadsheets, or tools',
    },
    {
      icon: GraduationCap,
      title: 'Email Courses',
      description: 'Multi-part educational email sequences',
    },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Offers (Lead Magnets)</h1>
          <p className="text-muted-foreground">
            Create valuable content to capture leads and grow your pipeline
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create New Offer
        </Button>
      </div>

      {/* Coming Soon Notice */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <GraduationCap className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Coming Soon</h3>
              <p className="text-blue-700 mb-4">
                Lead magnet creation and management will be available soon. This feature will help you create
                and distribute valuable content to capture and nurture leads.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Offer Types Overview */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Types of Lead Magnets You Can Create</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {offerTypes.map((type) => (
            <Card key={type.title} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <type.icon className="h-8 w-8 text-primary mb-2" />
                <CardTitle className="text-lg">{type.title}</CardTitle>
                <CardDescription>{type.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>

      {/* Use Cases */}
      <Card>
        <CardHeader>
          <CardTitle>How Lead Magnets Work</CardTitle>
          <CardDescription>
            Lead magnets are valuable free content that you offer in exchange for contact information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">1. Create Valuable Content</h4>
              <p className="text-sm text-muted-foreground">
                Design content that solves a specific problem for your target audience
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">2. Gate the Content</h4>
              <p className="text-sm text-muted-foreground">
                Require email or LinkedIn connection to access the content
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">3. Nurture the Lead</h4>
              <p className="text-sm text-muted-foreground">
                Follow up with relevant content and offers to move them through your pipeline
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">4. Convert to Customer</h4>
              <p className="text-sm text-muted-foreground">
                Build trust and demonstrate value to convert leads into paying customers
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
