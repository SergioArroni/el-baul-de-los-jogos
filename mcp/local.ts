// Local MCP server for development and tests:
//   npx tsx mcp/local.ts
// SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY choose the backend (tests point it at the Docker stack).
import { createServer } from 'node:http';
import { createBaulHandler } from './server';
import { authorizationServer, supabaseData } from './supabase';

const port = Number(process.env.MCP_PORT ?? 8791);
const handle = createBaulHandler({
  allowedHosts: ['localhost', '127.0.0.1'],
  dataFor: token => supabaseData(token),
  authorizationServer: authorizationServer(),
  mcpPath: '/mcp',
});

// Node's http server speaks IncomingMessage/ServerResponse; the handler speaks Request/Response.
createServer(async (req, res) => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;
  const request = new Request(`http://${req.headers.host}${req.url}`, {
    method: req.method,
    headers: Object.entries(req.headers).flatMap(([k, v]) => (v === undefined ? [] : [[k, String(v)] as [string, string]])),
    body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body,
  });
  const response = await handle(request);
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
}).listen(port, '127.0.0.1', () => console.log(`MCP de El Baúl escuchando en http://127.0.0.1:${port}/mcp`));
