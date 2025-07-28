"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Receipt, Search, X, Users } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useUser } from "@clerk/nextjs"

interface ExpenseListProps {
  tripId: string
}

interface Expense {
  id: string
  amount: number
  description: string
  merchantName: string
  transactionId: string
  paymentMethod: string
  createdAt: string
  paidBy: {
    name: string
    imageUrl: string | null
    clerkId: string
  }
  splits: Array<{
    amount: number
    isPaid: boolean
    user: {
      name: string
      imageUrl: string | null
      clerkId: string
    }
  }>
}

export default function ExpenseList({ tripId }: ExpenseListProps) {
  const { user: clerkUser } = useUser()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const expensesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchExpenses()
  }, [tripId])

  useEffect(() => {
    scrollToBottom()
  }, [expenses])

  const fetchExpenses = async () => {
    try {
      const response = await fetch(`/api/expenses/${tripId}`)
      if (response.ok) {
        const data = await response.json()
        setExpenses(data.expenses || [])
      }
    } catch (error) {
      console.error("Error fetching expenses:", error)
    } finally {
      setLoading(false)
    }
  }

  const scrollToBottom = () => {
    expensesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const filteredExpenses = expenses.filter((expense) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      expense.description.toLowerCase().includes(searchLower) ||
      expense.merchantName.toLowerCase().includes(searchLower) ||
      expense.amount.toString().includes(searchTerm) ||
      expense.paymentMethod.toLowerCase().includes(searchLower) ||
      expense.paidBy.name.toLowerCase().includes(searchLower)
    )
  })

  const clearSearch = () => {
    setSearchTerm("")
  }

  const isMyExpense = (expense: Expense) => {
    return expense.paidBy.clerkId === clerkUser?.id
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const getInitials = (name?: string) => {
    if (!name) return "U"
    const parts = name.split(" ")
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  if (loading) {
    return (
      <Card className="bg-gray-800/90 backdrop-blur-sm border-gray-700 shadow-2xl flex flex-col h-full">
        <CardHeader className="pb-3 border-b border-gray-700 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-green-400" />
              <CardTitle className="text-white text-lg">Expense History</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"} animate-pulse`}>
                <div className="flex max-w-[70%] gap-2">
                  <div className="w-8 h-8 bg-gray-700 rounded-full"></div>
                  <div className="bg-gray-700 rounded-2xl p-3 min-w-[120px] h-16"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-gray-800/90 backdrop-blur-sm border-gray-700 shadow-2xl flex flex-col h-[500px]">
      <CardHeader className="pb-3 border-b border-gray-700 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-green-400" />
            <CardTitle className="text-white text-lg">Expense History</CardTitle>
          </div>
          <Badge className="bg-green-500/20 text-green-400 border-green-500/50 text-xs">
            <Users className="w-3 h-3 mr-1" />
            {expenses.length} expenses
          </Badge>
        </div>

        {/* Search Bar */}
        <div className="flex gap-2 mt-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-10 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 h-9"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSearch}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0 hover:bg-gray-600/50"
              >
                <X className="h-3 w-3 text-gray-400" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {/* Expenses Container */}
      <CardContent className="flex-1 p-0 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar min-h-0">
          {filteredExpenses.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Receipt className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {expenses.length === 0 ? "No expenses yet" : "No matching expenses"}
              </h3>
              <p className="text-gray-400">
                {expenses.length === 0 ? "Start tracking your trip expenses!" : "Try adjusting your search terms"}
              </p>
            </div>
          ) : (
            filteredExpenses.map((expense, index) => {
              const isMe = isMyExpense(expense)
              const currentUserId = expense.paidBy.clerkId
              const previousUserId = index > 0 ? filteredExpenses[index - 1].paidBy.clerkId : null
              const showAvatar = currentUserId !== previousUserId
              const userName = isMe ? "You" : expense.paidBy.name

              return (
                <div key={expense.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div className={`flex max-w-[75%] ${isMe ? "flex-row-reverse" : "flex-row"} gap-2`}>
                    {/* Avatar */}
                    <div className={`flex-shrink-0 ${showAvatar ? "visible" : "invisible"}`}>
                      {expense.paidBy.imageUrl ? (
                        <img
                          src={expense.paidBy.imageUrl || "/placeholder.svg"}
                          alt={userName}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white ${
                            isMe ? "bg-green-500" : "bg-blue-500"
                          }`}
                        >
                          {getInitials(expense.paidBy.name)}
                        </div>
                      )}
                    </div>

                    {/* Message Content */}
                    <div className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                      {/* Name and Time */}
                      {showAvatar && (
                        <div className={`flex items-center gap-2 mb-1 px-3 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                          <span className="text-xs text-gray-400">{userName}</span>
                          <span className="text-xs text-gray-500">{formatTime(expense.createdAt)}</span>
                        </div>
                      )}

                      {/* Expense Bubble */}
                      <div
                        className={`px-4 py-3 rounded-2xl max-w-full ${
                          isMe
                            ? "bg-gradient-to-r from-green-500 to-green-600 text-white rounded-br-md"
                            : "bg-gray-700 text-white rounded-bl-md"
                        }`}
                      >
                        {/* Main expense info */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm truncate">{expense.description}</p>
                              <p className="text-xs opacity-80 truncate">{expense.merchantName}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-lg font-bold">₹{expense.amount}</div>
                            </div>
                          </div>

                          {/* Payment method */}
                          <div className="flex items-center justify-between">
                            <Badge
                              variant="outline"
                              className={`text-xs border-0 ${
                                isMe ? "bg-green-400/20 text-green-100" : "bg-gray-600/50 text-gray-300"
                              }`}
                            >
                              {expense.paymentMethod}
                            </Badge>
                            <span className="text-xs opacity-70">
                              {new Date(expense.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
          <div ref={expensesEndRef} />
        </div>
      </CardContent>
    </Card>
  )
}
