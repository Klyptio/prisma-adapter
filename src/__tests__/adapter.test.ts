import { PrismaAdapter } from '../adapter';

// Create a mock class with the required methods
const mockConnect = jest.fn();
const mockDisconnect = jest.fn();
const mockOn = jest.fn();
const mockTransaction = jest.fn(callback => callback({}));
const mockQueryRaw = jest.fn().mockResolvedValue([{ 1: 1 }]);

// Mock PrismaClient
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $connect: mockConnect,
    $disconnect: mockDisconnect,
    $on: mockOn,
    $transaction: mockTransaction,
    $queryRaw: mockQueryRaw,
  }))
}));

describe('PrismaAdapter', () => {
  let adapter: PrismaAdapter;
  
  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new PrismaAdapter({ 
      prisma: { 
        replication: {
          enabled: true,
          reads: ['url1', 'url2']
        }
      } 
    });
  });

  describe('connect', () => {
    it('should connect successfully', async () => {
      mockConnect.mockResolvedValueOnce(undefined);
      await adapter.connect();
      expect(adapter.isConnected()).toBe(true);
    });

    it('should retry on connection failure', async () => {
      mockConnect
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockResolvedValueOnce(undefined);

      await expect(adapter.connect({ ...adapter['config'], retries: 1 })).resolves.not.toThrow();
      expect(mockConnect).toHaveBeenCalledTimes(2);
    });
  });

  describe('transaction', () => {
    it('should execute transaction callback', async () => {
      const callback = jest.fn().mockResolvedValue('result');
      const result = await adapter.transaction(callback);
      
      expect(result).toBe('result');
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('softDelete', () => {
    it('should mark record as deleted', async () => {
      const mockUpdate = jest.fn().mockResolvedValue({ id: 1, deletedAt: new Date() });
      adapter.prisma.user = { update: mockUpdate };

      const result = await adapter.softDelete('user', 1);
      
      expect(result).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({ deletedAt: expect.any(Date) })
      });
    });
  });

  describe('connection pool', () => {
    it('should handle connection pool health check', async () => {
      mockQueryRaw.mockResolvedValueOnce([{ 1: 1 }]);
      const result = await adapter.checkConnectionPool();
      expect(result).toBe(true);
    });
  });

  describe('replication', () => {
    it('should round-robin read clients', () => {
      const client1 = adapter['getReadClient']();
      const client2 = adapter['getReadClient']();
      expect(client1).not.toBe(client2);
      expect(adapter['clients'].length).toBe(2);
    });
  });
});