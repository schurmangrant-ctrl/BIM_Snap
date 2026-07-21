export type AecCategory = 'Furniture' | 'Lighting Fixtures' | 'Plumbing' | 'Specialty Equipment';

export type ExportFormat = 'obj' | 'glb' | 'sat' | 'dae';

export interface BIMSnapState {
  imageSrc: string | null;
  productName: string;
  category: AecCategory;
  width: number;
  height: number;
  depth: number;
  units: 'in' | 'mm';
  density: 'low' | 'medium' | 'high';
  polygonCountLabel: string;
  wireframe: boolean;
  bounding: boolean;
  loading: boolean;
  generatedMesh: string;
}
