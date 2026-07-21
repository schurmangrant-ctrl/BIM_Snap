'use client';

import { ArrowDownRight, Zap, Code2, Package } from 'lucide-react';
import { Suspense, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { ProductInputPanel } from '../components/ProductInputPanel';
import { ExportPanel } from '../components/ExportPanel';
import { useBIMSnapState } from '../components/useBIMSnapState';

const Viewer = dynamic(() => import('../components/Viewer'), { ssr: false });

export default function Home() {
  const state = useBIMSnapState();

  const features = useMemo(
    () => [
      { icon: Package, label: 'Image to 3D', desc: 'AI-powered mesh generation from photos' },
      { icon: Code2, label: 'Multi-format', desc: 'Export to OBJ, GLB, DAE, SAT' },
      { icon: Zap, label: 'Real-time', desc: 'Instant processing in your browser' }
    ],
    []
  );

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none opacity-30">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
      </div>

      <section className="relative mx-auto flex max-w-7xl flex-col gap-8 px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="space-y-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/5 px-4 py-2">
              <Package className="h-4 w-4 text-cyan-400" />
              <span className="text-sm font-medium text-cyan-300">AI-Powered 3D Asset Generation</span>
            </div>
            <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-white">
              From photo to<br />
              <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">production-ready CAD</span>
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl">
              Transform furniture and lighting photos into optimized 3D models for Revit, Rhino, SketchUp, and Vectorworks instantly—no rendering servers, no waiting.
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {features.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="rounded-2xl border border-slate-800/50 bg-slate-900/30 backdrop-blur-sm p-4 hover:border-cyan-500/30 transition-colors">
                <Icon className="h-5 w-5 text-cyan-400 mb-2" />
                <p className="font-semibold text-white text-sm">{label}</p>
                <p className="text-xs text-slate-400 mt-1">{desc}</p>
              </div>
            ))}
          </div>
        </header>

        {/* Main Content Grid */}
        <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          {/* Control Panel */}
          <div className="space-y-6">
            <ProductInputPanel state={state} />
            <ExportPanel state={state} />
          </div>

          {/* 3D Viewer */}
          <div className="rounded-3xl border border-slate-700/50 bg-gradient-to-br from-slate-900/80 to-slate-950/80 backdrop-blur-sm p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-400/80 font-semibold">3D Viewport</p>
                <h2 className="text-xl font-bold text-white mt-1">Live model preview</h2>
              </div>
              <div className="inline-flex items-center gap-2 rounded-xl bg-slate-950/60 px-3 py-2 text-xs text-slate-300 border border-slate-700/30">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                {state.polygonCountLabel}
              </div>
            </div>
            <div className="h-[720px] rounded-2xl border border-slate-700/30 bg-gradient-to-b from-slate-950 to-black/50 p-3 overflow-hidden shadow-inner">
              <Suspense fallback={<div className="flex h-full items-center justify-center text-slate-400 font-medium">Initializing viewport…</div>}>
                <Viewer state={state} />
              </Suspense>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
