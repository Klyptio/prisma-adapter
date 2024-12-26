export class PrismaAdapterError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = "PrismaAdapterError";
  }
}

export class QueryTimeoutError extends PrismaAdapterError {
  constructor(query: string) {
    super(`Query exceeded timeout: ${query}`);
    this.name = "QueryTimeoutError";
  }
}

export class ValidationError extends PrismaAdapterError {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class SecurityError extends PrismaAdapterError {
  constructor(message: string) {
    super(message);
    this.name = "SecurityError";
  }
}

export class CacheError extends PrismaAdapterError {
  constructor(message: string) {
    super(message);
    this.name = "CacheError";
  }
}

export class ReplicationError extends PrismaAdapterError {
  constructor(message: string) {
    super(message);
    this.name = "ReplicationError";
  }
}
