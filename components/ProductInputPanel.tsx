'use client';

import { Camera, Layers, UploadCloud } from 'lucide-react';
import { useCallback, useMemo, useRef } from 'react';
import type { AecCategory, BIMSnapState } from './types';

interface Props {
  state: ReturnType<typeof import('./useBIMSnapState').useBIMSnapState>;
}

const categories: AecCategory[] = ['Furniture', 'Lighting Fixtures', 'Plumbing', 'Specialty Equipment'];

function toFraction(value: number) {
  const whole = Math.floor(value);
  const fraction = value - whole;
  const denominator = 16;
  const numerator = Math.round(fraction * denominator);
  return numerator === 0 ? `${whole}` : `${whole} ${numerator}/${denominator}`;
}

function formatDimension(value: number, units: 'in' | 'mm') {
  if (units === 'mm') {
    return `${Math.round(value)} mm`;
  }
  return `${toFraction(value)} in`;
}

export function ProductInputPanel({ state }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const densityOptions = useMemo(
    () => [
      { value: 'low', label: 'Low (~5,000 polys)' },
      { value: 'medium', label: 'Medium (~15,000 polys)' },
      { value: 'high', label: 'High (~30,000 polys)' }
    ],
    []
  );

  const handleImageUpload = useCallback(
    async (file: File) => {
      const reader = new FileReader();
      reader.onload = async () => {
        const image = new Image();
        if (typeof reader.result !== 'string') return;
        image.src = reader.result;
        await image.decode();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        ctx.drawImage(image, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          if (r > 240 && g > 240 && b > 240) {
            data[i + 3] = 0;
          }
        }
        ctx.putImageData(imageData, 0, 0);
        state.setState({ imageSrc: canvas.toDataURL('image/png') });
      };
      reader.readAsDataURL(file);
    },
    [state]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.dataTransfer.files?.[0]) {
        handleImageUpload(event.dataTransfer.files[0]);
      }
    },
    [handleImageUpload]
  );

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.files?.[0]) {
        handleImageUpload(event.target.files[0]);
      }
    },
    [handleImageUpload]
  );

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5 shadow-panel">
        <div className="flex items-center gap-3 text-slate-200">
          <Camera className="h-5 w-5 text-cyan-300" />
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-300/80">Image Uploader</p>
            <p className="mt-1 text-sm text-slate-400">Drop a photo and the workspace will isolate the subject.</p>
          </div>
        </div>

        <div
          onDrop={handleDrop}
          onDragOver={(event) => event.preventDefault()}
          className="mt-5 rounded-3xl border border-dashed border-slate-700 bg-slate-900/90 p-6 text-center transition hover:border-slate-500"
        >
          {state.imageSrc ? (
            <img
              src={state.imageSrc}
              alt="Preview"
              className="mx-auto max-h-72 rounded-3xl object-contain"
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 text-slate-400">
              <UploadCloud className="h-12 w-12" />
              <p className="text-sm">Drag & drop or browse an image to start.</p>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="rounded-full border border-cyan-300/50 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-200 transition hover:bg-cyan-400/20"
              >
                Browse files
              </button>
            </div>
          )}
          <input
            type="file"
            ref={inputRef}
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5 shadow-panel">
        <div className="mb-5 flex items-center gap-3 text-slate-200">
          <Layers className="h-5 w-5 text-cyan-300" />
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-300/80">Asset details</p>
            <p className="mt-1 text-sm text-slate-400">Set name, category, and final physical size.</p>
          </div>
        </div>

        <div className="grid gap-4">
          <label className="space-y-2 text-sm text-slate-300">
            <span>Product name</span>
            <input
              type="text"
              value={state.productName}
              onChange={(event) => state.setState({ productName: event.target.value })}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400"
            />
          </label>

          <label className="space-y-2 text-sm text-slate-300">
            <span>Category</span>
            <select
              value={state.category}
              onChange={(event) => state.setState({ category: event.target.value as AecCategory })}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400"
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-300">
              <span>Units</span>
              <select
                value={state.units}
                onChange={(event) => state.setState({ units: event.target.value as 'in' | 'mm' })}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400"
              >
                <option value="in">Feet/Inches</option>
                <option value="mm">Millimeters</option>
              </select>
            </label>
            <label className="space-y-2 text-sm text-slate-300">
              <span>Polygon density</span>
              <select
                value={state.density}
                onChange={(event) => {
                  const density = event.target.value as 'low' | 'medium' | 'high';
                  const label = density === 'low' ? 'Low: ~5,000 polys' : density === 'high' ? 'High: ~30,000 polys' : 'Medium: ~15,000 polys';
                  state.setState({ density, polygonCountLabel: label });
                }}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400"
              >
                {densityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="space-y-2 text-sm text-slate-300">
              <span>Width</span>
              <input
                type="number"
                value={state.width}
                onChange={(event) => state.setState({ width: Number(event.target.value) })}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400"
              />
            </label>
            <label className="space-y-2 text-sm text-slate-300">
              <span>Height</span>
              <input
                type="number"
                value={state.height}
                onChange={(event) => state.setState({ height: Number(event.target.value) })}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400"
              />
            </label>
            <label className="space-y-2 text-sm text-slate-300">
              <span>Depth</span>
              <input
                type="number"
                value={state.depth}
                onChange={(event) => state.setState({ depth: Number(event.target.value) })}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-400"
              />
            </label>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-4 text-sm text-slate-300">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-white">Preview physical scale</p>
                <p className="mt-2 text-xs text-slate-400">Your model will normalize to exact physical dimensions before export.</p>
              </div>
              <span className="rounded-full bg-slate-950 px-3 py-1 text-xs uppercase tracking-[0.25em] text-cyan-300">
                {formatDimension(state.width, state.units)} × {formatDimension(state.height, state.units)} × {formatDimension(state.depth, state.units)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
