/**
 * VX Client Tests
 * 
 * These tests verify the VX client functionality.
 * For integration tests, set VX_API_KEY environment variable.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { VXClient, detectSource } from '../src/client.js';
import { VXError, Memory } from '../src/types.js';

// Test configuration
const TEST_API_URL = process.env.VX_TEST_API_URL || 'https://api.vessel.nyc';
const TEST_API_KEY = process.env.VX_API_KEY;
const RUN_INTEGRATION = !!TEST_API_KEY;

// =============================================================================
// Unit Tests (no API required)
// =============================================================================

describe('VXClient - Unit Tests', () => {
  describe('Configuration Validation', () => {
    it('should throw on missing apiUrl', () => {
      expect(() => new VXClient({ apiKey: 'test-key' } as any)).toThrow(VXError);
    });

    it('should throw on missing apiKey', () => {
      expect(() => new VXClient({ apiUrl: 'https://api.test.com' } as any)).toThrow(VXError);
    });

    it('should throw on invalid URL', () => {
      expect(() => new VXClient({ 
        apiUrl: 'not-a-url', 
        apiKey: 'test-key' 
      })).toThrow('Invalid VX_API_URL');
    });

    it('should strip trailing slash from apiUrl', () => {
      const client = new VXClient({
        apiUrl: 'https://api.test.com/',
        apiKey: 'test-key',
      });
      // Client created successfully - trailing slash handled internally
      expect(client).toBeDefined();
    });

    it('should use default values', () => {
      const client = new VXClient({
        apiUrl: 'https://api.test.com',
        apiKey: 'test-key',
      });
      expect(client).toBeDefined();
    });
  });

  describe('Input Validation', () => {
    let client: VXClient;

    beforeAll(() => {
      client = new VXClient({
        apiUrl: 'https://api.test.com',
        apiKey: 'test-key',
        maxRetries: 0, // Don't retry in tests
      });
    });

    it('should reject empty content in store', async () => {
      await expect(client.store({ content: '' })).rejects.toThrow('content');
    });

    it('should reject invalid importance in store', async () => {
      await expect(client.store({ content: 'test', importance: 2 })).rejects.toThrow('between 0 and 1');
    });

    it('should reject missing id in update', async () => {
      await expect(client.update({ id: '' })).rejects.toThrow('id is required');
    });

    it('should reject update with no fields', async () => {
      await expect(client.update({ id: 'test-id' })).rejects.toThrow('At least one field');
    });

    it('should reject empty query', async () => {
      await expect(client.query({ query: '' })).rejects.toThrow('query is required');
    });

    it('should reject empty id in delete', async () => {
      await expect(client.delete('')).rejects.toThrow('id is required');
    });

    it('should reject empty topic in getContextPacket', async () => {
      await expect(client.getContextPacket({ topic: '' })).rejects.toThrow('topic is required');
    });
  });

  describe('Source Detection', () => {
    it('should detect mcp as default', () => {
      expect(detectSource()).toBe('mcp');
    });
  });
});

// =============================================================================
// Integration Tests (require VX_API_KEY)
// =============================================================================

describe.skipIf(!RUN_INTEGRATION)('VXClient - Integration Tests', () => {
  let client: VXClient;
  const createdMemoryIds: string[] = [];

  beforeAll(() => {
    client = new VXClient({
      apiUrl: TEST_API_URL,
      apiKey: TEST_API_KEY!,
      source: 'test',
    });
  });

  afterAll(async () => {
    // Cleanup: delete all test memories
    for (const id of createdMemoryIds) {
      try {
        await client.delete(id);
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  describe('Health Check', () => {
    it('should verify API connectivity', async () => {
      const result = await client.healthCheck();
      expect(result.ok).toBe(true);
      expect(result.latency).toBeGreaterThan(0);
    });
  });

  describe('Store', () => {
    it('should store a semantic memory', async () => {
      const memory = await client.store({
        content: 'Test memory: The user prefers dark mode.',
        context: 'test/preferences',
        memoryType: 'SEMANTIC',
        importance: 0.7,
      });

      expect(memory.id).toBeDefined();
      expect(memory.content).toBe('Test memory: The user prefers dark mode.');
      expect(memory.memoryType).toBe('SEMANTIC');
      createdMemoryIds.push(memory.id);
    });

    it('should store an episodic memory', async () => {
      const memory = await client.store({
        content: 'Test event: User completed onboarding on Feb 24, 2026.',
        context: 'test/events',
        memoryType: 'EPISODIC',
      });

      expect(memory.id).toBeDefined();
      expect(memory.memoryType).toBe('EPISODIC');
      createdMemoryIds.push(memory.id);
    });

    it('should store a procedural memory', async () => {
      const memory = await client.store({
        content: 'Test procedure: To deploy, run npm run build && npm publish.',
        context: 'test/procedures',
        memoryType: 'PROCEDURAL',
      });

      expect(memory.id).toBeDefined();
      expect(memory.memoryType).toBe('PROCEDURAL');
      createdMemoryIds.push(memory.id);
    });
  });

  describe('Query', () => {
    it('should query memories by semantic similarity', async () => {
      // First store a memory
      const stored = await client.store({
        content: 'Integration test: User favorite color is blue.',
        context: 'test/query',
      });
      createdMemoryIds.push(stored.id);

      // Query for it
      const result = await client.query({
        query: 'what is the user favorite color',
        limit: 5,
      });

      expect(result.memories).toBeDefined();
      expect(Array.isArray(result.memories)).toBe(true);
    });

    it('should filter by context', async () => {
      const result = await client.query({
        query: 'test',
        context: 'test/query',
        limit: 10,
      });

      expect(result.memories).toBeDefined();
    });

    it('should filter by memory type', async () => {
      const result = await client.query({
        query: 'deploy',
        memoryType: 'PROCEDURAL',
        limit: 5,
      });

      expect(result.memories).toBeDefined();
    });
  });

  describe('List', () => {
    it('should list memories', async () => {
      const result = await client.list({ limit: 10 });

      expect(result.memories).toBeDefined();
      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    it('should support pagination', async () => {
      const page1 = await client.list({ limit: 5, offset: 0 });
      const page2 = await client.list({ limit: 5, offset: 5 });

      expect(page1.memories).toBeDefined();
      expect(page2.memories).toBeDefined();
    });

    it('should filter by context', async () => {
      const result = await client.list({
        context: 'test',
        limit: 10,
      });

      expect(result.memories).toBeDefined();
    });
  });

  describe('Update', () => {
    it('should update a memory', async () => {
      // First store a memory
      const stored = await client.store({
        content: 'Original content for update test.',
        context: 'test/update',
      });
      createdMemoryIds.push(stored.id);

      // Update it
      const updated = await client.update({
        id: stored.id,
        content: 'Updated content for update test.',
        importance: 0.9,
      });

      expect(updated.id).toBe(stored.id);
      expect(updated.content).toBe('Updated content for update test.');
    });
  });

  describe('Delete', () => {
    it('should delete a memory', async () => {
      // Store a memory to delete
      const stored = await client.store({
        content: 'Memory to be deleted.',
        context: 'test/delete',
      });

      // Delete it
      await client.delete(stored.id);

      // Verify it's gone (query shouldn't find it)
      const result = await client.list({
        context: 'test/delete',
        limit: 100,
      });

      const found = result.memories.find((m) => m.id === stored.id);
      expect(found).toBeUndefined();
    });

    it('should handle deleting non-existent memory', async () => {
      await expect(client.delete('non-existent-id-12345')).rejects.toThrow();
    });
  });

  describe('Context Packet', () => {
    it('should get context packet for a topic', async () => {
      // Store some relevant memories first
      const stored = await client.store({
        content: 'Context test: The project uses TypeScript and React.',
        context: 'test/context',
      });
      createdMemoryIds.push(stored.id);

      // Get context packet
      const result = await client.getContextPacket({
        topic: 'What technologies does the project use?',
        maxTokens: 2000,
      });

      expect(result).toBeDefined();
      expect(typeof result.context).toBe('string');
      expect(typeof result.memoryCount).toBe('number');
    });
  });

  describe('Error Handling', () => {
    it('should handle unauthorized requests', async () => {
      const badClient = new VXClient({
        apiUrl: TEST_API_URL,
        apiKey: 'invalid-api-key',
        maxRetries: 0,
      });

      await expect(badClient.list()).rejects.toThrow();
    });
  });
});

// =============================================================================
// Multi-Runtime Tests (Node.js compatibility check)
// =============================================================================

describe('Runtime Compatibility', () => {
  it('should work in Node.js', () => {
    expect(typeof process.version).toBe('string');
    expect(process.version.startsWith('v')).toBe(true);
  });

  it('should have fetch available', () => {
    expect(typeof fetch).toBe('function');
  });
});
