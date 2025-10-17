import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

type Website = {
  domain_name: string;
  status: string;
  website_id: string;
};

export default async function GetUserWebsites(
  user_id: string | null
): Promise<Website[]> {
  if (!user_id) {
    throw new Error("User not logged in");
  }

  const userWebsites = await prisma.websites.findMany({
    where: { owner_id: user_id },
    select: {
      domain_name: true,
      status: true,
      website_id: true,
    },
  });

  if (!userWebsites) {
    return [];
  }

  return userWebsites;
}
