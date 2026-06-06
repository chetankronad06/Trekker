"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, CheckCircle, Users, Check, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ExpenseSplitData {
  userClerkId: string
  amount: number
}

interface ExpenseData {
  amount: number
  description: string
  merchantName: string
  transactionId: string
  paymentMethod: string
  category?: string
  notes?: string
  splitMethod?: "EQUAL" | "CUSTOM"
  customSplits?: ExpenseSplitData[]
}

interface ManualExpenseEntryProps {
  tripId: string
  onBack: () => void
  onExpenseLogged: (data: ExpenseData) => void
}

export default function ManualExpenseEntry({ tripId, onBack, onExpenseLogged }: ManualExpenseEntryProps) {
  const [formData, setFormData] = useState({
    amount: "",
    merchantName: "",
    transactionId: "",
    paymentMethod: "Cash",
    category: "Food & Dining",
    description: "",
    notes: "",
  })

  const [members, setMembers] = useState<any[]>([])
  const [loadingMembers, setLoadingMembers] = useState(true)
  const [splitMethod, setSplitMethod] = useState<"EQUAL" | "CUSTOM">("EQUAL")
  const [selectedMembers, setSelectedMembers] = useState<{ [clerkId: string]: boolean }>({})
  const [customAmounts, setCustomAmounts] = useState<{ [clerkId: string]: string }>({})

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

  // Fetch trip members
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setLoadingMembers(true)
        const res = await fetch(`/api/trips/${tripId}/members`)
        if (res.ok) {
          const data = await res.json()
          setMembers(data.members || [])
        } else {
          console.error("Failed to fetch trip members")
        }
      } catch (err) {
        console.error("Error fetching trip members:", err)
      } finally {
        setLoadingMembers(false)
      }
    }

    if (tripId) {
      fetchMembers()
    }
  }, [tripId])

  // Initialize selection maps when members load or change
  useEffect(() => {
    if (members.length > 0) {
      const initialSelected: { [clerkId: string]: boolean } = {}
      const initialCustom: { [clerkId: string]: string } = {}
      members.forEach((m) => {
        initialSelected[m.userClerkId] = true
        initialCustom[m.userClerkId] = ""
      })
      setSelectedMembers(initialSelected)
      setCustomAmounts(initialCustom)
    }
  }, [members])

  const totalAmount = parseFloat(formData.amount) || 0

  // Calculate sum of custom splits
  const customSplitSum = Object.entries(selectedMembers)
    .filter(([_, isSelected]) => isSelected)
    .reduce((sum, [clerkId, _]) => sum + (parseFloat(customAmounts[clerkId]) || 0), 0)

  const handleMemberToggle = (clerkId: string, checked: boolean) => {
    setSelectedMembers((prev) => ({ ...prev, [clerkId]: checked }))
    if (!checked) {
      setCustomAmounts((prev) => ({ ...prev, [clerkId]: "" }))
    }
  }

  const handleCustomAmountChange = (clerkId: string, value: string) => {
    setCustomAmounts((prev) => ({ ...prev, [clerkId]: value }))
  }

  const handleSplitMethodChange = (method: "EQUAL" | "CUSTOM") => {
    setSplitMethod(method)
    if (method === "CUSTOM") {
      // Initialize with equal distribution
      const activeMembers = Object.entries(selectedMembers)
        .filter(([_, isSel]) => isSel)
        .map(([id]) => id)
      if (activeMembers.length > 0 && totalAmount > 0) {
        const share = Math.floor((totalAmount / activeMembers.length) * 100) / 100
        const remainder = parseFloat((totalAmount - share * activeMembers.length).toFixed(2))
        const nextCustom: { [clerkId: string]: string } = { ...customAmounts }
        activeMembers.forEach((id, index) => {
          const memberShare = index === 0 ? share + remainder : share
          nextCustom[id] = memberShare.toFixed(2)
        })
        setCustomAmounts(nextCustom)
      }
    }
  }

  const areAllSelected = members.length > 0 && members.every((m) => selectedMembers[m.userClerkId])
  const toggleSelectAllMembers = () => {
    const nextVal = !areAllSelected
    const nextSelected: { [clerkId: string]: boolean } = {}
    members.forEach((m) => {
      nextSelected[m.userClerkId] = nextVal
    })
    setSelectedMembers(nextSelected)
  }

  const autoDistributeRemaining = () => {
    const activeMembers = Object.entries(selectedMembers)
      .filter(([_, isSel]) => isSel)
      .map(([id]) => id)
    if (activeMembers.length > 0 && totalAmount > 0) {
      const share = Math.floor((totalAmount / activeMembers.length) * 100) / 100
      const remainder = parseFloat((totalAmount - share * activeMembers.length).toFixed(2))
      const nextCustom: { [clerkId: string]: string } = { ...customAmounts }
      activeMembers.forEach((id, index) => {
        const memberShare = index === 0 ? share + remainder : share
        nextCustom[id] = memberShare.toFixed(2)
      })
      setCustomAmounts(nextCustom)
    }
  }

  const handleSubmit = () => {
    if (!formData.amount || !formData.merchantName) {
      toast({
        title: "Missing Information",
        description: "Please provide at least amount and merchant name",
        variant: "destructive",
      })
      return
    }

    if (totalAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive",
      })
      return
    }

    const activeMembers = Object.entries(selectedMembers)
      .filter(([_, isSel]) => isSel)
      .map(([id]) => id)

    if (activeMembers.length === 0) {
      toast({
        title: "No Members Selected",
        description: "Please select at least one member to split the expense with.",
        variant: "destructive",
      })
      return
    }

    let finalSplitMethod: "EQUAL" | "CUSTOM" = "EQUAL"
    let finalCustomSplits: ExpenseSplitData[] = []

    if (splitMethod === "CUSTOM") {
      if (Math.abs(customSplitSum - totalAmount) >= 0.01) {
        toast({
          title: "Unbalanced Splits",
          description: `The sum of custom splits (₹${customSplitSum.toFixed(2)}) must equal the total amount (₹${totalAmount.toFixed(2)})`,
          variant: "destructive",
        })
        return
      }
      finalSplitMethod = "CUSTOM"
      finalCustomSplits = activeMembers.map((id) => ({
        userClerkId: id,
        amount: parseFloat(customAmounts[id]) || 0,
      }))
    } else {
      // EQUAL Split Mode
      // If user selected a subset of members, we send splitMethod: "CUSTOM" with the calculated splits
      if (activeMembers.length < members.length) {
        finalSplitMethod = "CUSTOM"
        const share = Math.floor((totalAmount / activeMembers.length) * 100) / 100
        const remainder = parseFloat((totalAmount - share * activeMembers.length).toFixed(2))
        finalCustomSplits = activeMembers.map((id, index) => ({
          userClerkId: id,
          amount: index === 0 ? share + remainder : share,
        }))
      } else {
        // Equal split among all members
        finalSplitMethod = "EQUAL"
      }
    }

    const expenseData: ExpenseData = {
      amount: totalAmount,
      description: formData.description || `Payment to ${formData.merchantName}`,
      merchantName: formData.merchantName,
      transactionId: formData.transactionId || `MANUAL${Date.now()}`,
      paymentMethod: formData.paymentMethod,
      category: formData.category,
      notes: formData.notes,
      splitMethod: finalSplitMethod,
      ...(finalSplitMethod === "CUSTOM" ? { customSplits: finalCustomSplits } : {}),
    }

    onExpenseLogged(expenseData)
  }

  const setQuickAmount = (amount: number) => {
    setFormData((prev) => ({ ...prev, amount: amount.toString() }))
  }

  const isSubmitDisabled =
    !formData.amount ||
    !formData.merchantName ||
    (splitMethod === "CUSTOM" && Math.abs(customSplitSum - totalAmount) >= 0.01)

  return (
    <div className="space-y-4 text-white">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={onBack} className="text-gray-300 hover:text-white mb-2 p-0 h-auto">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to methods
      </Button>

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

        {/* Splitting Section */}
        <div className="space-y-4 bg-gray-800/40 p-4 rounded-xl border border-gray-700/80">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold text-gray-200 flex items-center gap-2">
              <Users className="h-4 w-4 text-green-400" />
              Split Expense
            </Label>

            <Tabs value={splitMethod} onValueChange={(v) => handleSplitMethodChange(v as "EQUAL" | "CUSTOM")} className="w-fit">
              <TabsList className="bg-gray-950 border border-gray-800 p-0.5">
                <TabsTrigger value="EQUAL" className="text-xs px-3 py-1.5 data-[state=active]:bg-gray-850 text-gray-400 data-[state=active]:text-white">
                  Equally
                </TabsTrigger>
                <TabsTrigger value="CUSTOM" className="text-xs px-3 py-1.5 data-[state=active]:bg-gray-850 text-gray-400 data-[state=active]:text-white">
                  Custom
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {loadingMembers ? (
            <div className="flex justify-center py-4 text-sm text-gray-400">Loading trip members...</div>
          ) : members.length === 0 ? (
            <div className="flex justify-center py-4 text-sm text-yellow-500">No members found in this trip.</div>
          ) : (
            <div className="space-y-3">
              {splitMethod === "EQUAL" && (
                <div className="flex items-center justify-between pb-1 border-b border-gray-700/50">
                  <span className="text-[11px] text-gray-400">Select who splits this expense:</span>
                  <Button
                    variant="link"
                    size="sm"
                    className="text-xs text-green-400 hover:text-green-300 p-0 h-auto"
                    onClick={toggleSelectAllMembers}
                  >
                    {areAllSelected ? "Deselect All" : "Select All"}
                  </Button>
                </div>
              )}

              <div className="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {members.map((member) => {
                  const clerkId = member.userClerkId
                  const name = `${member.user.firstName || ""} ${member.user.lastName || ""}`.trim() || member.user.email
                  const imageUrl = member.user.profileImageUrl
                  const isSelected = !!selectedMembers[clerkId]

                  let displayAmount = 0
                  if (isSelected) {
                    if (splitMethod === "EQUAL") {
                      const activeCount = Object.values(selectedMembers).filter(Boolean).length
                      displayAmount = activeCount > 0 ? totalAmount / activeCount : 0
                    } else {
                      displayAmount = parseFloat(customAmounts[clerkId]) || 0
                    }
                  }

                  return (
                    <div
                      key={clerkId}
                      className={`flex items-center justify-between p-2 rounded-lg border transition-all duration-200 ${
                        isSelected
                          ? "bg-gray-700/30 border-green-500/30"
                          : "bg-gray-800/20 border-transparent opacity-60"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id={`member-${clerkId}`}
                          checked={isSelected}
                          onCheckedChange={(checked) => handleMemberToggle(clerkId, !!checked)}
                        />
                        <Avatar className="h-8 w-8 border border-gray-600">
                          <AvatarImage src={imageUrl} alt={name} />
                          <AvatarFallback className="bg-gray-700 text-xs text-white">
                            {name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-white">{name}</span>
                          <span className="text-[10px] text-gray-400 capitalize">{member.role.toLowerCase()}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {splitMethod === "EQUAL" ? (
                          <span className="text-sm font-semibold text-gray-200">
                            ₹{displayAmount.toFixed(2)}
                          </span>
                        ) : (
                          <div className="relative flex items-center">
                            <span className="absolute left-2 text-xs text-gray-400">₹</span>
                            <Input
                              type="number"
                              placeholder="0.00"
                              disabled={!isSelected}
                              value={customAmounts[clerkId] || ""}
                              onChange={(e) => handleCustomAmountChange(clerkId, e.target.value)}
                              className="h-8 w-24 pl-5 text-right text-xs bg-gray-950 border-gray-800 text-white placeholder-gray-600 disabled:opacity-50"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {splitMethod === "CUSTOM" && (
                <div className="flex items-center justify-between pt-2 border-t border-gray-700/50 text-xs">
                  <span className="text-gray-400">
                    Total split: <span className="font-semibold text-white">₹{customSplitSum.toFixed(2)}</span> of <span className="font-semibold text-white">₹{totalAmount.toFixed(2)}</span>
                  </span>

                  {Math.abs(customSplitSum - totalAmount) < 0.01 ? (
                    <span className="text-green-400 flex items-center gap-1 font-medium">
                      <Check className="h-3.5 w-3.5" /> Balanced
                    </span>
                  ) : (
                    <span className="text-red-400 flex items-center gap-1 font-medium">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Diff: ₹{(totalAmount - customSplitSum).toFixed(2)}
                    </span>
                  )}
                </div>
              )}

              {splitMethod === "CUSTOM" && (
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  className="w-full text-xs bg-gray-950 border-gray-800 text-green-400 hover:text-green-300 hover:bg-gray-900"
                  onClick={autoDistributeRemaining}
                  disabled={Object.values(selectedMembers).filter(Boolean).length === 0}
                >
                  Distribute Equally
                </Button>
              )}
            </div>
          )}
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
        className="w-full bg-green-600 hover:bg-green-700 text-white mt-4"
        disabled={isSubmitDisabled}
      >
        <CheckCircle className="h-4 w-4 mr-2" />
        Add Expense
      </Button>

      {/* Tips */}
      <div className="bg-gray-700/50 p-3 rounded-lg border border-gray-600">
        <h4 className="font-semibold text-sm text-gray-300 mb-2">💡 Tips:</h4>
        <ul className="text-xs text-gray-400 space-y-1">
          <li>• Choose Equally or Custom splitting method above</li>
          <li>• Uncheck members to exclude them from the expense split</li>
          <li>• Click 'Distribute Equally' to divide custom splits automatically</li>
        </ul>
      </div>
    </div>
  )
}

