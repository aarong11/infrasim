# Docker Auto-Rebuild Development Guide

## Quick Start

Run the development script for an interactive menu:
```bash
./start-dev.sh
```

## Development Modes

### 1. Hot Reload Mode (Recommended) ⚡
- **What it does**: Mounts your source code as volumes
- **When changes happen**: Instantly reflected (no rebuild needed)
- **Best for**: Active development, fastest feedback loop
- **Command**: `docker-compose up --build`

### 2. Auto-Rebuild Mode 🔄
- **What it does**: Uses Docker Compose watch to rebuild on file changes
- **When changes happen**: Container rebuilds automatically
- **Best for**: When you need full rebuilds (dependency changes)
- **Requirements**: Docker Compose 2.22+
- **Command**: `docker compose -f docker-compose.dev.yml watch`

### 3. Production Mode 🏭
- **What it does**: Full production build
- **When changes happen**: Manual rebuild required
- **Best for**: Testing production builds
- **Command**: `docker-compose up --build --target production`

## File Watch Patterns

### Hot Reload (Volume Mounting)
These files are mounted and changes reflect immediately:
- `./src` → `/app/src`
- `./public` → `/app/public`
- `./package.json` → `/app/package.json`
- Config files (Next.js, Tailwind, TypeScript, etc.)

### Auto-Rebuild Triggers
Container rebuilds when these change:
- `package.json` or `yarn.lock` (dependency changes)
- `Dockerfile.web` (Docker configuration)

## Quick Commands

```bash
# Start with hot reload
./start-dev.sh  # Choose option 1

# Start with auto-rebuild (if supported)
./start-dev.sh  # Choose option 2

# Stop all containers
./start-dev.sh  # Choose option 4

# Clean rebuild everything
./start-dev.sh  # Choose option 5

# Manual commands
docker-compose up --build                    # Hot reload mode
docker compose -f docker-compose.dev.yml watch  # Auto-rebuild mode (Docker 2.22+)
```

## Troubleshooting

### File Changes Not Detected
1. **On macOS/Windows**: Add `WATCHPACK_POLLING=true` to environment variables
2. **Permission issues**: Ensure files are readable by Docker
3. **Node modules**: Anonymous volumes prevent conflicts

### Performance Issues
1. **Too many files**: Exclude unnecessary directories with `.dockerignore`
2. **Slow rebuilds**: Use multi-stage builds to cache dependencies
3. **Memory usage**: Increase Docker memory allocation

### Docker Compose Watch Not Available
- **Check version**: `docker compose version`
- **Upgrade**: Follow Docker Desktop update instructions
- **Fallback**: Use hot reload mode instead

## Environment Variables

```bash
NODE_ENV=development          # Enables dev mode
WATCHPACK_POLLING=true       # Enables file polling (macOS/Windows)
OLLAMA_BASE_URL=http://ollama:11434
ETHEREUM_RPC_URL=http://ethereum-sim:8545
```