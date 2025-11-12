'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Zap,
  Mail,
  Users,
  Mic,
  Globe,
  MessageSquare,
  BarChart3,
  Settings,
  ChevronRight,
  Cpu,
  Package
} from 'lucide-react'

interface Cartridge {
  id: string
  name: string
  description: string
  category: string
  chips: Chip[]
  status: 'active' | 'inactive' | 'coming_soon'
  icon: any
}

interface Chip {
  id: string
  name: string
  description: string
  status: 'active' | 'error' | 'disabled'
}

export default function CartridgesPage() {
  const [activeTab, setActiveTab] = useState('all')

  // This represents our full cartridge system
  const cartridges: Cartridge[] = [
    {
      id: 'linkedin',
      name: 'LinkedIn Cartridge',
      description: 'Complete LinkedIn automation and engagement',
      category: 'channel',
      status: 'active',
      icon: Globe,
      chips: [
        { id: 'campaign', name: 'Campaign Chip', description: 'Create and manage campaigns', status: 'active' },
        { id: 'publishing', name: 'Publishing Chip', description: 'Schedule and post content', status: 'active' },
        { id: 'dm-scraper', name: 'DM Scraper Chip', description: 'Extract emails from messages', status: 'active' },
        { id: 'analytics', name: 'Analytics Chip', description: 'Track performance', status: 'active' }
      ]
    },
    {
      id: 'pod',
      name: 'Pod Cartridge',
      description: 'Viral amplification through coordinated engagement',
      category: 'amplification',
      status: 'active',
      icon: Users,
      chips: [
        { id: 'coordination', name: 'Pod Coordination Chip', description: 'Manage pod activities', status: 'active' },
        { id: 'auto-repost', name: 'Auto-Repost Chip', description: 'Automated resharing', status: 'disabled' },
        { id: 'rewards', name: 'Rewards Chip', description: 'Credit system for participation', status: 'active' }
      ]
    },
    {
      id: 'voice',
      name: 'Voice Cartridge',
      description: 'AI personality and tone management',
      category: 'personality',
      status: 'active',
      icon: Mic,
      chips: [
        { id: 'tone-matching', name: 'Tone Matching Chip', description: 'Adapt to prospect style', status: 'active' },
        { id: 'personality', name: 'Personality Chip', description: 'Define AI character', status: 'active' }
      ]
    },
    {
      id: 'email',
      name: 'Email Cartridge',
      description: 'Multi-step email sequences and automation',
      category: 'channel',
      status: 'coming_soon',
      icon: Mail,
      chips: [
        { id: 'sequence', name: 'Sequence Chip', description: 'Drip campaigns', status: 'disabled' },
        { id: 'template', name: 'Template Chip', description: 'Email templates', status: 'disabled' },
        { id: 'deliverability', name: 'Deliverability Chip', description: 'Inbox optimization', status: 'disabled' }
      ]
    }
  ]

  const categories = [
    { id: 'all', label: 'All Cartridges', count: cartridges.length },
    { id: 'channel', label: 'Channels', count: 2 },
    { id: 'amplification', label: 'Amplification', count: 1 },
    { id: 'personality', label: 'Personality', count: 1 },
    { id: 'analytics', label: 'Analytics', count: 0 }
  ]

  const filteredCartridges = activeTab === 'all'
    ? cartridges
    : cartridges.filter(c => c.category === activeTab)

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Cartridge System</h1>
            <p className="text-muted-foreground mt-2">
              Hot-swappable capabilities for your Marketing Console. Each cartridge provides specific context and skills.
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Install Cartridge
          </Button>
        </div>

        {/* Architecture Breadcrumb */}
        <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
          <span>RevOS</span>
          <ChevronRight className="w-4 h-4" />
          <span>Marketing Console</span>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground">Cartridges</span>
        </div>
      </div>

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          {categories.map(cat => (
            <TabsTrigger key={cat.id} value={cat.id} className="gap-2">
              {cat.label}
              {cat.count > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1">
                  {cat.count}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="space-y-6">
          {filteredCartridges.map(cartridge => (
            <Card key={cartridge.id} className="p-6 bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="space-y-4">
                {/* Cartridge Header */}
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-gray-100 rounded-lg">
                      <cartridge.icon className="w-6 h-6 text-gray-700" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-semibold text-gray-900">{cartridge.name}</h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          cartridge.status === 'active'
                            ? 'bg-gray-100 text-gray-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {cartridge.status === 'coming_soon' ? 'Coming Soon' : cartridge.status}
                        </span>
                      </div>
                      <p className="text-gray-600 mt-1">
                        {cartridge.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {cartridge.status === 'active' && (
                      <>
                        <Button variant="outline" size="sm">
                          <Settings className="w-4 h-4 mr-1" />
                          Configure
                        </Button>
                        <Button variant="outline" size="sm">
                          View Docs
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Chips Grid */}
                <div className="pl-14">
                  <div className="text-sm font-medium mb-3 text-muted-foreground">
                    Chips ({cartridge.chips.length} modules)
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {cartridge.chips.map(chip => (
                      <div
                        key={chip.id}
                        className={`p-3 border rounded-lg ${
                          chip.status === 'active'
                            ? 'border-gray-200 bg-white shadow-sm'
                            : 'border-gray-200 bg-gray-50 opacity-60'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <Cpu className="w-4 h-4 text-gray-600" />
                              <span className="font-medium text-sm text-gray-900">{chip.name}</span>
                            </div>
                            <p className="text-xs text-gray-600 mt-1">
                              {chip.description}
                            </p>
                          </div>
                          {chip.status === 'active' && (
                            <div className="text-xs font-medium text-gray-500">Active</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cartridge Actions */}
                {cartridge.status === 'active' && (
                  <div className="flex items-center gap-4 pl-14 pt-2">
                    <Button variant="link" size="sm" className="text-xs">
                      View API Endpoints
                    </Button>
                    <Button variant="link" size="sm" className="text-xs">
                      Usage Analytics
                    </Button>
                    <Button variant="link" size="sm" className="text-xs">
                      Test Cartridge
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Future Vision Card */}
      <Card className="mt-8 p-6 bg-gray-50 border-gray-200">
        <div className="flex items-start gap-4">
          <Package className="w-6 h-6 text-gray-600 mt-1" />
          <div>
            <h3 className="font-semibold text-gray-900">Future Cartridge Marketplace</h3>
            <p className="text-sm text-gray-600 mt-1">
              Soon you&apos;ll be able to browse and install community-created cartridges.
              Build your own cartridges with our SDK and monetize them in the marketplace.
            </p>
            <div className="flex gap-4 mt-3">
              <Badge variant="outline" className="text-gray-700">Twitter Cartridge</Badge>
              <Badge variant="outline" className="text-gray-700">Slack Cartridge</Badge>
              <Badge variant="outline" className="text-gray-700">SEO Cartridge</Badge>
              <Badge variant="outline" className="text-gray-700">+ 50 more</Badge>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
