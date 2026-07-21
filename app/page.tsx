'use client';

import { ArrowDownRight, Settings2, UploadCloud } from 'lucide-react';
import { Suspense, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { ProductInputPanel } from '../components/ProductInputPanel';
import { ExportPanel } from '../components/ExportPanel';
import { useBIMSnapState } from '../components/useBIMSnapState';

const Viewer = dynamic(() => import('../components/Viewer'), { ssr: false });

export default function Home() {
  const state = useBIMSnapState();

  const instructions = useMemo(
    () => [
      'Upload an image of furniture or lighting.',
      'Review the auto-isolated subject preview.',
      'Adjust dimensions, category, and poly density.',
      'Generate and export CAD-ready .OBJ/.GLB files.'
    ],
    []
  );

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/95 p-6 shadow-panel">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-cyan-300/80">BIMsnap</p>
              <h1 className="mt-2 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Browser-native AEC asset creation for designers.
              </h1>
              <p className="mt-4 max-w-2xl text-slate-300">
                Upload a furniture or lighting photo, strip the background, and export optimized CAD geometry for Revit,
                Rhino, SketchUp, and Vectorworks without server render time.
              </p>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5 text-slate-300 shadow-panel">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Workflow</p>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
                {instructions.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <ArrowDownRight className="mt-1 h-4 w-4 text-cyan-300" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <div className="space-y-6 rounded-3xl border border-slate-800 bg-slate-900/95 p-6 shadow-panel">
            <ProductInputPanel state={state} />
            <ExportPanel state={state} />
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-6 shadow-panel">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-cyan-300/80">3D Viewport</p>
                <h2 className="text-xl font-semibold text-white">Live model preview</h2>
              </div>
              <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-3 py-2 text-sm text-slate-300">
                <Settings2 className="h-4 w-4 text-cyan-300" />
                {state.polygonCountLabel}
              </div>
            </div>
            <div className="h-[720px] rounded-3xl border border-slate-800 bg-black/50 p-3">
              <Suspense fallback={<div className="flex h-full items-center justify-center text-slate-300">Loading viewport…</div>}>
                <Viewer state={state} />
              </Suspense>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
