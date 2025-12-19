import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Search } from 'lucide-react'

export default function LeadFinderPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Lead Finder</h1>
        <p className="text-gray-600 mt-2">Discover and qualify new leads</p>
      </div>

      <Card className="max-w-md mx-auto mt-16">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mb-4">
            <Search className="h-8 w-8 text-teal-600" />
          </div>
          <CardTitle>Coming Soon</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-gray-600">
          <p>The lead finder with advanced search, LinkedIn profile discovery, and ICP matching is under development.</p>
        </CardContent>
      </Card>
    </div>
  )
}
