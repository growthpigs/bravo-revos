import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageSquare } from 'lucide-react'

export default function InboxPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Inbox</h1>
        <p className="text-gray-600 mt-2">Unified messaging center</p>
      </div>

      <Card className="max-w-md mx-auto mt-16">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <MessageSquare className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle>Coming Soon</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-gray-600">
          <p>The unified inbox for LinkedIn messages, comments, and notifications is under development.</p>
        </CardContent>
      </Card>
    </div>
  )
}
