
import { PrismaClient } from '@prisma/client'; // <-- The blueprint is needed here



// This helps prevent initializing a new PrismaClient on every hot-reload in development.
const globalForPrisma = global as unknown as { prisma: PrismaClient };

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Add this line to make it the default export
export default prisma;