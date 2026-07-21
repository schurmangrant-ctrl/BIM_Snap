'use client';

import { Download, Layers, Link2, FileJson, Package } from 'lucide-react';
import { useMemo, useState } from 'react';
import * as THREE from 'three';
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
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);

  const canExport = state.imageSrc && state.generatedMesh;

  const handleExport = async (format: 'obj' | 'glb' | 'dae' | 'sat', label: string) => {
    setDownloadingFormat(format);
    try {
      if (!state.imageSrc) return;
      
      // Build mesh from generated data or default
      const mesh = state.generatedMesh ? buildMeshFromData(state.generatedMesh, state) : buildExportMesh(state);
      const filename = `${state.productName.replace(/\s+/g, '_')}.${format}`;

      if (format === 'obj') {
        exportOBJ(mesh, filename);
      } else if (format === 'glb') {
        await exportGLB(mesh, filename);
      } else if (format === 'dae') {
        exportDAE(mesh, filename);
      } else if (format === 'sat') {
        exportSATPlaceholder(state, filename);
        setShowGuide(true);
      }
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setTimeout(() => setDownloadingFormat(null), 1000);
    }
  };

  const buildMeshFromData = (meshJSON: string, state: BIMSnapState) => {
    try {
      const meshData = JSON.parse(meshJSON);
      const geometry = new THREE.BufferGeometry();
      
      if (meshData.vertices && meshData.vertices.length > 0) {
        geometry.setAttribute(
          'position',
          new THREE.BufferAttribute(new Float32Array(meshData.vertices), 3)
        );
      }
      
      if (meshData.indices && meshData.indices.length > 0) {
        geometry.setIndex(
          new THREE.BufferAttribute(new Uint32Array(meshData.indices), 1)
        );
      }
      
      geometry.computeVertexNormals();
      
      const material = new THREE.MeshStandardMaterial({
        color: 0x06b6d4,
        metalness: 0.2,
        roughness: 0.25
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      
      // Scale to match user dimensions
      const widthMeters = state.units === 'in' ? state.width * 0.0254 : state.width * 0.001;
      const heightMeters = state.units === 'in' ? state.height * 0.0254 : state.height * 0.001;
      const depthMeters = state.units === 'in' ? state.depth * 0.0254 : state.depth * 0.001;
      
      const box = new THREE.Box3().setFromObject(mesh);
      const size = new THREE.Vector3();
      box.getSize(size);
      
      if (size.x > 0 && size.y > 0 && size.z > 0) {
        mesh.scale.set(widthMeters / size.x, heightMeters / size.y, depthMeters / size.z);
      }
      
      return mesh;
    } catch (error) {
      console.error('Failed to build mesh from data:', error);
      return buildExportMesh(state);
    }
  };

  const exportOptions = useMemo(() => [
    {
      name: 'SketchUp & Rhino',
      icon: Package,
      formats: [
        { format: 'obj' as const, label: 'OBJ', desc: 'Universal geometry format' },
        { format: 'glb' as const, label: 'GLB', desc: 'Optimized with materials' }
      ],
      desc: 'Industry-standard formats'
    },
    {
      name: 'Revit',
      icon: Link2,
      formats: [{ format: 'sat' as const, label: 'SAT', desc: 'Import via CAD command' }],
      desc: 'Requires post-import setup'
    },
    {
      name: 'Vectorworks',
      icon: FileJson,
      formats: [{ format: 'dae' as const, label: 'DAE', desc: 'COLLADA interchange format' }],
      desc: 'Native BIM workflow'
    }
  ], []);

  return (
    <div className="rounded-3xl border border-slate-700/50 bg-gradient-to-br from-slate-900/60 to-slate-950/60 backdrop-blur-sm p-6 shadow-lg">
      <div className="mb-6 flex items-center gap-3">
        <Layers className="h-6 w-6 text-cyan-400" />
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-400/80 font-semibold">CAD Export</p>
          <p className="mt-1 text-sm text-slate-400">Download optimized geometry for AEC platforms.</p>
        </div>
      </div>

      {!canExport ? (
        <div className="rounded-2xl border border-slate-700/30 bg-slate-950/30 p-4 text-center">
          <p className="text-sm text-slate-400">Generate a 3D model first to unlock exports</p>
        </div>
      ) : (
        <div className="space-y-3">
          {exportOptions.map(({ name, icon: Icon, formats, desc }) => (
            <div key={name} className="rounded-2xl border border-slate-700/30 bg-slate-950/40 p-4 hover:border-cyan-500/30 transition-colors">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-3 flex-1">
                  <Icon className="h-5 w-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-white text-sm">{name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {formats.map(({ format, label, desc: formatDesc }) => (
                  <button
                    key={format}
                    type="button"
                    disabled={downloadingFormat !== null || !canExport}
                    onClick={() => handleExport(format, label)}
                    className="group relative rounded-xl bg-slate-800/50 hover:bg-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all overflow-hidden p-3 text-left"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Download className={`h-4 w-4 flex-shrink-0 transition-transform ${downloadingFormat === format ? 'animate-bounce text-cyan-400' : 'text-slate-400'}`} />
                      <div className="min-w-0">
                        <p className="font-semibold text-white text-xs">{label}</p>
                        <p className="text-xs text-slate-400 truncate">{formatDesc}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showGuide && (
        <div className="mt-6 rounded-2xl border border-cyan-500/30 bg-cyan-500/5 backdrop-blur-sm p-4 text-slate-200 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <p className="font-semibold text-white text-sm">Revit Import Guide</p>
              <p className="mt-2 text-xs text-slate-400">Use the generated .SAT file inside a blank RFA family template.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="rounded-lg px-2 py-1 text-xs text-slate-300 hover:bg-slate-700/30 transition-colors flex-shrink-0"
            >
              ✕
            </button>
          </div>
          <ol className="space-y-2 text-xs leading-relaxed text-slate-300">
            <li><span className="font-semibold text-cyan-400">1.</span> Open Revit and create a new Generic Model family.</li>
            <li><span className="font-semibold text-cyan-400">2.</span> Import the .SAT asset via Import CAD command.</li>
            <li><span className="font-semibold text-cyan-400">3.</span> Align geometry with family origin and save as .RFA.</li>
          </ol>
        </div>
      )}
    </div>
  );
}
