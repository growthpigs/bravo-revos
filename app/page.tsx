import { Button } from '@/components/ui/button'
import { Megaphone, Zap, Users, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export default function HomePage() {

  // Landing page for non-authenticated users
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <Megaphone className="h-6 w-6 text-blue-600" />
              <span className="text-xl font-bold text-slate-900">Bravo revOS</span>
            </div>
            <Link href="/auth/login">
              <Button>Sign In</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main>
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold text-slate-900 mb-6">
              AI-Powered LinkedIn Lead Generation
            </h1>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto mb-8">
              Automate your LinkedIn outreach, deliver lead magnets via DM, and convert comments into qualified leads.
            </p>
            <Link href="/auth/login">
              <Button size="lg" className="text-lg px-8">
                Get Started
              </Button>
            </Link>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-16">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Megaphone className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Create Engaging Posts
              </h3>
              <p className="text-slate-600 text-sm">
                AI-powered content creation for maximum engagement
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="h-12 w-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Capture Leads
              </h3>
              <p className="text-slate-600 text-sm">
                Automatically detect trigger words in comments
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Automated DMs
              </h3>
              <p className="text-slate-600 text-sm">
                Send lead magnets and follow-ups automatically
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Track Performance
              </h3>
              <p className="text-slate-600 text-sm">
                Real-time analytics and conversion tracking
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
