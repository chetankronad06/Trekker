import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log("Querying users...")
  try {
    const users = await prisma.user.findMany()
    console.log(`Found ${users.length} users:`)
    console.log(JSON.stringify(users, null, 2))
  } catch (error) {
    console.error("Error querying users:", error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
