import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const targetClerkId = "user_3EoilUJXWLdKJYacf58WIMeOVc1"
  console.log(`Testing findUnique for clerkId: "${targetClerkId}"`)
  
  try {
    const user = await prisma.user.findUnique({
      where: { clerkId: targetClerkId }
    })
    console.log("Result of findUnique:", user)

    const userByEmail = await prisma.user.findUnique({
      where: { email: "paltupakkya04@gmail.com" }
    })
    console.log("Result of findUnique by email:", userByEmail)

    const userFirst = await prisma.user.findFirst({
      where: { clerkId: targetClerkId }
    })
    console.log("Result of findFirst:", userFirst)
  } catch (error) {
    console.error("Error running test:", error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
