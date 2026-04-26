import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/assessment')
  }

  return (
    <main className="min-h-screen bg-[#fffdf5] flex flex-col items-center justify-center relative overflow-hidden text-black font-sans selection:bg-purple-400 selection:text-white">
      {/* Decorative Elements */}
      <div className="absolute top-10 left-10 w-24 h-24 bg-red-500 border-4 border-black rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-bounce-slow hidden md:block"></div>
      <div className="absolute bottom-20 right-20 w-32 h-32 bg-yellow-400 border-4 border-black rounded-full border-b-[8px] border-r-[8px] animate-pulse hidden md:block"></div>

      <div className="z-10 text-center max-w-4xl px-6">
        <div className="inline-block mb-6 px-4 py-1 bg-black text-white font-bold uppercase tracking-widest border-2 border-transparent transform -rotate-2">
          v3.0.0 Public Beta
        </div>

        <h1 className="text-7xl md:text-9xl font-black mb-8 leading-tight tracking-tighter mix-blend-multiply">
          STREETS
        </h1>

        <div className="bg-white border-4 border-black p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] mb-12 rotate-1 hover:rotate-0 transition-transform duration-300">
          <p className="text-2xl md:text-3xl font-bold font-mono leading-relaxed lowercase">
            the gps for learning.<br />
            <span className="text-blue-600">from curiosity &rarr; mastery.</span>
          </p>
        </div>

        <p className="text-xl font-bold mb-12 max-w-2xl mx-auto uppercase tracking-wide">
          Discover your knowledge gaps with adaptive assessments that actually understand you.
        </p>

        <Link
          href="/auth/login"
          className="inline-block group relative"
        >
          <div className="absolute inset-0 bg-purple-500 border-4 border-black translate-y-2 translate-x-2 transition-transform group-hover:translate-x-3 group-hover:translate-y-3"></div>
          <div className="relative border-4 border-black bg-white px-12 py-6 text-2xl font-black uppercase tracking-widest hover:-translate-y-1 hover:-translate-x-1 transition-transform border-b-8 border-r-8 active:translate-y-0 active:translate-x-0 active:border-b-4 active:border-r-4">
            Get In Network
          </div>
        </Link>
      </div>

      {/* Grid Background */}
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>
    </main>
  )
}
