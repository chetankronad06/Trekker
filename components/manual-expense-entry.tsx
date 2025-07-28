"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, CheckCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ExpenseData {
  amount: number
  description: string
  merchantName: string
  transactionId: string
  paymentMethod: string
  category?: string
  notes?: string
}

interface ManualExpenseEntryProps {
  onBack: () => void
  onExpenseLogged: (data: ExpenseData) => void
}

export default function ManualExpenseEntry({ onBack, onExpenseLogged }: ManualExpenseEntryProps) {
  const [formData, setFormData] = useState({
    amount: "",
    merchantName: "",
    transactionId: "",
    paymentMethod: "Cash",
    category: "Food & Dining",
    description: "",
    notes: "",
  })

  const { toast } = useToast()

  const categories = [
    "Food & Dining",
    "Transportation",
    "Accommodation",
    "Entertainment",
    "Shopping",
    "Groceries",
    "Medical",
    "Fuel",
    "Other",
  ]

  const paymentMethods = ["Google Pay", "PhonePe", "Paytm", "BHIM UPI", "UPI", "Cash", "Card", "Net Banking"]

  const quickAmounts = [50, 100, 200, 500, 1000]

  const handleSubmit = () => {
    // Validate required fields
    if (!formData.amount || !formData.merchantName) {
      toast({
        title: "Missing Information",
        description: "Please provide at least amount and merchant name",
        variant: "destructive",
      })
      return
    }

    const amount = Number.parseFloat(formData.amount)
    if (amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive",
      })
      return
    }

    const expenseData: ExpenseData = {
      amount,
      description: formData.description || `Payment to ${formData.merchantName}`,
      merchantName: formData.merchantName,
      transactionId: formData.transactionId || `MANUAL${Date.now()}`,
      paymentMethod: formData.paymentMethod,
      category: formData.category,
      notes: formData.notes,
    }

    onExpenseLogged(expenseData)
  }

  const setQuickAmount = (amount: number) => {
    setFormData((prev) => ({ ...prev, amount: amount.toString() }))
  }

  return (
    <div className="space-y-4 text-white">
      {/* Quick Amount Selection */}
      <div className="space-y-2">
        <Label className="text-gray-300">Quick Amount (₹)</Label>
        <div className="flex flex-wrap gap-2">
          {quickAmounts.map((amount) => (
            <Button
              key={amount}
              variant="outline"
              size="sm"
              onClick={() => setQuickAmount(amount)}
              className="text-xs bg-gray-700/50 border-gray-600 text-white hover:bg-gray-600/50"
            >
              ₹{amount}
            </Button>
          ))}
        </div>
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-gray-300">
              Amount (₹) *
            </Label>
            <Input
              id="amount"
              type="number"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
              required
              className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category" className="text-gray-300">
              Category
            </Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}
            >
              <SelectTrigger className="bg-gray-700/50 border-gray-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700 text-white">
                {categories.map((category) => (
                  <SelectItem key={category} value={category} className="focus:bg-gray-700 focus:text-white">
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="merchantName" className="text-gray-300">
            Merchant Name *
          </Label>
          <Input
            id="merchantName"
            placeholder="e.g., McDonald's, Cafe Coffee Day, Local Store"
            value={formData.merchantName}
            onChange={(e) => setFormData((prev) => ({ ...prev, merchantName: e.target.value }))}
            required
            className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="paymentMethod" className="text-gray-300">
              Payment Method
            </Label>
            <Select
              value={formData.paymentMethod}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, paymentMethod: value }))}
            >
              <SelectTrigger className="bg-gray-700/50 border-gray-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700 text-white">
                {paymentMethods.map((method) => (
                  <SelectItem key={method} value={method} className="focus:bg-gray-700 focus:text-white">
                    {method}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="transactionId" className="text-gray-300">
              Transaction ID
            </Label>
            <Input
              id="transactionId"
              placeholder="Optional"
              value={formData.transactionId}
              onChange={(e) => setFormData((prev) => ({ ...prev, transactionId: e.target.value }))}
              className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="description" className="text-gray-300">
            Description
          </Label>
          <Input
            id="description"
            placeholder="Brief description of the expense"
            value={formData.description}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes" className="text-gray-300">
            Notes (Optional)
          </Label>
          <Textarea
            id="notes"
            placeholder="Additional notes, receipt details, etc."
            value={formData.notes}
            onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
            rows={3}
            className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400"
          />
        </div>
      </div>

      {/* Submit Button */}
      <Button
        onClick={handleSubmit}
        className="w-full bg-green-600 hover:bg-green-700 text-white"
        disabled={!formData.amount || !formData.merchantName}
      >
        <CheckCircle className="h-4 w-4 mr-2" />
        Add Expense
      </Button>

      {/* Tips */}
      <div className="bg-gray-700/50 p-3 rounded-lg border border-gray-600">
        <h4 className="font-semibold text-sm text-gray-300 mb-2">💡 Tips:</h4>
        <ul className="text-xs text-gray-400 space-y-1">
          <li>• Use quick amounts for common expenses</li>
          <li>• Add transaction ID for digital payments</li>
          <li>• Include notes for better expense tracking</li>
          <li>• Choose appropriate category for reports</li>
        </ul>
      </div>
    </div>
  )
}
