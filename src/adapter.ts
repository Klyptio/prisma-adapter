import { DatabaseConfig, DatabaseConnection } from "@klypt/db-core";
import { PrismaClient } from "@prisma/client";
import { PrismaConfig, QueryOptions, TransactionCallback } from "./types";
import { PrismaQueryBuilder, QueryBuilderOptions } from "./query-builder";
import { SecurityError } from "./errors";

export class PrismaAdapter implements DatabaseConnection {
  private readonly clients: PrismaClient[] = [];
  private readonly writeClient: PrismaClient;
  private currentReadClient = 0;
  private connected = false;
  public readonly prisma: PrismaClient;

  constructor(private readonly config: PrismaConfig) {
    this.writeClient = new PrismaClient(this.getClientConfig());
    this.prisma = this.writeClient;
    
    if (config.prisma?.replication?.enabled) {
      const readUrls = config.prisma.replication.reads || [];
      readUrls.forEach(url => {
        this.clients.push(new PrismaClient({
          ...this.getClientConfig(),
          datasources: { db: { url } }
        }));
      });
    }
    
    if (!this.clients.length) {
      this.clients.push(this.writeClient);
    }
  }

  private getReadClient(): PrismaClient {
    this.currentReadClient = (this.currentReadClient + 1) % this.clients.length;
    return this.clients[this.currentReadClient];
  }

  async query<T>(model: string, options: QueryOptions = {}): Promise<T | T[] | number> {
    const client = options.write ? this.writeClient : this.getReadClient();
    const transformedOptions: QueryBuilderOptions = {
      model,
      ...(options.select && { select: options.select.reduce((acc, field) => ({ ...acc, [field]: true }), {}) }),
      ...(options.include && { include: options.include.reduce((acc, field) => ({ ...acc, [field]: true }), {}) }),
      ...(options.where && { where: options.where }),
      ...(options.orderBy && { orderBy: options.orderBy }),
      ...(options.page && { page: options.page }),
      ...(options.perPage && { perPage: options.perPage }),
      ...(options.write && { write: options.write })
    };
    const builder = new PrismaQueryBuilder(client, transformedOptions);
    return builder.execute<T>();
  }

  private getClientConfig() {
    return {
      log: this.config.prisma?.log || ['error'],
      errorFormat: this.config.prisma?.errorFormat || 'minimal',
      connection: {
        pool: {
          min: this.config.prisma?.pool?.min || 2,
          max: this.config.prisma?.pool?.max || 10,
          idle: this.config.prisma?.pool?.idle || 10000,
          acquire: this.config.prisma?.pool?.acquire || 30000,
        }
      }
    };
  }

  async connect(config: DatabaseConfig = this.config): Promise<void> {
    try {
      await this.writeClient.$connect();
      this.connected = true;
    } catch (error) {
      if (config.retries && config.retries > 0) {
        await this.connect({ ...config, retries: config.retries - 1 });
      } else {
        throw error;
      }
    }
  }

  async disconnect(): Promise<void> {
    await this.writeClient.$disconnect();
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async execute<T>(query: string, params?: any[]): Promise<T> {
    return this.writeClient.$executeRaw(query, ...(params || []));
  }

  async transaction<T>(callback: TransactionCallback<T>): Promise<T> {
    return this.writeClient.$transaction(async (prisma: PrismaClient) => {
      return callback(prisma);
    });
  }

  async softDelete(model: string, id: number): Promise<boolean> {
    try {
      await this.prisma[model].update({
        where: { id },
        data: { deletedAt: new Date() }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  private validateQueryParams(params: any) {
    if (typeof params === 'object') {
      const sqlInjectionPattern = /(\b(union|select|insert|update|delete|drop|alter)\b)/i;
      Object.entries(params).forEach(([key, value]) => {
        if (typeof value === 'string' && sqlInjectionPattern.test(value)) {
          throw new SecurityError(`Potential SQL injection detected in parameter: ${key}`);
        }
      });
    }
  }

  async checkConnectionPool(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error('Connection pool health check failed:', error);
      return false;
    }
  }
}

// Add custom error classes
export class PrismaAdapterError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'PrismaAdapterError';
  }
}

export class ConnectionError extends PrismaAdapterError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = 'ConnectionError';
  }
}
