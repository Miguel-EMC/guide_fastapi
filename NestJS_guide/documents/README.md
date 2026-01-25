# NestJS Backend Guide

A comprehensive guide for backend development with NestJS, from basic concepts to production deployment.

## Table of Contents

### Fundamentals
1. [Introduction to NestJS](./01-introduction.md) - Installation, structure and first project
2. [Modules and Controllers](./02-modules-controllers.md) - Modular architecture and REST endpoints
3. [Services and Providers](./03-services-providers.md) - Dependency injection and business logic
4. [Data Validation](./04-data-validation.md) - DTOs, class-validator and transformation

### Database
5. [Database Setup](./05-database-setup.md) - TypeORM and PostgreSQL
6. [Entities and Relationships](./06-entities-relationships.md) - Models, OneToOne, OneToMany, ManyToMany

### Error Handling and Security
7. [Error Handling](./07-error-handling.md) - HTTP exceptions and custom filters
8. [Authentication](./08-authentication.md) - JWT, Passport and auth strategies
9. [Guards, Interceptors and Pipes](./09-guards-interceptors.md) - Middleware and decorators

### Documentation and Testing
10. [Swagger Documentation](./10-swagger-documentation.md) - OpenAPI and automatic documentation
11. [Testing](./11-testing.md) - Unit tests and E2E tests with Jest

### Deployment
12. [Deployment](./12-deployment.md) - Docker, environment variables and production
13. [Project: Blog API](./13-project-blog-api.md) - Complete implementation

### Advanced Topics
14. [Caching](./14-caching.md) - In-memory and Redis caching
15. [Rate Limiting](./15-rate-limiting.md) - Throttling and API protection
16. [File Uploads](./16-file-uploads.md) - Multer, S3 and image processing
17. [WebSockets](./17-websockets.md) - Real-time communication with Socket.IO
18. [Queues and Jobs](./18-queues-jobs.md) - Background processing with Bull
19. [RBAC Permissions](./19-rbac-permissions.md) - Role-based access control
20. [Logging and Monitoring](./20-logging-monitoring.md) - Winston, health checks, metrics
21. [API Versioning](./21-api-versioning.md) - Versioning strategies
22. [Common Patterns](./22-common-patterns.md) - Pagination, soft deletes, filtering

---

## Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| NestJS | 11.x | Backend framework |
| TypeScript | 5.x | Typed language |
| TypeORM | 0.3.x | Database ORM |
| PostgreSQL | 15.x | Relational database |
| Passport | 0.7.x | Authentication |
| JWT | - | Access tokens |
| Swagger | 8.x | API documentation |
| Jest | 29.x | Testing |
| Docker | - | Containerization |
| Redis | 7.x | Caching, Queues |
| Bull | 4.x | Job queues |
| Socket.IO | 4.x | WebSockets |
| Winston | 3.x | Logging |
| Multer | - | File uploads |
| AWS S3 | - | Cloud storage |
| Prometheus | - | Metrics |

## Prerequisites

- Node.js >= 20.0.0
- npm or yarn
- PostgreSQL (or Docker)
- Basic TypeScript knowledge

## Quick Start

```bash
# Install NestJS CLI globally
npm install -g @nestjs/cli

# Create new project
nest new my-project

# Start in development mode
cd my-project
npm run start:dev
```

## Project Architecture

```
src/
├── main.ts                 # Entry point
├── app.module.ts           # Root module
├── app.controller.ts       # Root controller
├── app.service.ts          # Root service
├── <module>/
│   ├── <module>.module.ts      # Module definition
│   ├── <module>.controller.ts  # HTTP endpoints
│   ├── <module>.service.ts     # Business logic
│   ├── dto/                    # Data Transfer Objects
│   │   ├── create-<module>.dto.ts
│   │   └── update-<module>.dto.ts
│   └── entities/               # Database entities
│       └── <module>.entity.ts
├── auth/                   # Authentication module
├── database/               # Database configuration
│   ├── ormconfig.ts
│   └── migrations/
└── common/                 # Shared utilities
    ├── decorators/
    ├── filters/
    ├── guards/
    └── interceptors/
```

## NestJS Core Features

| Feature | Description |
|---------|-------------|
| Modularity | Self-contained organizational structure |
| Scalability | Efficient, battle-tested components |
| Dependency Injection | Enhanced testability through sophisticated DI system |
| Type Safety | Leverages TypeScript's robust type system |
| Rich Ecosystem | Versatile development tools and integrations |
| Enterprise-Ready | Trusted by leading organizations globally |

## Comparison with FastAPI

| Aspect | NestJS | FastAPI |
|--------|--------|---------|
| Language | TypeScript | Python |
| Paradigm | OOP + Decorators | Functional + Type Hints |
| DI | Built-in | Manual (depends) |
| ORM | TypeORM/Prisma | SQLAlchemy |
| Validation | class-validator | Pydantic |
| Docs | Swagger (manual setup) | Swagger (automatic) |
| Testing | Jest | pytest |
| Async | Native | async/await |

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01 | Initial documentation |

---

**Author:** Miguel
**Purpose:** Reference guide for backend development with NestJS
