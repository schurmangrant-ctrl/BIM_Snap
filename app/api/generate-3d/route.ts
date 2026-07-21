import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { imageBase64, width, height, depth, density, category } = body;
    // If an image is provided, prefer generating from Hugging Face depth inference
    if (imageBase64) {
      let hfError: string | null = null;
      try {
        const imageBuffer = decodeBase64Image(imageBase64);
        const depthResult = await fetchDepthFromHuggingFace(imageBuffer);

        let { width: imgW, height: imgH, depth: depthArr } = depthResult; // Float32Array normalized 0..1

        // Determine target image resolution from requested density
        const densityLevel = (density || 'medium') as string;
        const targetMaxDim = densityLevel === 'low' ? 128 : densityLevel === 'high' ? 512 : 256;

        // Downsample depth to a controlled resolution (averaging) for simpler geometry
        const scale = Math.min(1, targetMaxDim / Math.max(imgW, imgH));
        const resW = Math.max(2, Math.floor(imgW * scale));
        const resH = Math.max(2, Math.floor(imgH * scale));
        const downDepth = resizeDepth(depthArr, imgW, imgH, resW, resH);

        // Apply edge-preserving bilateral filter to remove fine surface detail (stitching) while preserving larger component edges
        const sigmaSpatial = Math.max(1, Math.min(8, Math.round(Math.max(resW, resH) / 100))); // ~1-8
        const sigmaRange = 0.03; // range sensitivity (keeps larger shape differences)
        const smoothDepth = bilateralFilter(downDepth, resW, resH, sigmaSpatial, sigmaRange);

        // Map to user dimensions (defaults if not provided)
        const targetWidth = (width || 24) / 100; // meters
        const targetHeight = (height || 18) / 100; // meters
        const zScale = Math.max(targetWidth, targetHeight) * 0.6;

        const mesh = depthToHeightfieldMesh(smoothDepth, resW, resH, targetWidth, targetHeight, zScale);

        mesh.metadata = {
          source: 'huggingface-depth',
          model: 'Intel/dpt-large',
          generated: new Date().toISOString(),
          dimensions: { width: width || 24, height: height || 18 }
        };

        return NextResponse.json({ result: mesh, success: true, message: '3D model generated from image' });
      } catch (err: any) {
        console.error('HF depth generation failed:', err);
        hfError = err?.message ? String(err.message) : String(err);
        // Fall through to procedural generation below
      }
    }

    // Fallback: Generate a procedural 3D model based on dimensions and category
    const mesh = generateProceduralMesh(
      width || 24,
      height || 18,
      depth || 12,
      category || 'Furniture',
      density || 'medium'
    );

    const responsePayload: any = {
      result: mesh,
      success: true,
      message: '3D model generated successfully'
    };
    if (typeof hfError !== 'undefined' && hfError !== null) {
      responsePayload.hfError = hfError;
      responsePayload.message = 'Hugging Face inference failed; returned procedural fallback.';
    }

    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json({ error: 'Unable to generate 3D model' }, { status: 500 });
  }
}

// Decode a base64 data URL or raw base64 string into a Buffer
function decodeBase64Image(data: string) {
  const match = data.match(/^data:.*;base64,(.*)$/);
  const b64 = match ? match[1] : data;
  return Buffer.from(b64, 'base64');
}

async function fetchDepthFromHuggingFace(imageBuffer: Buffer) {
  const token = process.env.HF_TOKEN;
  if (!token) throw new Error('HF_TOKEN not set in environment');

  const res = await fetch('https://api-inference.huggingface.co/models/Intel/dpt-large', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/octet-stream'
    },
    body: imageBuffer
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`HF inference failed: ${res.status} ${txt}`);
  }

  const arr = await res.arrayBuffer();
  // Dynamically import pngjs at runtime to avoid bundling issues in Edge environments
  const pngjs = await import('pngjs');
  const PNG = (pngjs as any).PNG;
  const png = PNG.sync.read(Buffer.from(arr));
  const { width, height, data } = png;

  const depth = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const gray = (r + g + b) / 3;
    depth[i] = gray / 255; // normalize 0..1
  }

  return { depth, width, height };
}

