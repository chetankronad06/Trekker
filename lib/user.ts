import { prisma } from "./prisma"

export async function getOrCreateUser(clerkUser: any) {
  const clerkId = clerkUser.id
  const email = clerkUser.emailAddresses?.[0]?.emailAddress || ""
  const firstName = clerkUser.firstName || ""
  const lastName = clerkUser.lastName || ""
  const profileImageUrl = clerkUser.imageUrl || null

  return await prisma.user.upsert({
    where: { clerkId },
    update: {
      email,
      firstName,
      lastName,
      profileImageUrl,
    },
    create: {
      clerkId,
      email,
      firstName,
      lastName,
      profileImageUrl,
    },
  })
}

export async function syncUserToDb({
  clerkId,
  email,
  firstName,
  lastName,
  profileImageUrl = null,
}: {
  clerkId: string
  email: string
  firstName: string
  lastName: string
  profileImageUrl?: string | null
}) {
  return await prisma.user.upsert({
    where: { clerkId },
    update: {
      email,
      firstName,
      lastName,
      profileImageUrl,
    },
    create: {
      clerkId,
      email,
      firstName,
      lastName,
      profileImageUrl,
    },
  })
}
