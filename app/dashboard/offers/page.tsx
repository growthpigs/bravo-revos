'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Edit, Globe, Download, Link, Mail } from 'lucide-react'
import { SmartBuilderModal } from '@/components/offers/smart-builder-modal'

export default function OffersPage() {
  const [showSmartBuilder, setShowSmartBuilder] = useState(false)
  const [offers, setOffers] = useState([
    {
      id: 1,
      name: "7 Steps to 10x Your LinkedIn Engagement",
      type: "PDF Guide",
      delivery: "Email",
      leads_captured: 247,
      conversion_rate: "34%",
      status: "active"
    },
    {
      id: 2,
      name: "My $100K Content Strategy Template",
      type: "Notion Template",
      delivery: "Link",
      leads_captured: 189,
      conversion_rate: "28%",
      status: "active"
    }
  ])

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Offers</h1>
        <p className="text-muted-foreground mt-2">
          Create valuable content that prospects want - PDFs, templates, checklists -
          delivered instantly via email capture or direct link
        </p>
      </div>

      {/* Create Offer Section - Kakiyo Style */}
      <Card className="mb-8 p-6 bg-gray-900/50 border-gray-800">
        <h2 className="text-lg font-semibold mb-4">Create New Offer</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setShowSmartBuilder(true)}
            className="p-6 border border-gray-700 rounded-lg hover:bg-gray-800 hover:border-gray-600 transition-all text-center group"
          >
            <FileText className="w-8 h-8 mx-auto mb-3 group-hover:text-blue-400" />
            <div className="font-medium mb-1">Smart Builder</div>
            <div className="text-sm text-muted-foreground">
              Answer 5 questions, AI creates your offer
            </div>
          </button>

          <button className="p-6 border border-gray-700 rounded-lg hover:bg-gray-800 hover:border-gray-600 transition-all text-center group">
            <Edit className="w-8 h-8 mx-auto mb-3 group-hover:text-blue-400" />
            <div className="font-medium mb-1">Manual Entry</div>
            <div className="text-sm text-muted-foreground">
              Write your own offer content
            </div>
          </button>

          <button className="p-6 border border-gray-700 rounded-lg hover:bg-gray-800 hover:border-gray-600 transition-all text-center group">
            <Globe className="w-8 h-8 mx-auto mb-3 group-hover:text-blue-400" />
            <div className="font-medium mb-1">Website Scraping</div>
            <div className="text-sm text-muted-foreground">
              Extract from existing content
            </div>
          </button>
        </div>
      </Card>

      {/* Existing Offers */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Your Offers</h2>
        <div className="space-y-4">
          {offers.map(offer => (
            <Card key={offer.id} className="p-5 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">{offer.name}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      offer.status === 'active'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {offer.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      {offer.type}
                    </span>
                    <span className="flex items-center gap-1">
                      {offer.delivery === 'Email' ? <Mail className="w-4 h-4" /> : <Link className="w-4 h-4" />}
                      {offer.delivery}
                    </span>
                    <span>📊 {offer.leads_captured} leads</span>
                    <span>🎯 {offer.conversion_rate} conversion</span>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button variant="outline" size="sm">Edit</Button>
                  <Button variant="outline" size="sm">Preview</Button>
                  <Button variant="outline" size="sm">Stats</Button>
                  <Button variant="destructive" size="sm">Delete</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Popular Offer Types */}
      <Card className="p-6 bg-blue-950/20 border-blue-900/50">
        <h3 className="font-semibold text-lg mb-4">🚀 Popular LinkedIn Offer Types</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">•</span>
              <div>
                <div className="font-medium">"How I did X" PDF guides</div>
                <div className="text-xs text-muted-foreground">Share your success story</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">•</span>
              <div>
                <div className="font-medium">Excel/Notion templates</div>
                <div className="text-xs text-muted-foreground">Ready-to-use tools</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">•</span>
              <div>
                <div className="font-medium">Checklists & frameworks</div>
                <div className="text-xs text-muted-foreground">Actionable processes</div>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">•</span>
              <div>
                <div className="font-medium">Case study breakdowns</div>
                <div className="text-xs text-muted-foreground">Real results analyzed</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">•</span>
              <div>
                <div className="font-medium">Swipe files & scripts</div>
                <div className="text-xs text-muted-foreground">Copy-paste templates</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">•</span>
              <div>
                <div className="font-medium">Resource lists</div>
                <div className="text-xs text-muted-foreground">Curated tools & links</div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Smart Builder Modal */}
      <SmartBuilderModal
        open={showSmartBuilder}
        onClose={() => setShowSmartBuilder(false)}
      />
    </div>
  )
}
