// AudienceOS Logo Component
// Restored from Kaizen temporary branding (2026-01-20)

export function KaizenLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-0 ${className}`} style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
      <span className="text-3xl font-semibold tracking-tight text-white">audience</span>
      <span
        className="text-3xl font-light tracking-tight"
        style={{
          background: "linear-gradient(90deg, #a855f7 0%, #ec4899 50%, #06b6d4 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        OS
      </span>
    </div>
  )
}
