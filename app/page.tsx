'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'

/**
 * Unified Platform Landing Page
 * Linear-style app selector for choosing between RevOS and AudienceOS
 */

interface AppOption {
  id: string
  name: string
  tagline: string
  description: string
  icon: string
  gradient: string
  hoverGradient: string
  path: string
  disabled?: boolean
  badge?: string
}

const apps: AppOption[] = [
  {
    id: 'revos',
    name: 'RevOS',
    tagline: 'Marketing Automation',
    description: 'AI-powered LinkedIn outreach, content generation, and campaign management.',
    icon: '/revos-logo.png',
    gradient: 'from-orange-500 via-amber-500 to-green-500',
    hoverGradient: 'group-hover:from-orange-400 group-hover:via-amber-400 group-hover:to-green-400',
    path: '/auth/login?app=revos',
  },
  {
    id: 'audienceos',
    name: 'AudienceOS',
    tagline: 'Client Operations',
    description: 'Client management, pipeline tracking, and operational workflows.',
    icon: '/audienceos-icon.svg',
    gradient: 'from-purple-500 via-pink-500 to-cyan-500',
    hoverGradient: 'group-hover:from-purple-400 group-hover:via-pink-400 group-hover:to-cyan-400',
    path: '/audienceos',
    disabled: false,
  },
]

export default function AppSelectorPage() {
  const router = useRouter()

  const handleAppSelect = (app: AppOption) => {
    // External URLs (starting with http) open in same tab
    if (app.path.startsWith('http')) {
      window.location.href = app.path
    } else {
      router.push(app.path)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 border-b border-white/5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">D</span>
            </div>
            <span className="text-white/90 font-semibold tracking-tight">Diiiploy</span>
          </div>
          <a
            href="https://diiiploy.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            Learn more
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-3xl">
          {/* Title */}
          <div className="text-center mb-12">
            <h1 className="text-3xl font-semibold text-white mb-3 tracking-tight">
              Choose your workspace
            </h1>
            <p className="text-white/50 text-base">
              Select an application to continue
            </p>
          </div>

          {/* App Cards */}
          <div className="grid md:grid-cols-2 gap-4">
            {apps.map((app) => (
              <button
                key={app.id}
                onClick={() => !app.disabled && handleAppSelect(app)}
                disabled={app.disabled}
                className={`group relative bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 text-left transition-all duration-200 ${
                  app.disabled
                    ? 'cursor-not-allowed opacity-60'
                    : 'hover:bg-white/[0.06] hover:border-white/[0.12] cursor-pointer'
                }`}
              >
                {/* Gradient accent bar */}
                <div className={`absolute top-0 left-6 right-6 h-[2px] bg-gradient-to-r ${app.gradient} ${!app.disabled ? app.hoverGradient : ''} opacity-60 ${!app.disabled ? 'group-hover:opacity-100' : ''} transition-opacity rounded-full`} />

                {/* Icon and Name */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/10 flex items-center justify-center">
                      <Image
                        src={app.icon}
                        alt={`${app.name} logo`}
                        width={40}
                        height={40}
                        className="object-contain"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold text-white tracking-tight">
                          {app.name}
                        </h2>
                        {app.badge && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/50 font-medium uppercase tracking-wide">
                            {app.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-white/40">{app.tagline}</p>
                    </div>
                  </div>
                  <ArrowRight className={`w-5 h-5 text-white/20 transition-all ${!app.disabled ? 'group-hover:text-white/60 group-hover:translate-x-0.5' : ''}`} />
                </div>

                {/* Description */}
                <p className="text-sm text-white/50 leading-relaxed">
                  {app.description}
                </p>

                {/* Subtle gradient glow on hover */}
                {!app.disabled && (
                  <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${app.gradient} opacity-0 group-hover:opacity-[0.03] transition-opacity -z-10`} />
                )}
              </button>
            ))}
          </div>

          {/* Footer hint */}
          <p className="text-center text-white/30 text-sm mt-8">
            Both applications share the same account and data
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-white/5">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-sm text-white/30">
          <span>© 2026 Diiiploy</span>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-white/60 transition-colors">Privacy</a>
            <a href="#" className="hover:text-white/60 transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
