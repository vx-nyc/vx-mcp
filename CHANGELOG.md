# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-02-24

### Added
- **`vx_update` tool** - Update existing memories (content, context, type, importance)
- **Retry logic** - Automatic retries with exponential backoff for network failures
- **TypeScript type exports** - Full type definitions exported for library consumers
- **VXClient class** - Standalone client for programmatic usage
- **VXError class** - Structured errors with codes and retryable flags
- **Input validation** - Validate inputs before API calls with helpful error messages
- **Health check** - `client.healthCheck()` to verify API connectivity
- **Comprehensive test suite** - Unit and integration tests with Vitest
- **Troubleshooting guide** - Common issues and solutions in README

### Changed
- **Refactored codebase** - Split into `types.ts`, `client.ts`, and `index.ts`
- **Improved error messages** - More descriptive errors with suggested fixes
- **Better source detection** - Improved MCP client detection (Cursor, Windsurf, Claude, VS Code, Continue)
- **Updated documentation** - Comprehensive examples for all operations
- **Package exports** - Proper ESM exports for types, client, and main entry

### Fixed
- **Version consistency** - Aligned package.json, server config, and metadata versions
- **Trailing slash handling** - API URL trailing slashes are now stripped
- **Empty response handling** - DELETE and other no-content responses handled correctly

## [0.2.1] - 2026-02-20

### Fixed
- Source detection for Continue IDE
- Package metadata updates

## [0.2.0] - 2026-02-18

### Added
- Environment variable validation
- Improved tool descriptions

### Changed
- Updated @modelcontextprotocol/sdk to ^1.0.0

## [0.1.0] - 2026-02-15

### Added
- Initial release
- `vx_store` - Store memories with content, context, type, and importance
- `vx_query` - Semantic search across memories
- `vx_list` - List memories with filters and pagination
- `vx_delete` - Delete memories by ID
- `vx_context` - Get context packets for conversations
- Support for Claude Desktop, Cursor, VS Code + Continue, Windsurf
- Full MCP protocol compliance via @modelcontextprotocol/sdk
