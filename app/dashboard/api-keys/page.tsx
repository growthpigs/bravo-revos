import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Key } from 'lucide-react'

export default function ApiKeysPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">API Keys</h1>
        <p className="text-gray-600 mt-2">Manage your API integrations</p>
      </div>

      <Card className="max-w-md mx-auto mt-16">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
            <Key className="h-8 w-8 text-orange-600" />
          </div>
          <CardTitle>Coming Soon</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-gray-600">
          <p>The API keys management page for webhook integrations and developer access is under development.</p>
        </CardContent>
      </Card>
    </div>
  )
}
