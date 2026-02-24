/**
 * VX API Client with retry logic and proper error handling
 */

import {
  Memory,
  StoreMemoryInput,
  UpdateMemoryInput,
  QueryMemoriesInput,
  ListMemoriesInput,
  ContextPacketInput,
  QueryResult,
  ListResult,
  ContextPacketResult,
  VXError,
  VXErrorCode,
  VXClientConfig,
} from './types.js';

const VERSION = '0.3.0';

/**
 * Detect the MCP client source from environment
 */
export function detectSource(): string {
  const cwd = process.cwd();
  const env = process.env;

  if (env.CURSOR_SESSION_ID || cwd.includes('cursor')) return 'cursor';
  if (env.WINDSURF_SESSION || cwd.includes('windsurf')) return 'windsurf';
  if (env.CLAUDE_DESKTOP || cwd.includes('Claude')) return 'claude';
  if (env.VSCODE_PID || cwd.includes('vscode')) return 'vscode';
  if (env.CONTINUE_IDE) return 'continue';

  return 'mcp';
}

/**
 * Validate required configuration
 */
function validateConfig(config: Partial<VXClientConfig>): VXClientConfig {
  if (!config.apiUrl) {
    throw new VXError(
      'VX_API_URL is required. Set it via environment variable or config.',
      'VALIDATION_ERROR'
    );
  }

  if (!config.apiKey) {
    throw new VXError(
      'VX_API_KEY is required. Get one at https://vessel.nyc/settings/api-keys',
      'VALIDATION_ERROR'
    );
  }

  // Validate URL format
  try {
    new URL(config.apiUrl);
  } catch {
    throw new VXError(
      `Invalid VX_API_URL: ${config.apiUrl}. Must be a valid URL.`,
      'VALIDATION_ERROR'
    );
  }

  return {
    apiUrl: config.apiUrl.replace(/\/$/, ''), // Remove trailing slash
    apiKey: config.apiKey,
    maxRetries: config.maxRetries ?? 3,
    retryDelay: config.retryDelay ?? 1000,
    timeout: config.timeout ?? 30000,
    source: config.source ?? detectSource(),
    clientName: config.clientName ?? 'mcp-server',
  };
}

/**
 * Map HTTP status codes to error codes
 */
function mapStatusToErrorCode(status: number): VXErrorCode {
  switch (status) {
    case 401:
    case 403:
      return 'UNAUTHORIZED';
    case 404:
      return 'NOT_FOUND';
    case 400:
    case 422:
      return 'VALIDATION_ERROR';
    case 429:
      return 'RATE_LIMITED';
    case 500:
    case 502:
    case 503:
    case 504:
      return 'SERVER_ERROR';
    default:
      return 'UNKNOWN';
  }
}

/**
 * Check if an error is retryable
 */
function isRetryable(status: number): boolean {
  return status >= 500 || status === 429 || status === 0;
}

/**
 * Sleep for a given duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * VX API Client
 */
export class VXClient {
  private readonly config: VXClientConfig;

  constructor(config: Partial<VXClientConfig>) {
    this.config = validateConfig(config);
  }

  /**
   * Make a request with retry logic
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.config.apiUrl}${endpoint}`;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.maxRetries!; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          this.config.timeout!
        );

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.config.apiKey,
            'X-Client': `vx-mcp/${VERSION}`,
            'X-Source': this.config.source!,
            ...options.headers,
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          const code = mapStatusToErrorCode(response.status);
          const retryable = isRetryable(response.status);

          const error = new VXError(
            `VX API error: ${response.status} - ${errorText}`,
            code,
            response.status,
            retryable
          );

          if (!retryable || attempt === this.config.maxRetries!) {
            throw error;
          }

          lastError = error;
          const delay = this.config.retryDelay! * Math.pow(2, attempt);
          await sleep(delay);
          continue;
        }

        // Handle empty responses (e.g., DELETE)
        const text = await response.text();
        if (!text) return {} as T;

        return JSON.parse(text) as T;
      } catch (error) {
        if (error instanceof VXError) {
          throw error;
        }

        // Handle network errors
        const isTimeout =
          error instanceof Error && error.name === 'AbortError';
        const code: VXErrorCode = isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR';

        const vxError = new VXError(
          isTimeout
            ? `Request timed out after ${this.config.timeout}ms`
            : `Network error: ${error instanceof Error ? error.message : String(error)}`,
          code,
          undefined,
          true
        );

        if (attempt === this.config.maxRetries!) {
          throw vxError;
        }

        lastError = vxError;
        const delay = this.config.retryDelay! * Math.pow(2, attempt);
        await sleep(delay);
      }
    }

    throw lastError || new VXError('Unknown error', 'UNKNOWN');
  }

  // ===========================================================================
  // Memory Operations
  // ===========================================================================

  /**
   * Store a new memory
   */
  async store(input: StoreMemoryInput): Promise<Memory> {
    if (typeof input.content !== 'string') {
      throw new VXError('content is required and must be a string', 'VALIDATION_ERROR');
    }

    if (input.content.trim().length === 0) {
      throw new VXError('content cannot be empty or whitespace', 'VALIDATION_ERROR');
    }

    if (input.importance !== undefined) {
      if (typeof input.importance !== 'number' || input.importance < 0 || input.importance > 1) {
        throw new VXError('importance must be a number between 0 and 1', 'VALIDATION_ERROR');
      }
    }

    return this.request<Memory>('/v1/memories', {
      method: 'POST',
      body: JSON.stringify({
        content: input.content,
        context: input.context,
        memoryType: input.memoryType || 'SEMANTIC',
        importance: input.importance ?? 0.5,
        source: this.config.source,
        metadata: {
          source: this.config.source,
          client: this.config.clientName,
          version: VERSION,
        },
      }),
    });
  }

