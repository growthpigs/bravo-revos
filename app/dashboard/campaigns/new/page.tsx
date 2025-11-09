'use client'

import { useRouter } from 'next/navigation'
import CampaignWizard from '@/components/dashboard/campaign-wizard'

export default function NewCampaignPage() {
  const router = useRouter()

  const handleComplete = () => {
    router.push('/dashboard/campaigns')
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Create New Campaign</h1>
        <p className="text-gray-600 mt-2">
          Follow these steps to set up your LinkedIn lead generation campaign
        </p>
      </div>

      <CampaignWizard onComplete={handleComplete} />
    </div>
  )
}
