import { PrismaQueryBuilder } from '../query-builder';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
const createSlowQuery = (ms: number) => async () => await delay(ms);

describe('PrismaQueryBuilder', () => {
  let queryBuilder: PrismaQueryBuilder;
  const mockClient = {} as any;

  beforeEach(() => {
    queryBuilder = new PrismaQueryBuilder(mockClient, { model: 'user' });
  });

  describe('select', () => {
    it('should build select query correctly', () => {
      queryBuilder.select(['id', 'name', 'email']);
      expect(queryBuilder['query'].select).toEqual({
        id: true,
        name: true,
        email: true,
      });
    });
  });

  describe('where', () => {
    it('should sanitize where conditions', () => {
      queryBuilder.where({ name: "O'Connor--test" });
      expect(queryBuilder['query'].where.name).toBe("OConnortest");
    });

    it('should handle multiple conditions', () => {
      queryBuilder.where({ age: 25, active: true });
      expect(queryBuilder['query'].where).toEqual({
        age: 25,
        active: true
      });
    });
  });

  describe('pagination', () => {
    it('should set skip and take correctly', () => {
      queryBuilder.page(2).perPage(10);
      expect(queryBuilder['query'].skip).toBe(10);
      expect(queryBuilder['query'].take).toBe(10);
    });

    it('should handle first page correctly', () => {
      queryBuilder.page(1).perPage(20);
      expect(queryBuilder['query'].skip).toBe(0);
      expect(queryBuilder['query'].take).toBe(20);
    });
  });

  describe('orderBy', () => {
    it('should set order correctly', () => {
      queryBuilder.orderBy('createdAt', 'desc');
      expect(queryBuilder['query'].orderBy).toEqual([
        { createdAt: 'desc' }
      ]);
    });

    it('should handle multiple order fields', () => {
      queryBuilder.orderBy('name', 'asc').orderBy('age', 'desc');
      expect(queryBuilder['query'].orderBy).toEqual([
        { name: 'asc' },
        { age: 'desc' }
      ]);
    });
  });

  describe('include', () => {
    it('should set include relations correctly', () => {
      queryBuilder.include(['posts', 'profile']);
      expect(queryBuilder['query'].include).toEqual({
        posts: true,
        profile: true
      });
    });
  });

  describe('execute', () => {
    it('should call findMany by default', async () => {
      mockClient.user = { findMany: jest.fn().mockResolvedValue([]) };
      await queryBuilder.execute();
      expect(mockClient.user.findMany).toHaveBeenCalled();
    });

    it('should call findFirst for single result', async () => {
      mockClient.user = { findFirst: jest.fn().mockResolvedValue({}) };
      await queryBuilder.single().execute();
      expect(mockClient.user.findFirst).toHaveBeenCalled();
    });

    it('should handle count operation', async () => {
      mockClient.user = { count: jest.fn().mockResolvedValue(10) };
      await queryBuilder.count().execute();
      expect(mockClient.user.count).toHaveBeenCalled();
    });
  });

  describe('timeout', () => {
    it('should respect query timeout', async () => {
      queryBuilder.setTimeout(100);
      mockClient.$executeRaw = jest.fn(createSlowQuery(200));
      await expect(queryBuilder.executeRaw('SELECT 1')).rejects.toThrow('Query timeout');
    });

    it('should complete if within timeout', async () => {
      queryBuilder.setTimeout(200);
      mockClient.$executeRaw = jest.fn(createSlowQuery(100));
      await expect(queryBuilder.executeRaw('SELECT 1')).resolves.not.toThrow();
    });
  });
});