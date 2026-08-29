import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

export function getPrisma(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }
  return prisma;
}

export async function connectDatabase(): Promise<void> {
  const client = getPrisma();
  await client.$connect();
  console.log('Connected to PostgreSQL database');
}

export async function disconnectDatabase(): Promise<void> {
  const client = getPrisma();
  await client.$disconnect();
  console.log('Disconnected from PostgreSQL database');
}
