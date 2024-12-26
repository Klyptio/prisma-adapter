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

## Database Support

This adapter is built on Prisma and theoretically supports all databases that Prisma supports:

### Fully Supported
- PostgreSQL (Primary focus, all features supported)
- CockroachDB (Compatible with PostgreSQL features)

### Basic Support
- MySQL
- SQLite
- MongoDB
- Microsoft SQL Server

### Feature Compatibility

| Feature | PostgreSQL | MySQL | SQLite | MongoDB | SQL Server |
|---------|------------|-------|---------|----------|------------|
| Connection Pooling | ✅ | ✅ | ❌ | ✅ | ✅ |
| Read Replicas | ✅ | ⚠️ | ❌ | ✅ | ⚠️ |
| Query Builder | ✅ | ✅ | ✅ | ✅ | ✅ |
| Caching | ✅ | ✅ | ✅ | ✅ | ✅ |
| Soft Delete | ✅ | ✅ | ✅ | ✅ | ✅ |
| Transactions | ✅ | ✅ | ✅ | ⚠️ | ✅ |

✅ Fully supported  
⚠️ Partially supported  
❌ Not supported

### Connection String Examples

```env
# PostgreSQL
DATABASE_URL="postgresql://user:password@localhost:5432/mydb"

# MySQL
DATABASE_URL="mysql://user:password@localhost:3306/mydb"

# MongoDB
DATABASE_URL="mongodb://user:password@localhost:27017/mydb"

# SQLite
DATABASE_URL="file:./dev.db"

# Microsoft SQL Server
DATABASE_URL="sqlserver://localhost:1433;database=mydb;user=sa;password=pass;trustServerCertificate=true"
```

> **Note**: While basic operations work across all supported databases, advanced features like read replicas and connection pooling are optimized for PostgreSQL. For best results, we recommend using PostgreSQL.

## Installation

```bash
npm install @klyptio/prisma-adapter
```

## Prerequisites

- Node.js 16.x or later
- PostgreSQL database
- Redis (optional, for caching)

## Setup

After installation, the package will automatically:
- Create required directories (prisma, src/app/_lib/db)
- Set up initial Prisma schema
- Configure database types
- Update .gitignore with Prisma-specific entries
- Validate environment variables
- Test database connection

## Quick Start

1. Set up your database connection in your environment:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
```

2. Initialize the adapter in your Next.js application:

```typescript
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

```typescript
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

```typescript
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

```typescript
const users = await db.query('user')
  .select(['id', 'name', 'email'])
  .where({ active: true })
  .orderBy('createdAt', 'desc')
  .page(1)
  .perPage(10)
  .execute();
```

### Caching

```typescript
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

```typescript
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

```typescript
await db.transaction(async (prisma) => {
  const user = await prisma.user.create({ ... });
  await prisma.profile.create({ ... });
  return user;
});
```

### Performance Monitoring

```typescript
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

## Performance Monitoring

The adapter includes built-in performance monitoring:

```typescript
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

## Database Specific Setup

### PostgreSQL

#### Local Setup

```bash
npm install @klyptio/prisma-adapter @prisma/client prisma pg
```

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url = env("DATABASE_URL")
}
```

```env
DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
```

#### Supabase

```env
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
```

### MySQL

#### Local Setup

```bash
npm install @klyptio/prisma-adapter @prisma/client prisma mysql2
```

```prisma
// prisma/schema.prisma
datasource db {
  provider = "mysql"
  url = env("DATABASE_URL")
}
```

```env
DATABASE_URL="mysql://user:password@localhost:3306/mydb"
```

#### PlanetScale

```env
DATABASE_URL="mysql://username:password@region.connect.psdb.cloud/database_name?ssl={"rejectUnauthorized":true}"
```

### SQLite

#### Local Setup

```bash
npm install @klyptio/prisma-adapter @prisma/client prisma sqlite3
```

```prisma
// prisma/schema.prisma
datasource db {
  provider = "sqlite"
  url = env("DATABASE_URL")
}
```

```env
DATABASE_URL="file:./dev.db"
```

### MongoDB

#### Local Setup

```bash
npm install @klyptio/prisma-adapter @prisma/client prisma @prisma/adapter-mongodb
```

```prisma
// prisma/schema.prisma
datasource db {
  provider = "mongodb"
  url = env("DATABASE_URL")
}
```

```env
DATABASE_URL="mongodb://user:password@localhost:27017/mydb"
```

#### MongoDB Atlas

```env
DATABASE_URL="mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/database_name?retryWrites=true&w=majority"
```

### Important Notes

1. **Schema Adjustments**: Some features might need database-specific adjustments:
   - MongoDB doesn't support SQL-based transactions
   - SQLite has limited concurrent connections
   - Some databases might not support certain field types

2. **Feature Compatibility**: Reference the database support table in the previous section

3. **Environment Setup**:
   ```typescript
   // app/lib/db/index.ts
   const db = new PrismaAdapter({
     prisma: {
       url: process.env.DATABASE_URL,
       // Database specific options
       pool: {
         min: 2,
         max: 10
       }
     }
   });
   ```

4. **After Setup**:
   ```bash
   # Generate Prisma Client
   npx prisma generate
   
   # Create migrations (except MongoDB)
   npx prisma migrate dev
   ```

### Hosted Services Configuration

For hosted services, you might need additional configuration:

1. **SSL/TLS**: Most hosted services require SSL connections
2. **Connection Pools**: Adjust pool settings based on service limits
3. **Timeouts**: Configure appropriate timeouts for hosted environments

Example configuration for hosted services:

```typescript
const db = new PrismaAdapter({
  prisma: {
    url: process.env.DATABASE_URL,
    connection: {
      ssl: true,
      pool: {
        min: 0,  // Scale to zero when unused
        max: 5,  // Respect service connection limits
        idle: 10000,
        acquire: 60000
      }
    }
  }
});
```

## Contributing

Contributions are welcome! Please read our [contributing guidelines](CONTRIBUTING.md) for details.

## License

MIT

## Support

For issues and feature requests, please [open an issue](https://Klyptio/prisma-adapter/issues).