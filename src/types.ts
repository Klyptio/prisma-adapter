import { DatabaseConfig } from '@klypt/db-core';
import { PrismaClient } from '@prisma/client';

export interface PrismaConfig extends DatabaseConfig {
    prisma?: {
      log?: Array<'query' | 'info' | 'warn' | 'error'>;
      errorFormat?: 'pretty' | 'colorless' | 'minimal';
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
      softDelete?: boolean;
      pool?: {
        min?: number;
        max?: number;
        idle?: number;
        acquire?: number;
        evictionRunInterval?: number;
      };
      replication?: {
        enabled: boolean;
        reads?: string[];
        writes?: string[];
      };
      [key: string]: any;
    };
  }
  
  export type TransactionCallback<T> = (
    prisma: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use'>
  ) => Promise<T>;
  
  export interface QueryOptions {
    select?: string[];
    include?: string[];
    where?: Record<string, any>;
    orderBy?: Record<string, 'asc' | 'desc'>;
    page?: number;
    perPage?: number;
    write?: boolean;
  }

export function validateConfig(config: PrismaConfig): void {
  if (!config.prisma) {
    throw new Error('Prisma configuration is required');
  }

  if (config.prisma.cache?.enabled) {
    if (!config.prisma.cache.redis?.url) {
      throw new Error('Redis URL is required when cache is enabled');
    }
  }

  // Validate log levels
  if (config.prisma.log) {
    const validLevels = ['query', 'info', 'warn', 'error'];
    config.prisma.log.forEach(level => {
      if (!validLevels.includes(level)) {
        throw new Error(`Invalid log level: ${level}`);
      }
    });
  }

  // Add connection string validation
  if (!config.prisma?.url && !process.env.DATABASE_URL) {
    throw new Error('Database URL is required');
  }
  
  // Add connection pool validation
  if (config.prisma?.pool) {
    if (config.prisma.pool.min != null && config.prisma.pool.max != null) {
      if (config.prisma.pool.min > config.prisma.pool.max) {
        throw new Error('Pool min size cannot be greater than max size');
      }
    }
  }
}