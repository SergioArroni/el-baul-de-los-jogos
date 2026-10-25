// Vercel function /api/mcp (web-standard handlers: Request in, Response out).
import { allowedHosts, createBaulHandler } from '../mcp/server';
import { authorizationServer, supabaseData, verifyToken } from '../mcp/supabase';

const handle = createBaulHandler({
  allowedHosts: allowedHosts(),
  dataFor: token => supabaseData(token),
  authorizationServer: authorizationServer(),
  verify: token => verifyToken(token),
});

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
