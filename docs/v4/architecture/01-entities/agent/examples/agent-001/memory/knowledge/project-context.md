# Knowledge Base for agent-001
# Long-term knowledge accumulated through interactions

## Project Context

### Tech Stack
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL 14 with Prisma ORM
- **Frontend**: React 18 + TypeScript + Vite
- **Testing**: Jest + React Testing Library
- **CI/CD**: GitHub Actions

### Architecture Patterns
- **API Design**: RESTful with consistent error handling
- **State Management**: React Context + useReducer for complex state
- **Database**: Repository pattern with Prisma
- **Authentication**: JWT tokens with refresh mechanism

## User Preferences

### Code Style
- Use TypeScript strict mode
- Prefer functional components over class components
- Use async/await over Promise chains
- Always include error handling
- Write tests for critical paths

### Communication Style
- Concise updates during work
- Detailed explanations when asked
- Proactive error reporting
- Ask before making architectural changes

## Domain Knowledge

### Business Rules
- User roles: admin, developer, viewer
- Permissions are hierarchical (admin > developer > viewer)
- All API mutations require authentication
- Audit logs required for admin actions

### Common Patterns
- Pagination: cursor-based for large datasets
- Error codes: use structured error codes (e.g., AUTH_001, DB_002)
- Validation: use Zod schemas for runtime validation
- Rate limiting: 100 requests/min per user

## Lessons Learned

### What Works
- Breaking large tasks into smaller subtasks
- Writing tests before implementation (TDD)
- Using TypeScript for type safety
- Consistent error handling patterns

### What to Avoid
- Mixing business logic in controllers
- Hardcoding configuration values
- Skipping input validation
- Ignoring edge cases in error handling
