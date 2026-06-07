import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const clerkId = "user_test_upsert_123"
  console.log("Running upsert test...")

  try {
    // Run two concurrent upserts
    const p1 = prisma.user.upsert({
      where: { clerkId },
      update: { firstName: "Test1" },
      create: {
        clerkId,
        email: "test_upsert@example.com",
        firstName: "Test1",
        lastName: "User",
      }
    })

    const p2 = prisma.user.upsert({
      where: { clerkId },
      update: { firstName: "Test2" },
      create: {
        clerkId,
        email: "test_upsert@example.com",
        firstName: "Test2",
        lastName: "User",
      }
    })

    const [u1, u2] = await Promise.all([p1, p2])
    console.log("Upsert 1 result:", u1.firstName)
    console.log("Upsert 2 result:", u2.firstName)

    // Clean up
    await prisma.user.delete({ where: { clerkId } })
    console.log("Cleanup successful")
  } catch (error) {
    console.error("Upsert test failed:", error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
