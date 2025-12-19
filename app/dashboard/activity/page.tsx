import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity } from 'lucide-react'

export default function ActivityPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Activity Feed</h1>
        <p className="text-gray-600 mt-2">Track all your engagement activity</p>
      </div>

      <Card className="max-w-md mx-auto mt-16">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <Activity className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle>Coming Soon</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-gray-600">
          <p>The activity feed showing all your LinkedIn engagement, pod actions, and campaign events is under development.</p>
        </CardContent>
      </Card>
    </div>
  )
}
