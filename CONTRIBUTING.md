# Contributing to VX MCP Server

Thank you for your interest in contributing! Here's how to get started.

## Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/vx-nyc/vx-mcp.git
   cd vx-mcp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

4. Run tests:
   ```bash
   npm test
   ```

## Project Structure

```
vx-mcp/
├── src/
│   ├── index.ts    # MCP server entry point
│   ├── client.ts   # VX API client with retry logic
│   └── types.ts    # TypeScript type definitions
├── tests/
│   └── client.test.ts  # Unit and integration tests
├── dist/           # Compiled output
└── package.json
```

## Making Changes

1. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature
   ```

2. Make your changes

3. Run tests:
   ```bash
   npm test
   ```

4. For integration tests (requires API key):
   ```bash
   VX_API_KEY=your-key npm run test:integration
   ```

5. Build to check for TypeScript errors:
   ```bash
   npm run build
   ```

6. Commit with a descriptive message:
   ```bash
   git commit -m "feat: add new feature"
   ```

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation only
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Maintenance tasks

## Pull Requests

1. Update the CHANGELOG.md with your changes
2. Ensure all tests pass
3. Update README.md if adding new features
4. Open a PR with a clear description

## Code Style

- Use TypeScript strict mode
- Prefer explicit types over inference for public APIs
- Add JSDoc comments for exported functions/classes
- Keep functions focused and small

## Testing

### Unit Tests
Test input validation and error handling without hitting the API.

### Integration Tests
Test against the live API. Requires `VX_API_KEY` environment variable.
Integration tests create test memories and clean them up after.

## Questions?

- Open an issue for bugs or feature requests
- Join our [Discord](https://discord.gg/vessel) for discussions

Thank you for contributing! 🙏
