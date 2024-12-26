# @klyptio/prisma-adapter

A robust Prisma adapter for Next.js applications with built-in support for connection pooling, read replicas, caching, and performance monitoring.

## Features

- 🔄 **Connection Pooling**: Configurable connection pool with health checks
- 📖 **Read Replicas**: Support for database replication with automatic round-robin load balancing
- 🚀 **Query Builder**: Fluent API for building type-safe database queries
- 💾 **Redis Caching**: Integrated caching layer with Redis support
- ⚡ **Performance Monitoring**: Built-in query performance tracking and slow query detection
- 🛡️ **Security**: SQL injection prevention and query sanitization
- 🔍 **Type Safety**: Full TypeScript support with Prisma's type system
- 🔄 **Soft Delete**: Built-in support for soft deletion patterns
- ⏱️ **Query Timeout**: Configurable query timeout protection

## Installation

```bash
npm install @klyptio/prisma-adapter
```

## Prerequisites

- Node.js 16.x or later
- PostgreSQL database
- Redis (optional, for caching)

## Quick Start

1. Set up your database connection in your environment:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
```

2. Initialize the adapter in your Next.js application:

```ts
// app/lib/db/index.ts
import { PrismaAdapter } from '@klyptio/prisma-adapter';
const db = new PrismaAdapter({
prisma: {
url: process.env.DATABASE_URL,
log: ['error'],
pool: {
min: 2,
max: 10
}
}
});
export default db;
```

3. Use the adapter in your application:

```ts
// app/actions/users.ts
import db from '@/app/lib/db';
export async function getUsers() {
return db.query('user', {
select: ['id', 'name', 'email'],
where: { active: true },
orderBy: { createdAt: 'desc' }
});
}
```

## Configuration

The adapter accepts a comprehensive configuration object:

```ts
interface PrismaConfig {
prisma?: {
// Logging configuration
log?: Array<'query' | 'info' | 'warn' | 'error'>;
errorFormat?: 'pretty' | 'colorless' | 'minimal';
// Cache configuration
cache?: {
enabled: boolean;
redis: {
url: string;
cluster?: boolean;
nodes?: string[];
};
ttl?: number;
maxSize?: number;
invalidateOnWrite?: boolean;
};
// Connection pool settings
pool?: {
min?: number;
max?: number;
idle?: number;
acquire?: number;
};
// Replication configuration
replication?: {
enabled: boolean;
reads?: string[];
writes?: string[];
};
};
}
```

## Advanced Features

### Query Builder

```ts
const users = await db.query('user')
.select(['id', 'name', 'email'])
.where({ active: true })
.orderBy('createdAt', 'desc')
.page(1)
.perPage(10)
.execute();
```

### Caching

```ts
const cache = new PrismaCache({
redis: {
url: 'redis://localhost:6379'
},
prisma: db.prisma
});
// Cache individual records
await cache.set('user', 1, userData);
const user = await cache.get('user', 1);
// Warm cache for multiple records
await cache.warmCache('user', [1, 2, 3]);
```

### Read Replicas

```ts
const db = new PrismaAdapter({
prisma: {
replication: {
enabled: true,
reads: [
'postgresql://read1:5432/mydb',
'postgresql://read2:5432/mydb'
]
}
}
});
```

### Transactions

```ts
await db.transaction(async (prisma) => {
const user = await prisma.user.create({ ... });
await prisma.profile.create({ ... });
return user;
});
```

### Performance Monitoring

```ts
import { PerformanceMonitor } from '@klyptio/prisma-adapter';
const metrics = PerformanceMonitor.getInstance().getMetrics();
console.log(metrics.slowQueries);
```


## API Reference

### PrismaAdapter

- `connect()`: Establish database connection
- `disconnect()`: Close database connection
- `query(model, options)`: Execute a database query
- `transaction(callback)`: Execute operations in a transaction
- `softDelete(model, id)`: Perform soft deletion
- `checkConnectionPool()`: Verify connection pool health

### PrismaCache

- `get(model, id)`: Retrieve cached item
- `set(model, id, data, ttl?)`: Cache item with optional TTL
- `del(model, id)`: Remove cached item
- `warmCache(model, ids)`: Pre-populate cache
- `invalidateModel(model)`: Invalidate all cached items for a model

## Contributing

Contributions are welcome! Please read our [contributing guidelines](CONTRIBUTING.md) for details.

## License

MIT

## Support

For issues and feature requests, please [open an issue](https://github.com/your-repo/issues).

## Setup

After installation, the package will automatically:
- Create required directories (prisma, src/app/_lib/db)
- Set up initial Prisma schema
- Configure database types
- Update .gitignore with Prisma-specific entries
- Validate environment variables
- Test database connection

## Performance Monitoring

The adapter includes built-in performance monitoring:

```ts
import { PerformanceMonitor } from '@klyptio/prisma-adapter';
// Get performance metrics
const metrics = PerformanceMonitor.getInstance().getMetrics();
console.log(metrics);
// Metrics include:
// - Query timing distribution
// - Slow query tracking
// - Cache hit/miss rates
// - Connection pool statistics
```

## Error Handling

The adapter provides several custom error classes:
- `PrismaAdapterError`: Base error class
- `QueryTimeoutError`: For query timeout issues
- `ValidationError`: For validation failures
- `SecurityError`: For security-related issues
- `CacheError`: For cache operation failures
- `ReplicationError`: For replication-related issues

## Security Features

- Automatic SQL injection prevention
- Query parameter validation
- Raw query restrictions
- Configurable query timeouts

## Configuration Examples

### Basic Setup
```typescript
const db = new PrismaAdapter({
  prisma: {
    url: process.env.DATABASE_URL,
    log: ['error'],
    pool: { min: 2, max: 10 }
  }
});
```

### With Caching
```typescript
const db = new PrismaAdapter({
  prisma: {
    url: process.env.DATABASE_URL,
    cache: {
      enabled: true,
      redis: {
        url: process.env.REDIS_URL
      },
      ttl: 3600,
      maxSize: 10000
    }
  }
});
```

### With Read Replicas
```typescript
const db = new PrismaAdapter({
  prisma: {
    url: process.env.DATABASE_URL,
    replication: {
      enabled: true,
      reads: [
        process.env.READ_REPLICA_1,
        process.env.READ_REPLICA_2
      ]
    }
  }
});
```
