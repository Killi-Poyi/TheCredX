import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export default async function SyncUserProfileOnFirstLogin(
  user_id: string | null
): Promise<void> {
  // fallback to insert user profile if not exists
  if (user_id) {
    const userExists = await prisma.public_users.findUnique({
      where: { user_id },
    });

    if (!userExists) {
      await prisma.public_users.create({
        data: {
          user_id,
          role: "viewer",
        },
      });
    }
  }
}
