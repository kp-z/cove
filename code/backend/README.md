# Cove Backend

Backend service for Cove project built with Express, tRPC, and Prisma.

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The server will start at `http://localhost:3001`.

### Build

```bash
npm run build
```

### Production

```bash
npm start
```

## Development Tools

### tRPC DevTools

For interactive API debugging, install the tRPC DevTools browser extension:

- **Chrome/Edge**: [tRPC DevTools on Chrome Web Store](https://chrome.google.com/webstore/detail/trpc-devtools/)
- **Firefox**: [tRPC DevTools on Firefox Add-ons](https://addons.mozilla.org/firefox/addon/trpc-devtools/)

Once installed:
1. Start the backend: `npm run dev`
2. Open browser DevTools (F12)
3. Navigate to the "tRPC" tab
4. All tRPC procedures will be visible and executable

Features:
- Real-time request/response inspection
- Performance monitoring
- Error tracking with stack traces
- Procedure execution from DevTools

**Note**: tRPC v11 has built-in DevTools support. No additional client packages (like `trpc-client-devtools-link`) are needed.

## API Endpoints

- **Health Check**: `GET /trpc/health.check`
- **tRPC Router**: `/trpc/*`

### Available Routers

- `agent` - Agent management
- `channel` - Channel operations
- `message` - Message handling
- `task` - Task management
- `thread` - Thread operations
- `user` - User management
- `workflow` - Workflow operations
- `project` - Project management

## Architecture

The backend follows a layered architecture:

- **Domain Layer**: Core business logic and entities
- **Application Layer**: Use cases and application services
- **Infrastructure Layer**: External integrations (database, tRPC, storage)
- **Presentation Layer**: API routes and controllers

## Database

Uses Prisma ORM with SQLite (development) or PostgreSQL (production).

### Migrations

```bash
npx prisma migrate dev
```

### Prisma Studio

```bash
npx prisma studio
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
DATABASE_URL="file:../../../.cove/database/cove.db"
PORT=3001
NODE_ENV=development
COVE_PROJECT_ROOT=/path/to/project/root
```

## Testing

```bash
npm test
```

## License

Proprietary