function depthToHeightfieldMesh(depthArr: Float32Array, imgW: number, imgH: number, targetW: number, targetH: number, zScale = 1) {
  const vertices: number[] = [];
  const indices: number[] = [];

  const dx = imgW > 1 ? targetW / (imgW - 1) : targetW;
  const dy = imgH > 1 ? targetH / (imgH - 1) : targetH;

  for (let y = 0; y < imgH; y++) {
    for (let x = 0; x < imgW; x++) {
      const z = depthArr[y * imgW + x] * zScale;
      const px = x * dx - targetW / 2;
      const py = (imgH - 1 - y) * dy - targetH / 2; // flip Y so image top becomes +Y
      vertices.push(px, py, z);
    }
  }

  for (let y = 0; y < imgH - 1; y++) {
    for (let x = 0; x < imgW - 1; x++) {
      const a = y * imgW + x;
      const b = a + 1;
      const c = (y + 1) * imgW + x;
      const d = c + 1;
      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }

  return { vertices, indices };
}

// Resize a depth map (averaging) to target dimensions
function resizeDepth(src: Float32Array, srcW: number, srcH: number, dstW: number, dstH: number) {
  const dst = new Float32Array(dstW * dstH);
  for (let j = 0; j < dstH; j++) {
    for (let i = 0; i < dstW; i++) {
      const x0 = Math.floor(i * srcW / dstW);
      const x1 = Math.min(srcW, Math.ceil((i + 1) * srcW / dstW));
      const y0 = Math.floor(j * srcH / dstH);
      const y1 = Math.min(srcH, Math.ceil((j + 1) * srcH / dstH));
      let sum = 0;
      let count = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          sum += src[y * srcW + x];
          count++;
        }
      }
      dst[j * dstW + i] = count > 0 ? sum / count : 0;
    }
  }
  return dst;
}

// Basic bilateral filter for edge-preserving smoothing on depth maps
function bilateralFilter(src: Float32Array, w: number, h: number, sigmaSpatial = 3, sigmaRange = 0.05) {
  const dst = new Float32Array(w * h);
  const rs = Math.ceil(sigmaSpatial * 2);
  const gaussSpatial = new Float32Array((2 * rs + 1) * (2 * rs + 1));
  for (let dy = -rs; dy <= rs; dy++) {
    for (let dx = -rs; dx <= rs; dx++) {
      const d = Math.sqrt(dx * dx + dy * dy);
      const val = Math.exp(-(d * d) / (2 * sigmaSpatial * sigmaSpatial));
      gaussSpatial[(dy + rs) * (2 * rs + 1) + (dx + rs)] = val;
    }
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const center = src[y * w + x];
      let sum = 0;
      let wsum = 0;
      for (let dy = -rs; dy <= rs; dy++) {
        const yy = Math.min(h - 1, Math.max(0, y + dy));
        for (let dx = -rs; dx <= rs; dx++) {
          const xx = Math.min(w - 1, Math.max(0, x + dx));
          const sample = src[yy * w + xx];
          const range = sample - center;
          const wr = Math.exp(-(range * range) / (2 * sigmaRange * sigmaRange));
          const ws = gaussSpatial[(dy + rs) * (2 * rs + 1) + (dx + rs)];
          const wgt = ws * wr;
          sum += sample * wgt;
          wsum += wgt;
        }
      }
      dst[y * w + x] = wsum > 0 ? sum / wsum : center;
    }
  }

  return dst;
}

// Generate procedural mesh based on category and dimensions
function generateProceduralMesh(width: number, height: number, depth: number, category: string, density: string) {
  const vertices: number[] = [];
  const indices: number[] = [];

  // Normalize dimensions to meters
  const w = width / 100;
  const h = height / 100;
  const d = depth / 100;

  // Generate different shapes based on category
  if (category.includes('Lighting')) {
    generateLampGeometry(vertices, indices, w, h, d, density);
  } else if (category.includes('Plumbing')) {
    generatePlumbingGeometry(vertices, indices, w, h, d, density);
  } else {
    // Default furniture
    generateFurnitureGeometry(vertices, indices, w, h, d, density);
  }

  return {
    vertices,
    indices,
    metadata: {
      generated: new Date().toISOString(),
      category,
      dimensions: { width, height, depth }
    }
  };
}

// Generate simple furniture box with details
function generateFurnitureGeometry(vertices: number[], indices: number[], w: number, h: number, d: number, density: string) {
  // Main body - rounded box
  const cornerRadius = 0.05;
  const widthSegments = density === 'high' ? 16 : density === 'low' ? 4 : 8;
  const heightSegments = density === 'high' ? 20 : density === 'low' ? 6 : 12;
  const depthSegments = density === 'high' ? 16 : density === 'low' ? 4 : 8;

  // Add base geometry
  addRoundedBox(vertices, indices, w, h, d, cornerRadius, widthSegments, heightSegments, depthSegments);

  // Add detail/legs
  if (h > 0.3) {
    addLegs(vertices, indices, w, h, d, density);
  }
}

