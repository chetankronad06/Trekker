"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { 
  TrendingUp, 
  QrCode, 
  Check, 
  AlertCircle, 
  Copy, 
  ArrowRight, 
  Loader2, 
  DollarSign, 
  User, 
  AlertTriangle 
} from "lucide-react"

interface Member {
  id: string
  userClerkId: string
  role: string
  user: {
    clerkId: string
    email: string
    firstName: string
    lastName: string
    profileImageUrl: string | null
    upiId: string | null
  }
}

interface Expense {
  id: string
  amount: number
  description: string
  paidBy: {
    clerkId: string
    name: string
  }
  splits: Array<{
    amount: number
    isPaid: boolean
    user: {
      clerkId: string
      name: string
    }
  }>
}

interface TripBalancesProps {
  tripId: string
  members: Member[]
}

interface Settlement {
  fromId: string
  fromName: string
  fromAvatar: string | null
  toId: string
  toName: string
  toAvatar: string | null
  toUpiId: string | null
  amount: number
}

export default function TripBalances({ tripId, members }: TripBalancesProps) {
  const { user: clerkUser } = useUser()
  const { toast } = useToast()
  
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [balances, setBalances] = useState<Record<string, number>>({})
  
  // Settlement Dialog states
  const [selectedSettlement, setSelectedSettlement] = useState<Settlement | null>(null)
  const [isSettleOpen, setIsSettleOpen] = useState(false)
  const [manualUpi, setManualUpi] = useState("")
  const [isSettling, setIsSettling] = useState(false)

  useEffect(() => {
    fetchExpensesAndCalculate()
  }, [tripId, members])

  const fetchExpensesAndCalculate = async () => {
    if (!tripId || members.length === 0) return

    try {
      setLoading(true)
      const response = await fetch(`/api/expenses/${tripId}`)
      if (response.ok) {
        const data = await response.json()
        const fetchedExpenses: Expense[] = data.expenses || []
        setExpenses(fetchedExpenses)
        calculateBalancesAndSettlements(fetchedExpenses)
      }
    } catch (error) {
      console.error("Error fetching expenses for balances:", error)
    } finally {
      setLoading(false)
    }
  }

  const calculateBalancesAndSettlements = (expenseList: Expense[]) => {
    const computedBalances: Record<string, number> = {}
    
    // Initialize balances to 0 for all members
    members.forEach((m) => {
      computedBalances[m.userClerkId] = 0
    })

    // Sum up what everyone owes (unsettled splits)
    expenseList.forEach((exp) => {
      const payerId = exp.paidBy.clerkId
      
      exp.splits.forEach((split) => {
        const debtorId = split.user.clerkId
        // Only calculate outstanding (unsettled) balances
        if (!split.isPaid) {
          if (computedBalances[debtorId] !== undefined) {
            computedBalances[debtorId] -= split.amount
          }
          if (computedBalances[payerId] !== undefined) {
            computedBalances[payerId] += split.amount
          }
        }
      })
    })

    setBalances(computedBalances)

    // Calculate settlements using greedy algorithm
    const debtors = Object.entries(computedBalances)
      .filter(([_, bal]) => bal < -0.01)
      .map(([id, bal]) => {
        const memberInfo = members.find((m) => m.userClerkId === id)
        return {
          id,
          name: memberInfo ? `${memberInfo.user.firstName} ${memberInfo.user.lastName}` : "Unknown Member",
          avatar: memberInfo?.user.profileImageUrl || null,
          balance: Math.abs(bal)
        }
      })

    const creditors = Object.entries(computedBalances)
      .filter(([_, bal]) => bal > 0.01)
      .map(([id, bal]) => {
        const memberInfo = members.find((m) => m.userClerkId === id)
        return {
          id,
          name: memberInfo ? `${memberInfo.user.firstName} ${memberInfo.user.lastName}` : "Unknown Member",
          avatar: memberInfo?.user.profileImageUrl || null,
          upiId: memberInfo?.user.upiId || null,
          balance: bal
        }
      })

    const computedSettlements: Settlement[] = []
    let dIdx = 0
    let cIdx = 0

    const debtorsCopy = debtors.map((d) => ({ ...d }))
    const creditorsCopy = creditors.map((c) => ({ ...c }))

    while (dIdx < debtorsCopy.length && cIdx < creditorsCopy.length) {
      const debtor = debtorsCopy[dIdx]
      const creditor = creditorsCopy[cIdx]
      const payAmount = Math.min(debtor.balance, creditor.balance)

      if (payAmount > 0.01) {
        computedSettlements.push({
          fromId: debtor.id,
          fromName: debtor.name,
          fromAvatar: debtor.avatar,
          toId: creditor.id,
          toName: creditor.name,
          toAvatar: creditor.avatar,
          toUpiId: creditor.upiId,
          amount: Math.round(payAmount)
        })
      }

      debtor.balance -= payAmount
      creditor.balance -= payAmount

      if (debtor.balance < 0.01) dIdx++
      if (creditor.balance < 0.01) cIdx++
    }

    setSettlements(computedSettlements)
  }

  const handleOpenSettleDialog = (settlement: Settlement) => {
    setSelectedSettlement(settlement)
    setManualUpi(settlement.toUpiId || "")
    setIsSettleOpen(true)
  }

  const handleCopyUpi = (upiString: string) => {
    navigator.clipboard.writeText(upiString)
    toast({
      title: "📋 UPI ID Copied!",
      description: "Copied recipient's UPI address to clipboard.",
    })
  }

  const executeSettlement = async () => {
    if (!selectedSettlement) return

    try {
      setIsSettling(true)
      const response = await fetch(`/api/expenses/${tripId}/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          debtorClerkId: selectedSettlement.fromId,
          creditorClerkId: selectedSettlement.toId
        })
      })

      if (response.ok) {
        toast({
          title: "🎉 Balance Settled!",
          description: `You marked your debt of ₹${selectedSettlement.amount} to ${selectedSettlement.toName} as settled!`,
        })
        setIsSettleOpen(false)
        setSelectedSettlement(null)
        await fetchExpensesAndCalculate()
      } else {
        const errorData = await response.json()
        toast({
          title: "❌ Settlement Failed",
          description: errorData.error || "Failed to mark settlement.",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error executing settlement:", error)
      toast({
        title: "❌ Error",
        description: "Failed to record settlement.",
        variant: "destructive"
      })
    } finally {
      setIsSettling(false)
    }
  }

  // Calculate user total spends and balances
  const currentUserClerkId = clerkUser?.id || ""
  const myBalance = balances[currentUserClerkId] || 0
  const totalTripSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0)
  const myTotalPaid = expenses
    .filter((exp) => exp.paidBy.clerkId === currentUserClerkId)
    .reduce((sum, exp) => sum + exp.amount, 0)

  if (loading) {
    return (
      <Card className="bg-gray-800/90 backdrop-blur-sm border-gray-700 shadow-2xl">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-green-500 animate-spin mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Calculating travel balances...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Generate UPI URI and QR URL
  const payeeUpi = selectedSettlement ? (selectedSettlement.toUpiId || manualUpi) : ""
  const upiUri = selectedSettlement 
    ? `upi://pay?pa=${payeeUpi}&pn=${encodeURIComponent(selectedSettlement.toName)}&am=${selectedSettlement.amount}&tn=Trekker%20Settlement`
    : ""
  const qrCodeUrl = upiUri 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiUri)}`
    : ""

  return (
    <div className="space-y-6">
      
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="bg-gray-800/40 border-gray-700/80 p-4">
          <p className="text-gray-400 text-xs sm:text-sm">Total Trip Spends</p>
          <p className="text-xl sm:text-2xl font-bold text-white mt-1">₹{Math.round(totalTripSpent)}</p>
        </Card>
        <Card className="bg-gray-800/40 border-gray-700/80 p-4">
          <p className="text-gray-400 text-xs sm:text-sm">Your Direct Payments</p>
          <p className="text-xl sm:text-2xl font-bold text-white mt-1">₹{Math.round(myTotalPaid)}</p>
        </Card>
        <Card className={`col-span-2 md:col-span-1 border p-4 ${
          myBalance > 0.01 
            ? "bg-green-500/5 border-green-500/25" 
            : myBalance < -0.01 
              ? "bg-red-500/5 border-red-500/25" 
              : "bg-gray-800/40 border-gray-700/80"
        }`}>
          <p className="text-gray-400 text-xs sm:text-sm">Your Net Position</p>
          <p className={`text-xl sm:text-2xl font-extrabold mt-1 ${
            myBalance > 0.01 
              ? "text-green-400" 
              : myBalance < -0.01 
                ? "text-red-400" 
                : "text-gray-300"
          }`}>
            {myBalance > 0.01 ? `Owed: +₹${Math.round(myBalance)}` : myBalance < -0.01 ? `You owe: -₹${Math.round(Math.abs(myBalance))}` : "Settled up"}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* Left: Balances List (8 Columns on desktop) */}
        <Card className="md:col-span-7 bg-gray-800/90 border-gray-700 shadow-2xl">
          <CardHeader className="pb-3 border-b border-gray-700/60">
            <CardTitle className="text-white flex items-center gap-2 text-base sm:text-lg">
              <TrendingUp className="w-5 h-5 text-green-400" />
              Member Balances
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Current outstanding balances for all travel members.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {members.map((m) => {
              const clerkId = m.userClerkId
              const bal = balances[clerkId] || 0
              const isMe = clerkId === currentUserClerkId
              const name = `${m.user.firstName} ${m.user.lastName}`

              return (
                <div 
                  key={clerkId} 
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                    isMe 
                      ? "bg-gray-700/20 border-gray-600" 
                      : "bg-gray-800/20 border-gray-800"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border border-gray-700">
                      <AvatarImage src={m.user.profileImageUrl || undefined} />
                      <AvatarFallback className="bg-gray-700 text-white text-xs">
                        {m.user.firstName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-white font-medium text-sm sm:text-base flex items-center gap-2">
                        {name}
                        {isMe && <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] py-0">You</Badge>}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">{m.role.toLowerCase()}</p>
                    </div>
                  </div>

                  <span className={`text-sm sm:text-base font-bold ${
                    bal > 0.01 
                      ? "text-green-400" 
                      : bal < -0.01 
                        ? "text-red-400" 
                        : "text-gray-500"
                  }`}>
                    {bal > 0.01 ? `+₹${Math.round(bal)}` : bal < -0.01 ? `-₹${Math.round(Math.abs(bal))}` : "₹0"}
                  </span>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Right: Direct Transfers Settle Solver (5 Columns on desktop) */}
        <Card className="md:col-span-5 bg-gray-800/90 border-gray-700 shadow-2xl">
          <CardHeader className="pb-3 border-b border-gray-700/60">
            <CardTitle className="text-white text-base sm:text-lg">Settle-Up Pathways</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Optimized direct transfers to clear group debts.</CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            {settlements.length === 0 ? (
              <div className="bg-green-500/10 border border-green-500/20 p-6 rounded-2xl text-center space-y-2">
                <p className="text-green-400 font-bold text-sm">🎉 Trip is fully settled!</p>
                <p className="text-xs text-gray-400">All expenses split and resolved.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {settlements.map((set, idx) => {
                  const isDebtor = set.fromId === currentUserClerkId
                  
                  return (
                    <div 
                      key={idx} 
                      className={`p-4 rounded-xl border flex flex-col gap-3 ${
                        isDebtor 
                          ? "bg-red-500/5 border-red-500/20" 
                          : "bg-gray-800/20 border-gray-800/80"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6 border border-gray-700">
                            <AvatarImage src={set.fromAvatar || undefined} />
                            <AvatarFallback className="bg-gray-700 text-white text-[10px]">
                              {set.fromName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-white font-medium truncate max-w-[80px]">{set.fromName}</span>
                        </div>
                        
                        <div className="flex flex-col items-center flex-1 px-2">
                          <span className="text-green-400 font-bold font-mono text-sm sm:text-base">₹{set.amount}</span>
                          <div className="w-full flex items-center justify-center gap-0.5">
                            <div className="h-0.5 bg-gradient-to-r from-red-500/20 to-green-500/20 flex-1"></div>
                            <ArrowRight className="w-3 h-3 text-green-400" />
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium truncate max-w-[80px]">{set.toName}</span>
                          <Avatar className="h-6 w-6 border border-gray-700">
                            <AvatarImage src={set.toAvatar || undefined} />
                            <AvatarFallback className="bg-gray-700 text-white text-[10px]">
                              {set.toName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      </div>

                      {/* Show Settle Up button if the current user is the debtor */}
                      {isDebtor ? (
                        <Button 
                          onClick={() => handleOpenSettleDialog(set)}
                          className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white text-xs font-semibold py-1.5 h-8"
                        >
                          <QrCode className="w-4 h-4 mr-1.5" />
                          Settle Up via UPI
                        </Button>
                      ) : (
                        <p className="text-[10px] text-gray-500 text-center italic">
                          Awaiting transfer of ₹{set.amount} from {set.fromName}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Settle Up Dialog with QR Code */}
      <Dialog open={isSettleOpen} onOpenChange={setIsSettleOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-sm w-[90%] rounded-2xl mx-auto">
          {selectedSettlement && (
            <>
              <DialogHeader className="text-center">
                <DialogTitle className="text-white text-lg font-bold">Settle Debt via UPI</DialogTitle>
                <DialogDescription className="text-gray-400 text-xs">
                  Pay {selectedSettlement.toName} the amount of ₹{selectedSettlement.amount}
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col items-center py-4 space-y-4">
                {/* UPI Configuration check */}
                {!selectedSettlement.toUpiId && !manualUpi ? (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 p-3.5 rounded-xl space-y-3 text-center w-full">
                    <div className="flex items-center justify-center gap-1.5 text-yellow-400 font-semibold text-xs">
                      <AlertTriangle className="h-4 w-4" />
                      No Recipient UPI Address
                    </div>
                    <p className="text-gray-400 text-[11px] leading-relaxed">
                      {selectedSettlement.toName} hasn't configured their default UPI ID. Please input their UPI ID manually to generate the payment QR code:
                    </p>
                    <div className="space-y-1">
                      <Label htmlFor="manualUpi" className="text-gray-300 text-[10px] text-left block">Recipient's UPI ID</Label>
                      <Input 
                        id="manualUpi" 
                        placeholder="e.g. mobile-no@upi or name@bank"
                        value={manualUpi}
                        onChange={(e) => setManualUpi(e.target.value)}
                        className="bg-gray-900 border-gray-700 text-white text-xs h-8 focus:border-green-500"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Render live QR Code */}
                    <div className="p-3 bg-white rounded-2xl shadow-xl flex items-center justify-center">
                      <img 
                        src={qrCodeUrl} 
                        alt="UPI Payment QR Code" 
                        className="w-[200px] h-[200px]"
                      />
                    </div>
                    
                    <div className="w-full space-y-2">
                      <div className="flex justify-between items-center bg-gray-900/60 border border-gray-700 p-2.5 rounded-xl">
                        <div className="text-left">
                          <span className="text-[10px] text-gray-500 block uppercase font-bold tracking-wider">UPI ID</span>
                          <span className="text-xs font-mono text-white break-all">{payeeUpi}</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleCopyUpi(payeeUpi)}
                          className="h-8 w-8 text-gray-400 hover:text-white"
                          title="Copy UPI ID"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Recipient UPI update option if it was missing */}
                      {!selectedSettlement.toUpiId && (
                        <div className="text-right">
                          <Button 
                            variant="link" 
                            onClick={() => setManualUpi("")} 
                            className="text-[10px] text-gray-400 p-0 h-auto underline"
                          >
                            Edit UPI Address
                          </Button>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-900/40 p-3 rounded-xl border border-gray-700/50 w-full">
                  <AlertCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <p className="leading-snug">
                    Scan this QR code with any UPI app (GPay, PhonePe, Paytm) to make the transfer. After completing the payment, click confirm below.
                  </p>
                </div>
              </div>

              <DialogFooter className="flex flex-col gap-2 sm:flex-row w-full mt-2">
                <Button 
                  onClick={executeSettlement}
                  disabled={isSettling || (!selectedSettlement.toUpiId && !manualUpi)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold flex items-center justify-center gap-1.5"
                >
                  {isSettling ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Marking...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Confirm & Settle Debt
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsSettleOpen(false)}
                  className="w-full border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white bg-transparent"
                >
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
