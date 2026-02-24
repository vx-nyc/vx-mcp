/**
 * VX MCP SDK Types
 * @module @vesselnyc/mcp-server
 */

// =============================================================================
// Memory Types
// =============================================================================

/**
 * Memory type classification
 * - SEMANTIC: Facts, knowledge, information
 * - EPISODIC: Events, experiences, conversations
 * - PROCEDURAL: How-to, processes, instructions
 */
export type MemoryType = 'SEMANTIC' | 'EPISODIC' | 'PROCEDURAL';

/**
 * A memory object stored in VX
 */
export interface Memory {
  /** Unique identifier */
  id: string;
  /** The memory content */
  content: string;
  /** Optional context path (e.g., 'work/projects') */
  context?: string;
  /** Classification of memory type */
  memoryType: MemoryType;
  /** Importance score (0-1) */
  importance?: number;
  /** Source of the memory (e.g., 'cursor', 'claude') */
  source?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt?: string;
}

/**
 * Input for creating a new memory
 */
export interface StoreMemoryInput {
  /** The content to store */
  content: string;
  /** Optional context path */
  context?: string;
  /** Memory type (defaults to SEMANTIC) */
  memoryType?: MemoryType;
  /** Importance score 0-1 (defaults to 0.5) */
  importance?: number;
}

/**
 * Input for updating an existing memory
 */
export interface UpdateMemoryInput {
  /** Memory ID to update */
  id: string;
  /** New content (optional) */
  content?: string;
  /** New context (optional) */
  context?: string;
  /** New memory type (optional) */
  memoryType?: MemoryType;
  /** New importance score (optional) */
  importance?: number;
}

/**
 * Input for querying memories
 */
export interface QueryMemoriesInput {
  /** Natural language query */
  query: string;
  /** Maximum results (default: 10) */
  limit?: number;
  /** Filter by context path */
  context?: string;
  /** Filter by memory type */
  memoryType?: MemoryType;
}

/**
 * Input for listing memories
 */
export interface ListMemoriesInput {
  /** Maximum results (default: 20) */
  limit?: number;
  /** Pagination offset */
  offset?: number;
  /** Filter by context path */
  context?: string;
  /** Filter by memory type */
  memoryType?: MemoryType;
}

/**
 * Input for getting context packet
 */
export interface ContextPacketInput {
  /** Topic to get context for */
  topic: string;
  /** Maximum tokens (default: 4000) */
  maxTokens?: number;
}

// =============================================================================
// API Response Types
// =============================================================================

/**
 * Query result containing matching memories
 */
export interface QueryResult {
  memories: Memory[];
  total: number;
}

/**
 * List result with pagination info
 */
export interface ListResult {
  memories: Memory[];
  total: number;
  offset: number;
  limit: number;
}

/**
 * Context packet result
 */
export interface ContextPacketResult {
  context: string;
  memoryCount: number;
}

// =============================================================================
// Error Types
// =============================================================================

/**
 * VX API error codes
 */
export type VXErrorCode =
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR'
  | 'UNKNOWN';

/**
 * Custom error for VX API failures
 */
export class VXError extends Error {
  constructor(
    message: string,
    public readonly code: VXErrorCode,
    public readonly statusCode?: number,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'VXError';
  }
}

// =============================================================================
// Client Configuration
// =============================================================================

/**
 * Configuration for VX client
 */
export interface VXClientConfig {
  /** VX API URL */
  apiUrl: string;
  /** API key for authentication */
  apiKey: string;
  /** Maximum retry attempts (default: 3) */
  maxRetries?: number;
  /** Retry delay in ms (default: 1000) */
  retryDelay?: number;
  /** Request timeout in ms (default: 30000) */
  timeout?: number;
  /** Source identifier (auto-detected if not provided) */
  source?: string;
  /** Custom client name */
  clientName?: string;
}
