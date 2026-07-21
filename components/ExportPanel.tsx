'use client';

import { Download, Layers, Link2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { BIMSnapState } from './types';
import { buildExportMesh, exportDAE, exportGLB, exportOBJ, exportSATPlaceholder } from './exportUtils';

interface Props {
  state: ReturnType<typeof import('./useBIMSnapState').useBIMSnapState>;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ExportPanel({ state }: Props) {
  const [showGuide, setShowGuide] = useState(false);

  const formatLabel = useMemo(() => {
    if (!state.imageSrc) {
      return 'Upload an image first';
    }
    return `Ready to export ${state.productName}`;
  }, [state.imageSrc, state.productName]);

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5 shadow-panel">
      <div className="mb-5 flex items-center gap-3 text-slate-200">
        <Layers className="h-5 w-5 text-cyan-300" />
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300/80">CAD export</p>
          <p className="mt-1 text-sm text-slate-400">Generate optimized geometry for common AEC platforms.</p>
        </div>
      </div>

      <div className="space-y-4">
        <button
          type="button"
          disabled={!state.imageSrc}
          className="flex w-full items-center justify-between rounded-3xl bg-slate-900 px-5 py-4 text-left text-slate-100 transition disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-800"
          onClick={async () => {
            if (!state.imageSrc) return;
            const mesh = buildExportMesh(state);
            exportOBJ(mesh, `${state.productName.replace(/\s+/g, '_')}.obj`);
            await exportGLB(mesh, `${state.productName.replace(/\s+/g, '_')}.glb`);
          }}
        >
          <div>
            <p className="font-semibold">Export for SketchUp / Rhino</p>
            <p className="text-sm text-slate-400">Download .OBJ and .GLB optimized files.</p>
          </div>
          <Download className="h-5 w-5 text-cyan-300" />
        </button>

        <button
          type="button"
          disabled={!state.imageSrc}
          className="flex w-full items-center justify-between rounded-3xl bg-slate-900 px-5 py-4 text-left text-slate-100 transition disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-800"
          onClick={() => {
            if (!state.imageSrc) return;
            exportSATPlaceholder(state, `${state.productName.replace(/\s+/g, '_')}.sat`);
            setShowGuide(true);
          }}
        >
          <div>
            <p className="font-semibold">Export for Revit</p>
            <p className="text-sm text-slate-400">Download a placeholder .SAT file and open the Revit guide.</p>
          </div>
          <Download className="h-5 w-5 text-cyan-300" />
        </button>

        <button
          type="button"
          disabled={!state.imageSrc}
          className="flex w-full items-center justify-between rounded-3xl bg-slate-900 px-5 py-4 text-left text-slate-100 transition disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-800"
          onClick={() => {
            if (!state.imageSrc) return;
            const mesh = buildExportMesh(state);
            exportDAE(mesh, `${state.productName.replace(/\s+/g, '_')}.dae`);
          }}
        >
          <div>
            <p className="font-semibold">Export for Vectorworks</p>
            <p className="text-sm text-slate-400">Generate a lightweight .DAE package for BIM workflows.</p>
          </div>
          <Link2 className="h-5 w-5 text-cyan-300" />
        </button>
      </div>

      {showGuide ? (
        <div className="mt-5 rounded-3xl border border-cyan-500/20 bg-slate-950/95 p-5 text-slate-200 shadow-panel">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-white">Revit Import Guide</p>
              <p className="mt-2 text-sm text-slate-400">Use the generated .SAT file inside a blank RFA family template and align the geometry with the family origin.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="rounded-full border border-slate-700 px-3 py-1 text-sm text-slate-300 hover:border-slate-500"
            >
              Close
            </button>
          </div>
          <ol className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
            <li>1. Open Revit and create a new Generic Model family.</li>
            <li>2. Import the .SAT asset via the Import CAD command.</li>
            <li>3. Place the imported geometry inside the family origin and save as .RFA.</li>
          </ol>
        </div>
      ) : null}
    </div>
  );
}
