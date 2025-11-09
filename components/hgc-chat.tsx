'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Script from 'next/script'

/**
 * Holy Grail Chat Component
 * AI co-founder chat interface using OpenAI ChatKit Web Component
 */
export function HGCChat() {
  const [isScriptLoaded, setIsScriptLoaded] = useState(false)
  const [authToken, setAuthToken] = useState<string | null>(null)

  useEffect(() => {
    // Get Supabase session for auth
    const getSession = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        console.log('[HGC] No session found, chat unavailable')
        return
      }

      setAuthToken(session.access_token)
      console.log('[HGC] Auth token obtained')
    }

    getSession()
  }, [])

  useEffect(() => {
    // Configure ChatKit when script loads and auth is ready
    if (!isScriptLoaded || !authToken || typeof window === 'undefined') return

    const chatKitElement = document.querySelector('openai-chatkit')
    if (chatKitElement) {
      console.log('[HGC] ChatKit web component initialized')
    }
  }, [isScriptLoaded, authToken])

  // Don't render if no auth
  if (!authToken) {
    return null
  }

  const apiConfig = JSON.stringify({
    endpoint: '/api/hgc',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
  })

  const themeConfig = JSON.stringify({
    colorScheme: 'light',
    primaryColor: '#2563eb',
  })

  return (
    <>
      {/* Load ChatKit Web Component from CDN */}
      <Script
        src="https://cdn.openai.com/chatkit/v1.0/chatkit.js"
        strategy="lazyOnload"
        onLoad={() => {
          console.log('[HGC] ChatKit script loaded')
          setIsScriptLoaded(true)
        }}
        onError={(error) => {
          console.error('[HGC] Failed to load ChatKit script:', error)
        }}
      />

      {/* ChatKit Web Component */}
      {isScriptLoaded && (
        <openai-chatkit
          api-config={apiConfig}
          theme={themeConfig}
          initial-thread={null}
        >
          {/* Start screen configuration */}
          <div slot="start-screen-title">RevOS Intelligence</div>
          <div slot="start-screen-subtitle">Your AI co-founder for LinkedIn growth</div>
        </openai-chatkit>
      )}
    </>
  )
}

// Extend JSX types for web component
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'openai-chatkit': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          'api-config'?: string
          'theme'?: string
          'initial-thread'?: string | null
        },
        HTMLElement
      >
    }
  }
}
