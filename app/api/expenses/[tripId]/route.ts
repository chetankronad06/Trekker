import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest, { params }: { params: Promise<{ tripId: string }> }) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { tripId } = await params

    // Verify user is member of trip
    const membership = await prisma.tripMember.findUnique({
      where: {
        tripId_userClerkId: {
          tripId,
          userClerkId: userId,
        },
      },
    })

    if (!membership) {
      return NextResponse.json({ error: "Not a member of this trip" }, { status: 403 })
    }

    // Fetch real expenses from database
    const expenses = await prisma.expense.findMany({
      where: {
        tripId: tripId,
      },
      include: {
        paidBy: {
          select: {
            clerkId: true,
            firstName: true,
            lastName: true,
            profileImageUrl: true,
          },
        },
        splits: {
          include: {
            user: {
              select: {
                clerkId: true,
                firstName: true,
                lastName: true,
                profileImageUrl: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    // Calculate summary
    const totalPaid = expenses
      .filter((expense) => expense.paidByClerkId === userId)
      .reduce((sum, expense) => sum + Number(expense.amount), 0)

    const totalOwed = expenses
      .flatMap((expense) => expense.splits)
      .filter((split) => split.userClerkId === userId && !split.settled)
      .reduce((sum, split) => sum + Number(split.amount), 0)

    const summary = {
      totalPaid,
      totalOwed,
      expenseCount: expenses.length,
    }

    // Format expenses for frontend
    const formattedExpenses = expenses.map((expense) => ({
      id: expense.id,
      amount: Number(expense.amount),
      description: expense.description,
      merchantName: expense.merchantName,
      transactionId: expense.transactionId,
      paymentMethod: expense.paymentMethod,
      category: expense.category,
      createdAt: expense.createdAt.toISOString(),
      paidBy: {
        name: `${expense.paidBy.firstName} ${expense.paidBy.lastName}`,
        imageUrl: expense.paidBy.profileImageUrl,
        clerkId: expense.paidBy.clerkId,
      },
      splits: expense.splits.map((split) => ({
        amount: Number(split.amount),
        isPaid: split.settled,
        user: {
          name: `${split.user.firstName} ${split.user.lastName}`,
          imageUrl: split.user.profileImageUrl,
          clerkId: split.user.clerkId,
        },
      })),
    }))

    return NextResponse.json({ expenses: formattedExpenses, summary })
  } catch (error) {
    console.error("Error fetching expenses:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ tripId: string }> }) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { tripId } = await params
    const body = await request.json()
    const { amount, description, merchantName, transactionId, paymentMethod, category, notes, ocrData, speechData, splitMethod = "EQUAL", customSplits } =
      body

    console.log("💰 Creating expense:", { amount, merchantName, paymentMethod, category, splitMethod })

    // Verify user is member of trip
    const membership = await prisma.tripMember.findUnique({
      where: {
        tripId_userClerkId: {
          tripId,
          userClerkId: userId,
        },
      },
    })

    if (!membership) {
      return NextResponse.json({ error: "Not a member of this trip" }, { status: 403 })
    }

    // Get all trip members for splitting
    const tripMembers = await prisma.tripMember.findMany({
      where: {
        tripId: tripId,
      },
      include: {
        user: true,
      },
    })

    // Map category string to enum
    const categoryMap: { [key: string]: any } = {
      "Food & Dining": "FOOD",
      Transportation: "TRANSPORT",
      Accommodation: "ACCOMMODATION",
      Entertainment: "ACTIVITIES",
      Shopping: "SHOPPING",
      Groceries: "FOOD",
      Medical: "MEDICAL",
      Fuel: "TRANSPORT",
      Other: "MISCELLANEOUS",
    }

    const expenseCategory = categoryMap[category] || "MISCELLANEOUS"
    const methodEnum = splitMethod === "CUSTOM" ? "CUSTOM" : "EQUAL"

    // Create expense in database
    const expense = await prisma.expense.create({
      data: {
        tripId: tripId,
        paidByClerkId: userId,
        amount: amount,
        description: description || `Payment to ${merchantName}`,
        category: expenseCategory,
        merchantName: merchantName,
        transactionId: transactionId || `TXN${Date.now()}`,
        paymentMethod: paymentMethod || "UPI",
        ocrData: ocrData ? (ocrData as any) : null,
        splitMethod: methodEnum,
      },
      include: {
        paidBy: {
          select: {
            clerkId: true,
            firstName: true,
            lastName: true,
            profileImageUrl: true,
          },
        },
      },
    })

    // Create splits based on split method
    let splits = []
    if (methodEnum === "CUSTOM" && customSplits && Array.isArray(customSplits)) {
      splits = await Promise.all(
        customSplits.map((splitItem: { userClerkId: string; amount: number }) =>
          prisma.expenseSplit.create({
            data: {
              expenseId: expense.id,
              userClerkId: splitItem.userClerkId,
              amount: splitItem.amount,
              settled: splitItem.userClerkId === userId, // Mark as settled for the payer
            },
            include: {
              user: {
                select: {
                  clerkId: true,
                  firstName: true,
                  lastName: true,
                  profileImageUrl: true,
                },
              },
            },
          })
        )
      )
    } else {
      // Create equal splits for all trip members
      const splitAmount = amount / tripMembers.length
      splits = await Promise.all(
        tripMembers.map((member) =>
          prisma.expenseSplit.create({
            data: {
              expenseId: expense.id,
              userClerkId: member.userClerkId,
              amount: splitAmount,
              settled: member.userClerkId === userId, // Mark as settled for the payer
            },
            include: {
              user: {
                select: {
                  clerkId: true,
                  firstName: true,
                  lastName: true,
                  profileImageUrl: true,
                },
              },
            },
          })
        )
      )
    }

    // Format response
    const formattedExpense = {
      id: expense.id,
      amount: Number(expense.amount),
      description: expense.description,
      merchantName: expense.merchantName,
      transactionId: expense.transactionId,
      paymentMethod: expense.paymentMethod,
      category: expense.category,
      createdAt: expense.createdAt.toISOString(),
      paidBy: {
        name: `${expense.paidBy.firstName} ${expense.paidBy.lastName}`,
        imageUrl: expense.paidBy.profileImageUrl,
        clerkId: expense.paidBy.clerkId,
      },
      splits: splits.map((split) => ({
        amount: Number(split.amount),
        isPaid: split.settled,
        user: {
          name: `${split.user.firstName} ${split.user.lastName}`,
          imageUrl: split.user.profileImageUrl,
          clerkId: split.user.clerkId,
        },
      })),
    }

    console.log("✅ Expense created successfully:", expense.id)

    return NextResponse.json({ expense: formattedExpense })
  } catch (error) {
    console.error("❌ Error creating expense:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
