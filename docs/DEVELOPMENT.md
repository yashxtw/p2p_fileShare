# Development Guide
## Prerequisites
| Tool     | Version | Installation                           |
| -------- | ------- | -------------------------------------- |
| Node.js  | 20+     | [nodejs.org](https://nodejs.org)       |
| pnpm     | 10+     | `corepack enable && corepack prepare pnpm@latest --activate` |
| Git      | 2.x     | [git-scm.com](https://git-scm.com)    |
| Docker   | 24+     | [docker.com](https://docker.com) (optional) |
## Local Development Setup
### 1. Install Dependencies
```bash
pnpm install
```
This installs all dependencies across the monorepo, including workspace packages.
### 2. Configure Environment Variables
```bash
cp apps/api/.env.example apps/api/.env
```
Fill in your credentials:
| Variable          | Description                                   | Required |
| ----------------- | --------------------------------------------- | -------- |
| `NODE_ENV`        | `development`, `production`, or `test`        | No (defaults to `development`) |
| `PORT`            | API server port                                | No (defaults to `4000`) |
| `JWT_SECRET`      | Secret key for JWT tokens (min 32 chars)       | Yes |
| `NEON_DATABASE_URL` | Neon PostgreSQL connection string            | Yes |
| `REDIS_URL`       | Redis Cloud connection string                  | Yes |
| `CORS_ORIGIN`     | Allowed CORS origin                            | No (defaults to `http://localhost:3000`) |
| `LOG_LEVEL`       | Logging level (`debug`, `info`, `warn`, `error`) | No (defaults to `info`) |
### 3. Run Database Migrations
```bash
pnpm --filter @p2p-share/api migrate
```
### 4. Start Development Servers
```bash
# Start all apps and packages in watch mode
pnpm dev
# Or start individually:
pnpm dev --filter @p2p-share/web    # Frontend only (port 3000)
pnpm dev --filter @p2p-share/api    # Backend only (port 4000)
```
## Docker Usage
### Build and run all services
```bash
docker compose up --build
```
### Run in detached mode
```bash
docker compose up -d
```
### Stop services
```bash
docker compose down
```
## Code Quality
### Linting
```bash
pnpm lint          # Run ESLint
```
### Type Checking
```bash
pnpm type-check    # TypeScript type check
```
### Formatting
```bash
pnpm format        # Auto-format with Prettier
pnpm format:check  # Check formatting without changes
```
## Database Migrations
### Create a new migration
Create a new `.sql` file in `apps/api/src/database/migrations/` with the naming convention:
```
NNN_description.sql
```
Example: `002_create_users_table.sql`
### Run migrations
```bash
pnpm --filter @p2p-share/api migrate
```
Migrations are tracked in the `_migrations` table and only run once.
## Adding Shared Packages
When adding code to shared packages, remember to rebuild them:
```bash
pnpm build --filter @p2p-share/shared-types
```
Or rebuild everything:
```bash
pnpm build
```
## Troubleshooting
### `NEON_DATABASE_URL is required` error
Make sure you've created an `.env` file in `apps/api/` with valid credentials. See `.env.example`.
### pnpm workspace resolution errors
Try clearing the store and reinstalling:
```bash
pnpm clean
pnpm install
```
### Port already in use
Check if another process is using port 3000 or 4000:
```bash
# Windows
netstat -ano | findstr :3000
netstat -ano | findstr :4000
```