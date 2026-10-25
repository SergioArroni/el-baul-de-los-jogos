// Vercel function behind /.well-known/oauth-protected-resource (see vercel.json): tells
// MCP clients that tokens for /api/mcp come from Supabase Auth's OAuth server.
import { protectedResource, requestOrigin } from '../mcp/server';
import { authorizationServer } from '../mcp/supabase';

export const GET = (request: Request): Response =>
  Response.json(protectedResource(requestOrigin(request), '/api/mcp', authorizationServer()), {
    headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=3600' },
  });
