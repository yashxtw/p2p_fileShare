# P2P FileShare
> Production-grade real-time P2P file sharing platform
Share files directly between devices with end-to-end encryption. No cloud storage, no file size limits, just fast peer-to-peer transfers powered by WebRTC.
## Tech Stack
| Layer          | Technology                          |
| -------------- | ----------------------------------- |
| **Frontend**   | Next.js 16, React 19, TailwindCSS 4 |
| **Backend**    | NestJS 11, Node.js 20              |
| **Database**   | Neon PostgreSQL (serverless)        |
| **Cache**      | Redis Cloud                         |
| **Realtime**   | WebRTC + WebSocket                  |
| **Monorepo**   | pnpm Workspaces + Turborepo        |
| **CI/CD**      | GitHub Actions                      |
| **Containers** | Docker + Docker Compose             |
## Getting Started
### Prerequisites
- **Node.js** 20+
- **pnpm** 10+
- **Neon PostgreSQL** account (free tier available)
- **Redis Cloud** account (free tier available)
### Setup
```bash
# Clone the repository
git clone <repo-url>
cd p2p_fileShare
# Install dependencies
pnpm install
# Set up environment variables
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env with your Neon and Redis credentials
# Start development servers
pnpm dev
```
### Available Scripts
| Command            | Description                                |
| ------------------ | ------------------------------------------ |
| `pnpm dev`         | Start all dev servers (web + api)          |
| `pnpm build`       | Build all packages and apps                |
| `pnpm lint`        | Run ESLint across all packages             |
| `pnpm type-check`  | TypeScript type checking                   |
| `pnpm format`      | Format code with Prettier                  |
| `pnpm clean`       | Remove all build artifacts and node_modules |
### Development URLs
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **Health Check**: http://localhost:4000/health
## Project Structure
```
p2p_fileShare/
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # NestJS backend
├── packages/
│   ├── shared-types/ # TypeScript type definitions
│   ├── shared-utils/ # Shared utility functions
│   ├── shared-config/# Shared constants & env schemas
│   └── ui/           # Shared UI components
├── infra/
│   ├── docker/       # Dockerfiles
│   └── nginx/        # Nginx config
├── docs/             # Documentation
└── .github/          # CI/CD workflows
```
## Documentation
- [Architecture Overview](docs/ARCHITECTURE.md)
- [Development Guide](docs/DEVELOPMENT.md)
## License
Private — All rights reserved.
