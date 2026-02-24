/**
 * VX MCP SDK - Basic Usage Examples
 * 
 * Run with: npx tsx examples/basic-usage.ts
 * 
 * Set environment variables:
 *   VX_API_URL=https://api.vessel.nyc
 *   VX_API_KEY=your-api-key
 */

import { VXClient, createClientFromEnv } from '../src/client.js';
import type { Memory } from '../src/types.js';

async function main() {
  // Create client from environment variables
  const client = createClientFromEnv();

  console.log('🔌 Checking API connectivity...');
  const health = await client.healthCheck();
  console.log(`   Status: ${health.ok ? '✅ Connected' : '❌ Failed'} (${health.latency}ms)\n`);

  if (!health.ok) {
    console.error('Failed to connect to VX API. Check your VX_API_URL and VX_API_KEY.');
    process.exit(1);
  }

  // ============================================================================
  // Store Examples
  // ============================================================================

  console.log('📝 Storing memories...\n');

  // Store a semantic memory (fact/knowledge)
  const semanticMemory = await client.store({
    content: 'User prefers TypeScript over JavaScript for new projects.',
    context: 'preferences/coding',
    memoryType: 'SEMANTIC',
    importance: 0.8,
  });
  console.log(`   ✅ Stored SEMANTIC memory: ${semanticMemory.id}`);

  // Store an episodic memory (event/experience)
  const episodicMemory = await client.store({
    content: 'User completed the React tutorial on February 24, 2026.',
    context: 'learning/react',
    memoryType: 'EPISODIC',
    importance: 0.5,
  });
  console.log(`   ✅ Stored EPISODIC memory: ${episodicMemory.id}`);

  // Store a procedural memory (how-to/process)
  const proceduralMemory = await client.store({
    content: 'To deploy: run "npm run build" then "npm publish --access public"',
    context: 'work/deployment',
    memoryType: 'PROCEDURAL',
    importance: 0.9,
  });
  console.log(`   ✅ Stored PROCEDURAL memory: ${proceduralMemory.id}\n`);

  // ============================================================================
  // Query Examples
  // ============================================================================

  console.log('🔍 Querying memories...\n');

  // Query by semantic similarity
  const queryResult = await client.query({
    query: 'What programming languages does the user prefer?',
    limit: 5,
  });
  console.log(`   Found ${queryResult.memories.length} memories:`);
  queryResult.memories.forEach((m, i) => {
    console.log(`   ${i + 1}. ${m.content.substring(0, 60)}...`);
  });
  console.log();

  // Query with context filter
  const workMemories = await client.query({
    query: 'deployment process',
    context: 'work',
    limit: 3,
  });
  console.log(`   Work context: Found ${workMemories.memories.length} memories\n`);

  // ============================================================================
  // List Examples
  // ============================================================================

  console.log('📋 Listing memories...\n');

  // List all memories
  const allMemories = await client.list({ limit: 10 });
  console.log(`   Total memories: ${allMemories.total}`);
  console.log(`   Showing: ${allMemories.memories.length}\n`);

  // List by memory type
  const procedures = await client.list({
    memoryType: 'PROCEDURAL',
    limit: 5,
  });
  console.log(`   Procedural memories: ${procedures.total}\n`);

  // ============================================================================
  // Update Example
  // ============================================================================

  console.log('✏️  Updating a memory...\n');

  const updatedMemory = await client.update({
    id: semanticMemory.id,
    content: 'User prefers TypeScript for all projects, not just new ones.',
    importance: 0.95,
  });
  console.log(`   ✅ Updated memory ${updatedMemory.id}\n`);

  // ============================================================================
  // Context Packet Example
  // ============================================================================

  console.log('📦 Getting context packet...\n');

  const contextPacket = await client.getContextPacket({
    topic: 'Help me set up a new project with the user\'s preferences',
    maxTokens: 2000,
  });
  console.log(`   Context from ${contextPacket.memoryCount} memories:`);
  console.log(`   "${contextPacket.context.substring(0, 100)}..."\n`);

  // ============================================================================
  // Delete Examples
  // ============================================================================

  console.log('🗑️  Cleaning up test memories...\n');

  await client.delete(semanticMemory.id);
  console.log(`   ✅ Deleted ${semanticMemory.id}`);
  
  await client.delete(episodicMemory.id);
  console.log(`   ✅ Deleted ${episodicMemory.id}`);
  
  await client.delete(proceduralMemory.id);
  console.log(`   ✅ Deleted ${proceduralMemory.id}`);

  console.log('\n✨ Done!');
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
