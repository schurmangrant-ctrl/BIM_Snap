'use client';

import { useMemo, useState } from 'react';
import type { BIMSnapState } from './types';

const defaultState: BIMSnapState = {
  imageSrc: null,
  productName: 'Sample Fixture',
  category: 'Lighting Fixtures',
  width: 24,
  height: 18,
  depth: 12,
  units: 'in',
  density: 'medium',
  polygonCountLabel: 'Medium: ~15,000 polys',
  wireframe: false,
  bounding: true,
  loading: false,
  generatedMesh: ''
};

export function useBIMSnapState() {
  const [state, setState] = useState<BIMSnapState>(defaultState);

  const updateState = useMemo(
    () => (patch: Partial<BIMSnapState>) => {
      setState((prev) => ({ ...prev, ...patch }));
    },
    []
  );

  return { ...state, setState: updateState };
}