  /**
   * Update an existing memory
   */
  async update(input: UpdateMemoryInput): Promise<Memory> {
    if (!input.id || typeof input.id !== 'string') {
      throw new VXError('id is required and must be a string', 'VALIDATION_ERROR');
    }

    const updates: Record<string, unknown> = {};
    if (input.content !== undefined) updates.content = input.content;
    if (input.context !== undefined) updates.context = input.context;
    if (input.memoryType !== undefined) updates.memoryType = input.memoryType;
    if (input.importance !== undefined) {
      if (input.importance < 0 || input.importance > 1) {
        throw new VXError('importance must be between 0 and 1', 'VALIDATION_ERROR');
      }
      updates.importance = input.importance;
    }

    if (Object.keys(updates).length === 0) {
      throw new VXError('At least one field to update is required', 'VALIDATION_ERROR');
    }

    return this.request<Memory>(`/v1/memories/${input.id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  /**
   * Query memories by semantic similarity
   */
  async query(input: QueryMemoriesInput): Promise<QueryResult> {
    if (!input.query || typeof input.query !== 'string') {
      throw new VXError('query is required and must be a string', 'VALIDATION_ERROR');
    }

    return this.request<QueryResult>('/v1/query', {
      method: 'POST',
      body: JSON.stringify({
        query: input.query,
        limit: input.limit || 10,
        context: input.context,
        memoryType: input.memoryType,
      }),
    });
  }

  /**
   * List memories with filters
   */
  async list(input: ListMemoriesInput = {}): Promise<ListResult> {
    const params = new URLSearchParams();
    if (input.limit) params.set('limit', input.limit.toString());
    if (input.offset) params.set('offset', input.offset.toString());
    if (input.context) params.set('context', input.context);
    if (input.memoryType) params.set('memoryType', input.memoryType);

    const queryString = params.toString();
    const endpoint = queryString ? `/v1/memories?${queryString}` : '/v1/memories';

    return this.request<ListResult>(endpoint);
  }

  /**
   * Delete a memory by ID
   */
  async delete(id: string): Promise<void> {
    if (!id || typeof id !== 'string') {
      throw new VXError('id is required and must be a string', 'VALIDATION_ERROR');
    }

    await this.request<void>(`/v1/memories/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get a context packet for a topic
   */
  async getContextPacket(input: ContextPacketInput): Promise<ContextPacketResult> {
    if (!input.topic || typeof input.topic !== 'string') {
      throw new VXError('topic is required and must be a string', 'VALIDATION_ERROR');
    }

    return this.request<ContextPacketResult>('/v1/context-packet', {
      method: 'POST',
      body: JSON.stringify({
        query: input.topic,
        maxTokens: input.maxTokens || 4000,
      }),
    });
  }

  /**
   * Health check - verify API connectivity
   */
  async healthCheck(): Promise<{ ok: boolean; latency: number }> {
    const start = Date.now();
    try {
      await this.request<{ status: string }>('/v1/health');
      return { ok: true, latency: Date.now() - start };
    } catch {
      return { ok: false, latency: Date.now() - start };
    }
  }
}

/**
 * Create a client from environment variables
 */
export function createClientFromEnv(): VXClient {
  return new VXClient({
    apiUrl: process.env.VX_API_URL || 'https://api.vessel.nyc',
    apiKey: process.env.VX_API_KEY || '',
    source: process.env.VX_SOURCE,
    clientName: process.env.VX_CLIENT_NAME,
  });
}
