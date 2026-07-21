import { NextResponse } from 'next/server';

const MODEL_API_URL = 'https://api-inference.huggingface.co/models/your/open-source-mesh-generator';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = await fetch(MODEL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.HUGGINGFACE_API_TOKEN || ''}`
      },
      body: JSON.stringify({ inputs: body.imageBase64, options: { wait_for_model: true } })
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Model inference failed' }, { status: 502 });
    }

    const result = await response.json();
    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json({ error: 'Unable to generate 3D model' }, { status: 500 });
  }
}
