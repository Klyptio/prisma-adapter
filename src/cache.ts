import Redis, { Cluster } from 'ioredis';

export class PrismaCache {
  private readonly redis: Redis | Cluster;
  private readonly prefix: string;
  private readonly prisma: any;
  private readonly maxSize: number;
  private readonly stats = {
    hits: 0,
    misses: 0,
    evictions: 0
  };

  constructor(config: { 
    redis: { url: string, cluster?: boolean, nodes?: string[] },
    prefix?: string,
    prisma: any,
    maxSize?: number
  }) {
    let redisClient;
    if (config.redis.cluster) {
      redisClient = new Redis.Cluster(config.redis.nodes || [config.redis.url]);
    } else if (config.redis instanceof Redis) {
      redisClient = config.redis;
    } else {
      redisClient = new Redis(config.redis.url);
    }
    this.redis = redisClient;
    
    this.prefix = config.prefix || 'prisma:';
    this.prisma = config.prisma;
    this.maxSize = config.maxSize || 10000;
  }

  private getKey(model: string, id: string | number): string {
    return `${this.prefix}${model}:${id}`;
  }

  async mget<T>(model: string, ids: (string | number)[]): Promise<(T | null)[]> {
    const pipeline = this.redis.pipeline();
    const keys = ids.map(id => this.getKey(model, id));
    
    keys.forEach(key => pipeline.get(key));
    const results = await pipeline.exec();
    
    return results?.map(([err, result]) => {
      if (err) {
        console.error('Cache read error:', err);
        return null;
      }
      return result && typeof result === 'string' ? JSON.parse(result) : null;
    }) || [];
  }

  async set<T>(
    model: string,
    id: string | number,
    data: T,
    ttl: number = 3600
  ): Promise<void> {
    const key = this.getKey(model, id);
    const size = await this.redis.dbsize();
    
    if (size >= this.maxSize) {
      await this.evictOldest();
    }

    await this.redis.set(key, JSON.stringify(data), 'EX', ttl);
    await this.redis.zadd('cache:access', Date.now(), key);
  }

  private async evictOldest(): Promise<void> {
    const oldestKeys = await this.redis.zrange('cache:access', 0, 9);
    if (oldestKeys.length) {
      const pipeline = this.redis.pipeline();
      oldestKeys.forEach(key => {
        pipeline.del(key);
        pipeline.zrem('cache:access', key);
      });
      await pipeline.exec();
      this.stats.evictions += oldestKeys.length;
    }
  }

  async invalidateModel(model: string): Promise<void> {
    const keys = await this.redis.keys(`${this.prefix}${model}:*`);
    if (keys.length) {
      const pipeline = this.redis.pipeline();
      keys.forEach(key => {
        pipeline.del(key);
        pipeline.zrem('cache:access', key);
      });
      await pipeline.exec();
    }
  }

  getStats() {
    return {
      ...this.stats,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0
    };
  }

  async del(model: string, id: string | number): Promise<void> {
    const key = this.getKey(model, id);
    await this.redis.del(key);
    await this.redis.zrem('cache:access', key);
  }

  async warmCache(model: string, ids: number[]): Promise<void> {
    const results = await this.prisma[model].findMany({
      where: { id: { in: ids } }
    });
    
    await Promise.all(
      results.map((result: { id: number | string }) => this.set(model, result.id, result))
    );
  }

  async get<T>(model: string, id: string | number): Promise<T | null> {
    const key = this.getKey(model, id);
    const result = await this.redis.get(key);
    return result && typeof result === 'string' ? JSON.parse(result) : null;
  }

  async warmCacheByQuery(model: string, query: any): Promise<void> {
    const results = await this.prisma[model].findMany(query);
    await Promise.all(
      results.map((result: { id: number | string }) => 
        this.set(model, result.id, result)
      )
    );
  }

  async getCacheStats(): Promise<{
    size: number,
    hitRate: number,
    missRate: number,
    evictionRate: number
  }> {
    const size = await this.redis.dbsize();
    const total = this.stats.hits + this.stats.misses;
    return {
      size,
      hitRate: this.stats.hits / total || 0,
      missRate: this.stats.misses / total || 0,
      evictionRate: this.stats.evictions / total || 0
    };
  }
}