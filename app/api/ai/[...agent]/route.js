
import { NextResponse } from 'next/server';

async function handleProxy(req) {
  try {
    const { pathname } = new URL(req.url);
    const agentPath = pathname.replace('/api/ai/', '');
    
    // Support unified gateway URL from environment variables
    const gatewayUrl = process.env.AI_GATEWAY_URL || 'http://localhost:8080';
    const flaskUrl = `${gatewayUrl}/${agentPath}`;
    
    console.log(`📡 AI Proxying [${req.method}] ${agentPath} to: ${flaskUrl}`);

    const contentType = req.headers.get('content-type') || '';
    const fetchOptions = {
      method: req.method,
      headers: {},
    };

    // Forward headers from original request (excluding host)
    for (const [key, value] of req.headers.entries()) {
      if (key.toLowerCase() !== 'host' && key.toLowerCase() !== 'content-length') {
        fetchOptions.headers[key] = value;
      }
    }

    // Forward body based on content type
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (contentType.includes('multipart/form-data')) {
        // For FormData, we need to handle the stream correctly
        const formData = await req.formData();
        const proxyFormData = new FormData();
        
        for (const [key, value] of formData.entries()) {
          proxyFormData.append(key, value);
        }
        
        // Note: fetch will automatically set the correct boundary for FormData
        fetchOptions.body = proxyFormData;
        // Don't manually set Content-Type for FormData, fetch does it
        delete fetchOptions.headers['content-type'];
      } else {
        const body = await req.json();
        fetchOptions.body = JSON.stringify(body);
        fetchOptions.headers['Content-Type'] = 'application/json';
      }
    }

    const response = await fetch(flaskUrl, fetchOptions);

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: `AI Service Error: ${errorText}` }, { status: response.status });
    }

    // For file downloads (like optimized resumes)
    if (agentPath.startsWith('download/')) {
      const blob = await response.blob();
      return new NextResponse(blob, {
        headers: {
          'Content-Type': response.headers.get('Content-Type') || 'application/pdf',
          'Content-Disposition': response.headers.get('Content-Disposition') || 'attachment',
        },
      });
    }

    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('AI Proxy Error:', error);
    return NextResponse.json({ error: 'Internal AI Proxy Error' }, { status: 500 });
  }
}

export async function GET(req)    { return handleProxy(req); }
export async function POST(req)   { return handleProxy(req); }
export async function DELETE(req) { return handleProxy(req); }
export async function PUT(req)    { return handleProxy(req); }
