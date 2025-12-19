import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3 } from 'lucide-react'

export default function AnalyticsPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-600 mt-2">Performance metrics and insights</p>
      </div>

      <Card className="max-w-md mx-auto mt-16">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
            <BarChart3 className="h-8 w-8 text-indigo-600" />
          </div>
          <CardTitle>Coming Soon</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-gray-600">
          <p>The analytics dashboard with engagement metrics, ROI tracking, and campaign performance is under development.</p>
        </CardContent>
      </Card>
    </div>
  )
}
