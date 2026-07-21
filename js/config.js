const APP_CONFIG = {
  supabaseUrl: 'https://sjjybpydkwvgqfyqliod.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqanlicHlka3d2Z3FmeXFsaW9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzMTE0MDYsImV4cCI6MjA5ODg4NzQwNn0.T3GOm9IR3BTl1bFFcfbaYznraj0G-AlJRNb8H2MReDU',
  LINKEDIN_CLIENT_ID: '774sbtceu4nynv',
  REDIRECT_URI: 'https://linkedin-dashboard-murex.vercel.app/linkedin-callback.html',
  LINKEDIN_EDGE_FUNCTION: 'https://sjjybpydkwvgqfyqliod.supabase.co/functions/v1/linkedin-token-exchange',
  LINKEDIN_SCOPES: 'openid profile w_member_social email',
  LINKEDIN_DISCONNECT_FUNCTION: 'https://sjjybpydkwvgqfyqliod.supabase.co/functions/v1/linkedin-disconnect',
  N8N_LINKEDIN_GENERATE_WEBHOOK: 'https://rajahasnat.app.n8n.cloud/webhook/linkedin-generate',
  linkedinOAuth: {
    clientId: '774sbtceu4nynv',
    redirectUri: 'https://linkedin-dashboard-murex.vercel.app/linkedin-callback.html',
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    scopes: 'openid profile w_member_social email'
  },
  N8N_LINKEDIN_PUBLISH_WEBHOOK: 'https://rajahasnat.app.n8n.cloud/webhook/linkedin-publish'
};

window.supabase = window.supabase.createClient(APP_CONFIG.supabaseUrl, APP_CONFIG.supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
