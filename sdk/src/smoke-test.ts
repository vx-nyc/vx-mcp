import { createVxClient } from './vx-client.js';

async function main() {
  const apiBaseUrl = process.env.VX_API_BASE_URL || process.env.VX_API_URL;
  const apiKey = process.env.VX_API_KEY;
  const bearerToken = process.env.VX_BEARER_TOKEN;

  if (!apiBaseUrl || (!apiKey && !bearerToken)) {
    console.error(
      'VX_API_BASE_URL (or VX_API_URL) and VX_API_KEY or VX_BEARER_TOKEN are required to run the SDK smoke test.',
    );
    process.exit(1);
  }

  const baseUrl = apiBaseUrl.endsWith('/v1') ? apiBaseUrl : `${apiBaseUrl.replace(/\/+$/, '')}/v1`;

  const client = createVxClient({
    apiBaseUrl: baseUrl,
    apiKey: apiKey || undefined,
    bearerToken: bearerToken || undefined,
  });

  const created = await client.createMemory({
    content: 'SDK smoke test memory',
    context: 'sdk/smoke',
    memoryType: 'SEMANTIC',
  });

  const result = await client.queryMemories({
    query: 'SDK smoke test memory',
    contexts: ['sdk/smoke'],
    limit: 5,
  });

  console.log(
    JSON.stringify(
      {
        createdId: created.id,
        total: result.total,
        sample: result.memories.slice(0, 1),
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error('SDK smoke test failed:', err);
  process.exit(1);
});

