import { PrismaClient } from '@prisma/client';

let prisma;

function getPrismaClient() {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
}

export default getPrismaClient;