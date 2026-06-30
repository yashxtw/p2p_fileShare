import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Subtle grid background */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        {/* Content */}
        <div className="relative z-10 text-center max-w-3xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full border border-white/15 text-sm text-gray-400 font-mono tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            PHASE 2 — SESSION MANAGEMENT READY
          </div>

          {/* Title */}
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 text-white">
            P2P FileShare
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-gray-400 mb-12 leading-relaxed max-w-xl mx-auto">
            Share files directly between devices. No cloud. No limits.
            Encrypted peer-to-peer transfers powered by WebRTC.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/send"
              id="btn-start-sharing"
              className="px-8 py-3.5 rounded-xl bg-white text-black font-semibold hover:bg-gray-200 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] text-center"
            >
              Start Sharing →
            </Link>
            <Link
              href="/receive"
              id="btn-join-room"
              className="px-8 py-3.5 rounded-xl border border-white/20 text-white font-semibold hover:border-white/40 hover:bg-white/5 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] text-center"
            >
              Join a Room
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-8 max-w-md mx-auto border-t border-white/10 pt-10">
            {[
              { label: 'Encryption', value: 'E2E' },
              { label: 'Max Size', value: '500MB' },
              { label: 'Latency', value: '<50ms' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-bold text-white font-mono">{stat.value}</div>
                <div className="text-xs text-gray-500 mt-1 tracking-wide uppercase">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-8 text-xs text-gray-600 font-mono tracking-wide">
          BUILT WITH NEXT.JS · NESTJS · WEBRTC
        </div>
      </div>
    </main>
  );
}