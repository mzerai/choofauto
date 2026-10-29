import { PrismaClient } from "@prisma/client";

// Client Prisma unique. En développement, le rechargement à chaud de Next.js réévalue les modules :
// on garde le client sur globalThis pour ne pas ouvrir une nouvelle connexion à chaque modification.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
