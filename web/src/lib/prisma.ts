
// import { PrismaClient } from '@/generated/prisma'; // <-- The blueprint is needed here



// // This helps prevent initializing a new PrismaClient on every hot-reload in development.
// const globalForPrisma = global as unknown as { prisma: PrismaClient };

// const prisma =
//   globalForPrisma.prisma ||
//   new PrismaClient({
//     log: ['query'],
//   });

// if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// // Add this line to make it the default export
// export default prisma;// VERCEL UPDATES: This import path is changed to the standard '@prisma/client'.
// This is the correct path now that the custom 'output' in the schema is removed.

import { PrismaClient } from '@prisma/client';

// Your existing singleton pattern, which is a great approach.
const globalForPrisma = global as unknown as { prisma: PrismaClient };

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Ensure it's the default export.
export default prisma;
