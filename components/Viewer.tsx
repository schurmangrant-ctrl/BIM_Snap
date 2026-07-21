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
  const geometry = new THREE.BoxGeometry(1, 1, 1, 32, 32, 32);
  const material = new THREE.MeshStandardMaterial({
    color: 0x3b82f6,
    metalness: 0.3,
    roughness: 0.3,
    envMapIntensity: 1
  });
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
    let sourceMesh: THREE.Mesh;

    if (state.generatedMesh) {
      try {
        const meshData = JSON.parse(state.generatedMesh);
        const geometry = new THREE.BufferGeometry();
        
        // Add vertices
        if (meshData.vertices && meshData.vertices.length > 0) {
          geometry.setAttribute(
            'position',
            new THREE.BufferAttribute(new Float32Array(meshData.vertices), 3)
          );
        }
        
        // Add indices
        if (meshData.indices && meshData.indices.length > 0) {
          geometry.setIndex(
            new THREE.BufferAttribute(new Uint32Array(meshData.indices), 1)
          );
        }
        
        geometry.computeVertexNormals();
        
        const material = new THREE.MeshStandardMaterial({
          color: 0x06b6d4,
          metalness: 0.2,
          roughness: 0.25,
          side: THREE.DoubleSide
        });
        
        sourceMesh = new THREE.Mesh(geometry, material);
      } catch (error) {
        console.error('Failed to parse mesh:', error);
        sourceMesh = buildDefaultMesh();
      }
    } else {
      sourceMesh = buildDefaultMesh();
    }

    simplifyMesh(sourceMesh, state);
    normalizeScale(sourceMesh, state);
    setMesh(sourceMesh);
  }, [state.width, state.height, state.depth, state.units, state.density, state.imageSrc, state.generatedMesh]);

  const boundingHelper = useMemo(() => {
    if (!mesh || !state.bounding) return null;
    const box = new THREE.Box3().setFromObject(mesh);
    const size = new THREE.Vector3();
    box.getSize(size);
    const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    const material = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      wireframe: true,
      opacity: 0.4,
      transparent: true
    });
    const helper = new THREE.Mesh(geometry, material);
    helper.position.copy(box.getCenter(new THREE.Vector3()));
    return helper;
  }, [mesh, state.bounding]);

  return (
    <Canvas
      shadows
      camera={{ position: [3, 2.5, 3], fov: 50 }}
      style={{ width: '100%', height: '100%' }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[8, 12, 8]} intensity={1.2} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
      <directionalLight position={[-5, 8, -5]} intensity={0.4} />

      <Stage
        adjustCamera={false}
        intensity={0.8}
        preset="rembrandt"
        environment="city"
      >
        {mesh && <primitive object={mesh} />}
        {boundingHelper && <primitive object={boundingHelper} />}
      </Stage>

      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        autoRotate
        autoRotateSpeed={3}
      />
      <Grid
        args={[15, 15]}
        cellSize={0.5}
        cellColor={0x475569}
        sectionSize={2}
        sectionColor={0x1e293b}
        fadeDistance={30}
        fadeStrength={0.5}
      />

      <fog attach="fog" args={['#000000', 20, 50]} />
    </Canvas>
  );
}
