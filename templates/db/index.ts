import { PrismaAdapter } from '@next-boilerplate/prisma-adapter';
import { databaseConfig } from '@/app/_config/database.config';

let dbInstance: PrismaAdapter | null = null;

export async function getDatabase() {
  if (!dbInstance) {
    dbInstance = new PrismaAdapter(databaseConfig);
    await dbInstance.connect();
  }
  return dbInstance;
}

export async function getPrisma() {
  const db = await getDatabase();
  return db.prisma;
}