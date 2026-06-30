import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white relative overflow-hidden selection:bg-white selection:text-black flex flex-col">
      {/* Corner brackets */}
      <div className="absolute top-6 left-6 w-8 h-8 border-l border-t border-white/30" />
      <div className="absolute top-6 right-6 w-8 h-8 border-r border-t border-white/30" />
      <div className="absolute bottom-6 left-6 w-8 h-8 border-l border-b border-white/30" />
      <div className="absolute bottom-6 right-6 w-8 h-8 border-r border-b border-white/30" />

      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-8 md:px-16 pt-8 text-xs font-mono tracking-widest text-gray-500 shrink-0">
        <span>P2P/FILESHARE</span>
        <span className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          PHASE 02
        </span>
      </div>

      {/* Hero — centered both axes */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="w-full max-w-3xl">
          <h1 className="font-bold tracking-tighter leading-[0.9] mb-8">
            <span className="block text-[clamp(3rem,9vw,6.5rem)]">SEND</span>
            <span className="block text-[clamp(3rem,9vw,6.5rem)] text-transparent [-webkit-text-stroke:1.5px_white]">
              FILES.
            </span>
          </h1>

          <p className="text-gray-400 mb-10 text-base md:text-lg">
            Device to device. Encrypted. No cloud, no limits.
          </p>

          {/* Buttons — ticket style */}
          <div className="flex flex-col sm:flex-row gap-px max-w-md mx-auto mb-16">
            <Link
              href="/send"
              id="btn-start-sharing"
              className="group relative flex-1 px-8 py-5 bg-white text-black font-bold text-sm tracking-widest uppercase overflow-hidden"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                Start
                <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
              </span>
            </Link>
            <Link
              href="/receive"
              id="btn-join-room"
              className="group relative flex-1 px-8 py-5 border border-white/20 text-white font-bold text-sm tracking-widest uppercase hover:border-white transition-colors duration-300 flex items-center justify-center"
            >
              Join
            </Link>
          </div>

          {/* Stats — numbered, editorial */}
          <div className="grid grid-cols-3 border-t border-white/15">
            {[
              { n: '01', label: 'Encryption', value: 'E2E' },
              { n: '02', label: 'Max size', value: '500MB' },
              { n: '03', label: 'Latency', value: '<50ms' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="border-r border-white/15 last:border-r-0 px-4 py-6"
              >
                <div className="text-xs font-mono text-gray-600 mb-3">{stat.n}</div>
                <div className="text-xl md:text-2xl font-bold font-mono">{stat.value}</div>
                <div className="text-xs text-gray-500 mt-1 uppercase tracking-wide">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 flex items-center justify-between px-8 md:px-16 pb-8 text-[10px] text-gray-600 font-mono tracking-widest shrink-0">
        <span>WEBRTC · NESTJS</span>
        <span>© 2026</span>
      </div>
    </main>
  );
}