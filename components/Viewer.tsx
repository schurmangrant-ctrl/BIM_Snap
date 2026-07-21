'use client';

import { OrbitControls, Grid, Stage } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { SimplifyModifier } from 'three-stdlib';
import type { BIMSnapState } from './types';

interface Props {
  state: ReturnType<typeof import('./useBIMSnapState').useBIMSnapState>;
}

function buildDefaultMesh() {
  const geometry = new THREE.BoxGeometry(1, 1, 1, 24, 24, 24);
  const material = new THREE.MeshStandardMaterial({ color: 0x70a5ff, metalness: 0.2, roughness: 0.4 });
  return new THREE.Mesh(geometry, material);
}

function normalizeScale(mesh: THREE.Mesh, state: BIMSnapState) {
  const width = state.units === 'mm' ? state.width / 1000 : state.width / 12;
  const height = state.units === 'mm' ? state.height / 1000 : state.height / 12;
  const depth = state.units === 'mm' ? state.depth / 1000 : state.depth / 12;
  const boundingBox = new THREE.Box3().setFromObject(mesh);
  const size = new THREE.Vector3();
  boundingBox.getSize(size);
  const maxDimension = Math.max(size.x, size.y, size.z, 1);
  const scale = new THREE.Vector3(width, height, depth).divide(size).multiplyScalar(1 / maxDimension);
  mesh.scale.copy(scale);
}

function simplifyMesh(mesh: THREE.Mesh, state: BIMSnapState) {
  const target = state.density === 'low' ? 5000 : state.density === 'high' ? 30000 : 15000;
  const modifier = new SimplifyModifier();
  if (mesh.geometry.index) {
    const simplified = modifier.modify(mesh.geometry, Math.max(1000, target));
    mesh.geometry.dispose();
    mesh.geometry = simplified;
  }
}

export default function Viewer({ state }: Props) {
  const [mesh, setMesh] = useState<THREE.Mesh | null>(null);

  useEffect(() => {
    const sourceMesh = buildDefaultMesh();
    simplifyMesh(sourceMesh, state);
    normalizeScale(sourceMesh, state);
    setMesh(sourceMesh);
  }, [state.width, state.height, state.depth, state.units, state.density, state.imageSrc]);

  const boundingHelper = useMemo(() => {
    if (!mesh || !state.bounding) return null;
    const box = new THREE.Box3().setFromObject(mesh);
    const size = new THREE.Vector3();
    box.getSize(size);
    const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    const material = new THREE.MeshBasicMaterial({ color: 0x10b981, wireframe: true });
    const helper = new THREE.Mesh(geometry, material);
    helper.position.copy(box.getCenter(new THREE.Vector3()));
    return helper;
  }, [mesh, state.bounding]);

  return (
    <Canvas shadows camera={{ position: [2, 2, 2], fov: 45 }}>
      <ambientLight intensity={0.45} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} />
      <Stage preset="rembrandt" intensity={0.6}>
        {mesh ? <primitive object={mesh} /> : null}
        {boundingHelper ? <primitive object={boundingHelper} /> : null}
      </Stage>
      <OrbitControls enablePan enableZoom enableRotate />
      <Grid args={[10, 10]} sectionColor={0x334155} fadeDistance={30} />
    </Canvas>
  );
}
