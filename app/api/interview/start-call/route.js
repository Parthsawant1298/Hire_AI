// API route to start VAPI web call server-side
import { startVAPIWebCall } from '@/lib/vapi-service';

export async function POST(request) {
  try {
    const { assistantId, metadata } = await request.json();
    
    console.log('Starting VAPI web call API with:', { assistantId, metadata });
    
    if (!assistantId) {
      throw new Error('Assistant ID is required');
    }

    // Use the centralized web call function
    const call = await startVAPIWebCall(assistantId, metadata);
    
    return Response.json({ 
      success: true, 
      call: call,
      webCallUrl: call.webCallUrl || call.callUrl
    });
    
  } catch (error) {
    console.error('Start call API error:', error);
    
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}