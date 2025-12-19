import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Sparkles } from 'lucide-react'

export default function PromptsPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Prompts</h1>
        <p className="text-gray-600 mt-2">Manage AI prompt templates</p>
      </div>

      <Card className="max-w-md mx-auto mt-16">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
            <Sparkles className="h-8 w-8 text-purple-600" />
          </div>
          <CardTitle>Coming Soon</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-gray-600">
          <p>The prompt library for managing AI templates and content generation patterns is under development.</p>
        </CardContent>
      </Card>
    </div>
  )
}
