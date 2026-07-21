'use client';

import * as THREE from 'three';
import { GLTFExporter, OBJExporter, SimplifyModifier } from 'three-stdlib';
import type { BIMSnapState } from './types';

const UNIT_CONVERSION = {
  in: 0.0254,
  mm: 0.001
};

export function buildExportMesh(state: BIMSnapState) {
  const geometry = new THREE.BoxGeometry(1, 1, 1, 48, 48, 48);
  const material = new THREE.MeshStandardMaterial({ color: 0x8dd4ff, metalness: 0.1, roughness: 0.35 });
  const mesh = new THREE.Mesh(geometry, material);
  const widthMeters = state.units === 'in' ? state.width * UNIT_CONVERSION.in : state.width * UNIT_CONVERSION.mm;
  const heightMeters = state.units === 'in' ? state.height * UNIT_CONVERSION.in : state.height * UNIT_CONVERSION.mm;
  const depthMeters = state.units === 'in' ? state.depth * UNIT_CONVERSION.in : state.depth * UNIT_CONVERSION.mm;

  const box = new THREE.Box3().setFromObject(mesh);
  const size = new THREE.Vector3();
  box.getSize(size);

  if (size.x > 0 && size.y > 0 && size.z > 0) {
    mesh.scale.set(widthMeters / size.x, heightMeters / size.y, depthMeters / size.z);
  }

  simplifyMesh(mesh, state);
  return mesh;
}

export function simplifyMesh(mesh: THREE.Mesh, state: BIMSnapState) {
  const targetVertices = state.density === 'low' ? 5000 : state.density === 'high' ? 30000 : 15000;
  const modifier = new SimplifyModifier();
  const geometry = mesh.geometry.clone();
  try {
    const simplified = modifier.modify(geometry, Math.max(1000, targetVertices));
    mesh.geometry.dispose();
    mesh.geometry = simplified;
  } catch (error) {
    console.warn('Mesh simplification failed, using full geometry.', error);
  }
}

export function exportOBJ(mesh: THREE.Mesh, filename: string) {
  const exporter = new OBJExporter();
  const result = exporter.parse(mesh);
  const blob = new Blob([result], { type: 'text/plain' });
  downloadBlob(blob, filename);
}

export async function exportGLB(mesh: THREE.Mesh, filename: string) {
  const exporter = new GLTFExporter();
  try {
    const gltf = await exporter.parseAsync(mesh, { binary: true });
    const output = gltf instanceof ArrayBuffer ? gltf : JSON.stringify(gltf, null, 2);
    const blob = output instanceof ArrayBuffer ? new Blob([output], { type: 'model/gltf-binary' }) : new Blob([output], { type: 'application/json' });
    downloadBlob(blob, filename);
  } catch (error) {
    console.warn('Failed to export GLB', error);
  }
}

export function exportDAE(mesh: THREE.Mesh, filename: string) {
  const vertices: string[] = [];
  const normals: string[] = [];
  const faces: string[] = [];
  const geometry = mesh.geometry as THREE.BufferGeometry;
  const position = geometry.getAttribute('position');
  const index = geometry.index;

  if (!position || position.count === 0) {
    return;
  }

  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    vertices.push(`v ${x.toFixed(6)} ${y.toFixed(6)} ${z.toFixed(6)}`);
  }

  if (index) {
    for (let i = 0; i < index.count; i += 3) {
      const a = index.getX(i) + 1;
      const b = index.getX(i + 1) + 1;
      const c = index.getX(i + 2) + 1;
      faces.push(`f ${a} ${b} ${c}`);
    }
  } else {
    for (let i = 0; i < position.count; i += 3) {
      faces.push(`f ${i + 1} ${i + 2} ${i + 3}`);
    }
  }

  const content = `<?xml version="1.0" encoding="utf-8"?>\n<COLLADA xmlns="https://www.collada.org/2005/11/COLLADASchema" version="1.4.1">\n  <asset>\n    <contributor><authoring_tool>BIMsnap</authoring_tool></contributor>\n    <created>${new Date().toISOString()}</created>\n    <modified>${new Date().toISOString()}</modified>\n    <up_axis>Y_UP</up_axis>\n  </asset>\n  <library_geometries>\n    <geometry id="mesh0" name="mesh0">\n      <mesh>\n        <source id="mesh0-positions">\n          <float_array id="mesh0-positions-array" count="${position.count * 3}">${position.array.join(' ')}</float_array>\n          <technique_common>\n            <accessor source="#mesh0-positions-array" count="${position.count}" stride="3">\n              <param name="X" type="float"/>\n              <param name="Y" type="float"/>\n              <param name="Z" type="float"/>\n            </accessor>\n          </technique_common>\n        </source>\n        <vertices id="mesh0-vertices">\n          <input semantic="POSITION" source="#mesh0-positions"/>\n        </vertices>\n        <polylist count="${faces.length}">\n          <input semantic="VERTEX" source="#mesh0-vertices" offset="0"/>\n          <vcount>${faces.map(() => '3').join(' ')}</vcount>\n          <p>${faces
    .map((face) => face
      .split(' ')
      .slice(1)
      .flatMap((idx) => [idx, idx, idx])
      .join(' ')
    )
    .join(' ')}</p>\n        </polylist>\n      </mesh>\n    </geometry>\n  </library_geometries>\n</COLLADA>`;

  const blob = new Blob([content], { type: 'model/vnd.collada+xml' });
  downloadBlob(blob, filename);
}

export function exportSATPlaceholder(state: BIMSnapState, filename: string) {
  const content = `BIMsnap SAT placeholder\nProduct: ${state.productName}\nCategory: ${state.category}\nPhysical size: ${state.width} ${state.units} × ${state.height} ${state.units} × ${state.depth} ${state.units}\nExport note: Use a CAD tool to create a true SAT from this proxy.`;
  const blob = new Blob([content], { type: 'text/plain' });
  downloadBlob(blob, filename);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
