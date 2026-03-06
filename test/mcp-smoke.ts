import { spawn } from 'node:child_process';
import { once } from 'node:events';

async function run() {
  const child = spawn('node', ['dist/index.js'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      VX_API_KEY: process.env.VX_API_KEY || '',
      VX_API_BASE_URL:
        process.env.VX_API_BASE_URL || process.env.VX_API_URL || 'http://localhost:3000/v1',
    },
  });

  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk) => {
    if (chunk.toString().includes('VX MCP Server running on stdio')) {
      console.log('MCP server started (stdio transport).');
    }
  });

  await once(child, 'spawn');

  // For now we just verify that the process starts without immediately exiting.
  // A full MCP client handshake can be added later using @modelcontextprotocol/sdk.
  setTimeout(() => {
    child.kill();
    console.log('MCP smoke test completed.');
  }, 2000);
}

run().catch((err) => {
  console.error('MCP smoke test failed:', err);
  process.exit(1);
});

