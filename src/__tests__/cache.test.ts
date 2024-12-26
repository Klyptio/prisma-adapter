import { PrismaCache } from '../cache';

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  mget: jest.fn(),
  keys: jest.fn(),
  quit: jest.fn(),
  expire: jest.fn(),
  dbsize: jest.fn(),
  zrem: jest.fn(),
  zadd: jest.fn(),
  zrange: jest.fn(),
  pipeline: jest.fn().mockReturnValue({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    zadd: jest.fn(),
    zrem: jest.fn(),
    exec: jest.fn().mockResolvedValue([])
  })
};

jest.mock('ioredis', () => {
  return function() {
    return mockRedis;
  };
});

describe('PrismaCache', () => {
  let cache: PrismaCache;

  beforeEach(() => {
    jest.clearAllMocks();
    cache = new PrismaCache({
      redis: { url: 'redis://localhost' },
      prisma: {} as any
    });
  });

  describe('get', () => {
    it('should retrieve cached item', async () => {
      const mockData = { id: 1, name: 'Test' };
      mockRedis.get.mockResolvedValue(JSON.stringify(mockData));

      const result = await cache.get('user', 1);
      expect(result).toEqual(mockData);
      expect(mockRedis.get).toHaveBeenCalledWith('prisma:user:1');
    });

    it('should return null for cache miss', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await cache.get('user', 1);
      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should cache item with TTL', async () => {
      const data = { id: 1, name: 'Test' };
      await cache.set('user', 1, data);

      expect(mockRedis.set).toHaveBeenCalledWith(
        'prisma:user:1',
        JSON.stringify(data),
        'EX',
        expect.any(Number)
      );
    });
  });

  describe('delete', () => {
    it('should remove cached item', async () => {
      await cache.del('user', 1);
      expect(mockRedis.del).toHaveBeenCalledWith('prisma:user:1');
    });
  });

  describe('warmCache', () => {
    it('should pre-populate cache with multiple items', async () => {
      const mockData = [
        { id: 1, name: 'Test 1' },
        { id: 2, name: 'Test 2' }
      ];
      const mockPrisma = {
        user: { findMany: jest.fn().mockResolvedValue(mockData) }
      };
      cache = new PrismaCache({
        redis: { url: 'redis://localhost' },
        prisma: mockPrisma
      });

      await cache.warmCache('user', [1, 2]);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: { id: { in: [1, 2] } }
      });
      expect(mockRedis.set).toHaveBeenCalledTimes(2);
      expect(mockRedis.set).toHaveBeenNthCalledWith(
        1,
        'prisma:user:1',
        JSON.stringify(mockData[0]),
        'EX',
        expect.any(Number)
      );
      expect(mockRedis.set).toHaveBeenNthCalledWith(
        2,
        'prisma:user:2',
        JSON.stringify(mockData[1]),
        'EX',
        expect.any(Number)
      );
    });
  });
});