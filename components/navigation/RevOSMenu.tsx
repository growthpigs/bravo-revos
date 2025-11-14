'use client';

import {
  Target, Brain, Package, Command, Compass, Settings,
  Users, FileText, Mail, Database, Webhook, CreditCard,
  MessageSquare, Zap, BarChart, Inbox
} from 'lucide-react';
import { MenuSection } from './MenuSection';
import { RevOSMenuProps, MenuSection as MenuSectionType } from './revos-menu-types';

export function RevOSMenu({
  credits = 0,
  showSandboxToggle = false,
  sandboxMode = false,
  onSandboxToggle,
  activeCartridge = null
}: RevOSMenuProps) {

  const menuSections: MenuSectionType[] = [
    {
      id: 'campaigns',
      title: 'Campaigns',
      items: [
        { id: 'campaigns-all', label: 'All Campaigns', href: '/dashboard/campaigns', icon: Target },
        { id: 'campaigns-scheduled', label: 'Scheduled Actions', href: '/dashboard/scheduled-actions', icon: Zap },
        { id: 'campaigns-posts', label: 'Posts', href: '/dashboard/posts', icon: FileText },
      ],
    },
    {
      id: 'ai-intelligence',
      title: 'AI Intelligence',
      items: [
        { id: 'ai-cartridges', label: 'Voice Cartridges', href: '/dashboard/voice-cartridges', icon: Package },
        { id: 'ai-knowledge', label: 'Knowledge Base', href: '/dashboard/knowledge-base', icon: Brain },
        { id: 'ai-sequences', label: 'DM Sequences', href: '/dashboard/dm-sequences', icon: MessageSquare },
      ],
    },
    {
      id: 'discovery',
      title: 'Discovery',
      items: [
        { id: 'discovery-leads', label: 'Leads', href: '/dashboard/leads', icon: Users },
        { id: 'discovery-magnets', label: 'Lead Magnets', href: '/dashboard/lead-magnets', icon: Mail },
        { id: 'discovery-emails', label: 'Email Review', href: '/dashboard/email-review', icon: Inbox },
      ],
    },
    {
      id: 'platform',
      title: 'Platform',
      items: [
        { id: 'platform-accounts', label: 'LinkedIn Accounts', href: '/dashboard/linkedin-accounts', icon: Users },
        { id: 'platform-webhooks', label: 'Webhooks', href: '/dashboard/webhooks', icon: Webhook },
        { id: 'platform-settings', label: 'Settings', href: '/dashboard/settings', icon: Settings },
      ],
    },
  ];

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-gray-900">revOS</h1>
          {credits > 0 && (
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <CreditCard className="h-4 w-4" />
              <span>Credits: {credits.toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Sandbox Toggle */}
        {showSandboxToggle && (
          <button
            onClick={() => onSandboxToggle?.(!sandboxMode)}
            className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              sandboxMode
                ? 'bg-yellow-100 text-yellow-900 border-2 border-yellow-400'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {sandboxMode ? '⚠️ Sandbox Mode' : 'Enable Sandbox'}
          </button>
        )}

        {/* Active Cartridge Indicator */}
        {activeCartridge && (
          <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-xs font-semibold text-blue-900 mb-1">
              Active Cartridge
            </div>
            <div className="text-sm text-blue-700">{activeCartridge.name}</div>
            <div className="text-xs text-blue-600 mt-1">
              {activeCartridge.chips.length} chips loaded
            </div>
          </div>
        )}
      </div>

      {/* Menu Sections */}
      <div className="flex-1 overflow-y-auto p-4">
        {menuSections.map((section) => (
          <MenuSection key={section.id} section={section} />
        ))}
      </div>

      {/* Quick Access Bar */}
      <div className="border-t border-gray-200 p-3 bg-gray-50">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">
          Quick Access
        </div>
        <div className="grid grid-cols-4 gap-2">
          <button className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <MessageSquare className="h-5 w-5 text-gray-600" />
            <span className="text-xs text-gray-700">Chat</span>
          </button>
          <button className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <Zap className="h-5 w-5 text-gray-600" />
            <span className="text-xs text-gray-700">Campaign</span>
          </button>
          <button className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <BarChart className="h-5 w-5 text-gray-600" />
            <span className="text-xs text-gray-700">Stats</span>
          </button>
          <button className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <Inbox className="h-5 w-5 text-gray-600" />
            <span className="text-xs text-gray-700">Inbox</span>
          </button>
        </div>
      </div>
    </div>
  );
}
