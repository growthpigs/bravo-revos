import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

/**
 * App Context Store
 *
 * Manages which app is currently active in the unified platform.
 * Persists to localStorage so the user's choice is remembered.
 */

export type AppId = 'audienceos' | 'revos'

export interface AppConfig {
  id: AppId
  name: string
  shortName: string
  description: string
  gradient: string
  icon: string
  /** External URL for this app (if separate deployment) */
  url?: string
  /** Whether this is the current deployment's native app */
  isNative: boolean
}

export const APP_CONFIGS: Record<AppId, AppConfig> = {
  audienceos: {
    id: 'audienceos',
    name: 'AudienceOS',
    shortName: 'A',
    description: 'Client management & operations',
    gradient: 'linear-gradient(90deg, #a855f7 0%, #ec4899 50%, #06b6d4 100%)',
    icon: '👥',
    isNative: true, // This deployment IS AudienceOS
  },
  revos: {
    id: 'revos',
    name: 'RevOS',
    shortName: 'R',
    description: 'Marketing automation & campaigns',
    gradient: 'linear-gradient(90deg, #f97316 0%, #eab308 50%, #22c55e 100%)',
    icon: '📈',
    url: 'https://bravo-revos.vercel.app', // RevOS lives at separate deployment
    isNative: false,
  },
}

interface AppState {
  // Current active app
  activeApp: AppId

  // Actions
  setActiveApp: (app: AppId) => void
  toggleApp: () => void

  // Computed
  getActiveConfig: () => AppConfig
  getOtherConfig: () => AppConfig
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        // Default to AudienceOS
        activeApp: 'audienceos',

        setActiveApp: (app: AppId) => set({ activeApp: app }),

        toggleApp: () =>
          set((state) => ({
            activeApp: state.activeApp === 'audienceos' ? 'revos' : 'audienceos',
          })),

        getActiveConfig: () => APP_CONFIGS[get().activeApp],

        getOtherConfig: () =>
          APP_CONFIGS[get().activeApp === 'audienceos' ? 'revos' : 'audienceos'],
      }),
      {
        name: 'unified-platform-app',
        skipHydration: true,
      }
    ),
    { name: 'AppStore' }
  )
)
