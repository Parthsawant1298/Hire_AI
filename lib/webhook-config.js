// lib/webhook-config.js - VAPI Webhook Configuration Helper

export function getWebhookUrl() {
  // Get the base URL for webhook
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                 process.env.APP_URL || 
                 process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
                 'http://localhost:3000';
  
  return `${baseUrl}/api/webhook/vapi`;
}

export function validateWebhookConfig() {
  const webhookUrl = getWebhookUrl();
  
  // Basic validation
  const isValid = webhookUrl.startsWith('http') && 
                  webhookUrl.includes('/api/webhook/vapi');
  
  const issues = [];
  
  if (!isValid) {
    issues.push('Webhook URL format is invalid');
  }
  
  if (webhookUrl.includes('localhost') && process.env.NODE_ENV === 'production') {
    issues.push('Using localhost in production - webhook may not work');
  }
  
  return {
    isValid: issues.length === 0,
    webhookUrl,
    issues
  };
}

// VAPI Assistant Configuration with webhook
export function getVAPIAssistantConfig(baseConfig) {
  const webhookUrl = getWebhookUrl();
  
  return {
    ...baseConfig,
    // Add webhook configuration
    serverUrl: webhookUrl,
    serverUrlSecret: process.env.VAPI_WEBHOOK_SECRET || 'default-secret-change-this',
    // Ensure proper event handling
    endCallFunctionEnabled: true,
    // Add metadata for tracking
    metadata: {
      platform: 'hireai',
      environment: process.env.NODE_ENV || 'development',
      webhookUrl
    }
  };
}

export default {
  getWebhookUrl,
  validateWebhookConfig,
  getVAPIAssistantConfig
};