// Generate lamp-like geometry
function generateLampGeometry(vertices: number[], indices: number[], w: number, h: number, d: number, density: string) {
  // Cylinder base
  addCylinder(vertices, indices, w * 0.4, 0.1, 16, 4);

  // Pole
  addCylinder(vertices, indices, w * 0.05, h - 0.15, 8, 8);

  // Lamp head
  addSphere(vertices, indices, w * 0.3, density === 'high' ? 16 : 8);
}

// Generate plumbing fixture geometry
function generatePlumbingGeometry(vertices: number[], indices: number[], w: number, h: number, d: number, density: string) {
  // Simple fixture shape
  addRoundedBox(vertices, indices, w * 0.8, h, d * 0.6, 0.02, 8, 12, 6);
}

// Add rounded box to geometry
function addRoundedBox(
  vertices: number[],
  indices: number[],
  width: number,
  height: number,
  depth: number,
  radius: number,
  wSegs: number,
  hSegs: number,
  dSegs: number
) {
  const startIdx = vertices.length / 3;
  const hw = width / 2;
  const hh = height / 2;
  const hd = depth / 2;

  // Create box vertices
  for (let x = 0; x <= wSegs; x++) {
    for (let y = 0; y <= hSegs; y++) {
      for (let z = 0; z <= dSegs; z++) {
        const px = (x / wSegs - 0.5) * width;
        const py = (y / hSegs - 0.5) * height;
        const pz = (z / dSegs - 0.5) * depth;

        vertices.push(px, py, pz);
      }
    }
  }

  // Create faces
  const wStride = (hSegs + 1) * (dSegs + 1);
  for (let x = 0; x < wSegs; x++) {
    for (let y = 0; y < hSegs; y++) {
      for (let z = 0; z < dSegs; z++) {
        const a = startIdx + x * wStride + y * (dSegs + 1) + z;
        const b = a + 1;
        const c = a + (dSegs + 1);
        const d = c + 1;

        indices.push(a, b, c);
        indices.push(b, d, c);
      }
    }
  }
}

// Add cylinder
function addCylinder(vertices: number[], indices: number[], radius: number, height: number, radialSegs: number, heightSegs: number) {
  const startIdx = vertices.length / 3;

  // Create cylinder
  for (let i = 0; i <= radialSegs; i++) {
    const angle = (i / radialSegs) * Math.PI * 2;
    for (let j = 0; j <= heightSegs; j++) {
      const y = (j / heightSegs) * height - height / 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      vertices.push(x, y, z);
    }
  }

  // Create faces
  for (let i = 0; i < radialSegs; i++) {
    for (let j = 0; j < heightSegs; j++) {
      const a = startIdx + i * (heightSegs + 1) + j;
      const b = a + 1;
      const c = startIdx + (i + 1) * (heightSegs + 1) + j;
      const d = c + 1;

      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }
}

// Add sphere
function addSphere(vertices: number[], indices: number[], radius: number, segments: number) {
  const startIdx = vertices.length / 3;

  for (let i = 0; i <= segments; i++) {
    const phi = (i / segments) * Math.PI;
    for (let j = 0; j <= segments; j++) {
      const theta = (j / segments) * Math.PI * 2;
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.cos(phi);
      const z = radius * Math.sin(phi) * Math.sin(theta);
      vertices.push(x, y, z);
    }
  }

  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < segments; j++) {
      const a = startIdx + i * (segments + 1) + j;
      const b = a + 1;
      const c = startIdx + (i + 1) * (segments + 1) + j;
      const d = c + 1;

      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }
}

// Add legs to furniture
function addLegs(vertices: number[], indices: number[], w: number, h: number, d: number, density: string) {
  const legRadius = 0.02;
  const legHeight = h * 0.8;
  const legOffset = 0.1;

  // 4 legs at corners
  const positions = [
    [-w / 2 + legOffset, -h / 2, -d / 2 + legOffset],
    [w / 2 - legOffset, -h / 2, -d / 2 + legOffset],
    [-w / 2 + legOffset, -h / 2, d / 2 - legOffset],
    [w / 2 - legOffset, -h / 2, d / 2 - legOffset]
  ];

  positions.forEach(() => {
    addCylinder(vertices, indices, legRadius, legHeight, 6, 4);
  });
}
