"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  MapPin,
  Calendar,
  Users,
  Send,
  Clock,
  CheckCircle,
  X,
  Sparkles,
  Volume2,
  Image,
  DollarSign,
  ArrowRight,
  TrendingUp,
  RotateCcw,
  ArrowDownRight,
  ArrowUpRight,
  Flame,
  ShieldCheck,
  Compass
} from "lucide-react"

// Types for Sandbox
interface Expense {
  id: string
  description: string
  amount: number
  paidBy: string
}

const DEMO_MEMBERS = ["Chetan", "Paltu", "Aftab", "Mahammad"]
const MEMBER_AVATARS: Record<string, string> = {
  Chetan: "👨‍💻",
  Paltu: "🏃‍♂️",
  Aftab: "🏂",
  Mahammad: "🚴‍♂️"
}

const INITIAL_DEMO_EXPENSES: Expense[] = [
  { id: "1", description: "Beachfront Airbnb 🏡", amount: 8000, paidBy: "Aftab" },
  { id: "2", description: "Self-Drive Car & Fuel 🚗", amount: 3600, paidBy: "Chetan" },
  { id: "3", description: "Seafood Dinner Party 🍽️", amount: 2400, paidBy: "Paltu" },
]

export default function HomePage() {
  const { isLoaded, isSignedIn } = useUser()
  const router = useRouter()

  // Sandbox States
  const [expenses, setExpenses] = useState<Expense[]>(INITIAL_DEMO_EXPENSES)
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [paidBy, setPaidBy] = useState("Chetan")
  
  // Interactive Simulation States
  const [isScanningOCR, setIsScanningOCR] = useState(false)
  const [isProcessingSpeech, setIsProcessingSpeech] = useState(false)
  const [simulationMessage, setSimulationMessage] = useState("")

  // Autoredirect if signed in
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push("/dashboard")
    }
  }, [isLoaded, isSignedIn, router])

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading Trekker...</p>
        </div>
      </div>
    )
  }

  // Prevent flash of landing page if signed in (will be handled by useEffect redirect)
  if (isSignedIn) {
    return null
  }

  // Split Solver Logic
  const balances: Record<string, number> = {}
  DEMO_MEMBERS.forEach((m) => { balances[m] = 0 })

  expenses.forEach((exp) => {
    const splitAmount = exp.amount / DEMO_MEMBERS.length
    DEMO_MEMBERS.forEach((m) => {
      if (m === exp.paidBy) {
        balances[m] += exp.amount - splitAmount
      } else {
        balances[m] -= splitAmount
      }
    })
  })

  // Calculate settlement transactions
  const debtors = Object.entries(balances)
    .filter(([_, bal]) => bal < -0.01)
    .map(([name, bal]) => ({ name, balance: Math.abs(bal) }))
  const creditors = Object.entries(balances)
    .filter(([_, bal]) => bal > 0.01)
    .map(([name, bal]) => ({ name, balance: bal }))

  const settlements: { from: string; to: string; amount: number }[] = []
  let dIdx = 0
  let cIdx = 0

  const debtorsCopy = debtors.map((d) => ({ ...d }))
  const creditorsCopy = creditors.map((c) => ({ ...c }))

  while (dIdx < debtorsCopy.length && cIdx < creditorsCopy.length) {
    const debtor = debtorsCopy[dIdx]
    const creditor = creditorsCopy[cIdx]
    const payAmount = Math.min(debtor.balance, creditor.balance)

    if (payAmount > 0.01) {
      settlements.push({
        from: debtor.name,
        to: creditor.name,
        amount: Math.round(payAmount),
      })
    }

    debtor.balance -= payAmount
    creditor.balance -= payAmount

    if (debtor.balance < 0.01) dIdx++
    if (creditor.balance < 0.01) cIdx++
  }

  // Sandbox handlers
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault()
    if (!description || !amount || isNaN(Number(amount)) || Number(amount) <= 0) return

    const newExpense: Expense = {
      id: Date.now().toString(),
      description,
      amount: Math.round(Number(amount)),
      paidBy,
    }

    setExpenses([newExpense, ...expenses])
    setDescription("")
    setAmount("")
  }

  const handleRemoveExpense = (id: string) => {
    setExpenses(expenses.filter((exp) => exp.id !== id))
  }

  const handleResetSandbox = () => {
    setExpenses(INITIAL_DEMO_EXPENSES)
  }

  // Simulations
  const runMockOCR = () => {
    setIsScanningOCR(true)
    setSimulationMessage("Uploading transaction receipt...")
    
    setTimeout(() => {
      setSimulationMessage("OCR Engine: Extracting UPI reference...")
    }, 800)

    setTimeout(() => {
      setSimulationMessage("AI Parser: Match found! Dinner with Group.")
    }, 1500)

    setTimeout(() => {
      const scannedExpense: Expense = {
        id: Date.now().toString(),
        description: "Beach Shack Cocktails 🍹 (Scanned Receipt)",
        amount: 1800,
        paidBy: "Mahammad",
      }
      setExpenses([scannedExpense, ...expenses])
      setIsScanningOCR(false)
      setSimulationMessage("")
    }, 2200)
  }

  const runMockSpeech = () => {
    setIsProcessingSpeech(true)
    setSimulationMessage("Listening: 'Paltu paid 1200 rupees for local bus transit'...")

    setTimeout(() => {
      setSimulationMessage("Parsing syntax: user=Paltu amount=1200 category=Transport...")
    }, 1000)

    setTimeout(() => {
      const speechExpense: Expense = {
        id: Date.now().toString(),
        description: "Local Bus Transit 🚌 (Speech logged)",
        amount: 1200,
        paidBy: "Paltu",
      }
      setExpenses([speechExpense, ...expenses])
      setIsProcessingSpeech(false)
      setSimulationMessage("")
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white selection:bg-green-500/30 selection:text-white font-sans antialiased overflow-x-hidden">
      
      {/* Dynamic Ambient Background Glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-green-500/10 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse duration-[8000ms]"></div>
      <div className="absolute top-[20%] right-1/4 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[140px] pointer-events-none -z-10"></div>
      
      {/* Navigation */}
      <nav className="border-b border-gray-800/80 bg-gray-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/20">
              <Compass className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-green-500 bg-clip-text text-transparent">
              Trekker
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.push("/sign-in")}
              className="text-gray-300 hover:text-white hover:bg-gray-800/50"
            >
              Sign In
            </Button>
            <Button
              onClick={() => router.push("/sign-up")}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium shadow-md shadow-green-500/10 px-5"
            >
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Header */}
      <header className="container mx-auto px-4 pt-16 pb-12 max-w-6xl text-center">
        <Badge className="bg-green-500/15 border border-green-500/30 text-green-400 mb-6 py-1.5 px-3 rounded-full hover:bg-green-500/20 transition-all font-mono font-medium text-xs tracking-wider uppercase">
          ✨ Welcome to the Future of Travel Finance
        </Badge>
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight max-w-4xl mx-auto mb-6 bg-gradient-to-b from-white via-gray-100 to-gray-400 bg-clip-text text-transparent">
          Group Trips. <span className="bg-gradient-to-r from-green-400 to-green-500 bg-clip-text text-transparent">Smart Splits.</span> No Math.
        </h1>
        <p className="text-gray-400 text-base sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          Trekker automatically scans your UPI payment screenshots, takes speech dictations, and settles group debts instantly. Let AI do the hard math while you enjoy your journey.
        </p>
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
          <Button
            size="lg"
            onClick={() => router.push("/sign-up")}
            className="w-full sm:w-auto bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-8 py-6 text-lg font-semibold shadow-lg shadow-green-500/15 rounded-xl group transition-all"
          >
            Create Your First Trip
            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
          <a href="#demo-sandbox" className="w-full sm:w-auto">
            <Button
              size="lg"
              variant="outline"
              className="w-full border-gray-700 hover:border-gray-500 hover:bg-gray-800/40 text-gray-300 px-8 py-6 text-lg rounded-xl transition-all"
            >
              Try Live Playground
            </Button>
          </a>
        </div>
      </header>

      {/* Feature Highlighters */}
      <section className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gray-900/60 backdrop-blur-md border-gray-800 shadow-2xl relative overflow-hidden group hover:border-gray-700/60 transition-all duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-bl-full group-hover:bg-green-500/10 transition-all"></div>
            <CardHeader className="pb-4">
              <div className="w-12 h-12 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-center mb-4">
                <Image className="w-6 h-6 text-green-400" />
              </div>
              <CardTitle className="text-white text-xl font-bold">UPI Receipt Scanner</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400 text-sm leading-relaxed">
                Take screenshots of your GPay, PhonePe, or Paytm transactions. Our AI parses the transaction amount, merchant, and date instantly.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/60 backdrop-blur-md border-gray-800 shadow-2xl relative overflow-hidden group hover:border-gray-700/60 transition-all duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full group-hover:bg-blue-500/10 transition-all"></div>
            <CardHeader className="pb-4">
              <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center mb-4">
                <Volume2 className="w-6 h-6 text-blue-400" />
              </div>
              <CardTitle className="text-white text-xl font-bold">Speech dictation Log</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400 text-sm leading-relaxed">
                Too busy exploring? Just dictate the details: *"Chetan paid 500 for dinner"*. AI interprets the language and updates the list instantly.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/60 backdrop-blur-md border-gray-800 shadow-2xl relative overflow-hidden group hover:border-gray-700/60 transition-all duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-bl-full group-hover:bg-purple-500/10 transition-all"></div>
            <CardHeader className="pb-4">
              <div className="w-12 h-12 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-purple-400" />
              </div>
              <CardTitle className="text-white text-xl font-bold">Optimized Debt Settlement</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400 text-sm leading-relaxed">
                Trekker runs transaction-minimization algorithms to group splits efficiently. Settle all travel balances with the minimum number of UPI transfers.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Sandbox Section */}
      <section id="demo-sandbox" className="container mx-auto px-4 py-16 max-w-7xl">
        <div className="text-center mb-12">
          <Badge className="bg-blue-500/15 border border-blue-500/30 text-blue-400 mb-3 py-1 px-2.5 rounded-full font-mono text-xs uppercase">
            ⚡ Interactive Playground
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">Experience the Magic Live</h2>
          <p className="text-gray-400 max-w-xl mx-auto mt-2">
            Try adding items, dictating voice inputs, or running our receipt scanner below. See splits recalculate instantly!
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Side: Ledger & Settlements */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Playground Dashboard Info */}
            <div className="bg-gradient-to-r from-gray-900/90 to-gray-950 border border-gray-800 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-green-400 font-mono">Simulating Trip</span>
                <h3 className="text-2xl font-bold text-white mt-1">Goa Roadtrip 🌊🏖️</h3>
                <p className="text-gray-400 text-sm mt-1">Members: Chetan, Paltu, Aftab, Mahammad</p>
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={runMockOCR}
                  disabled={isScanningOCR || isProcessingSpeech}
                  variant="outline"
                  className="border-gray-700 bg-gray-900/40 text-gray-300 hover:bg-gray-800/80 hover:text-white"
                >
                  <Image className="w-4 h-4 mr-2 text-green-400" />
                  Try OCR Scan
                </Button>
                <Button
                  onClick={runMockSpeech}
                  disabled={isScanningOCR || isProcessingSpeech}
                  variant="outline"
                  className="border-gray-700 bg-gray-900/40 text-gray-300 hover:bg-gray-800/80 hover:text-white"
                >
                  <Volume2 className="w-4 h-4 mr-2 text-blue-400" />
                  Try Speech dictation
                </Button>
                <Button
                  onClick={handleResetSandbox}
                  variant="ghost"
                  className="text-gray-500 hover:text-white hover:bg-gray-800/30"
                  title="Reset Demo"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Simulated OCR/Speech Loader Messages */}
            {(isScanningOCR || isProcessingSpeech) && (
              <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20 p-4 rounded-xl flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-gray-300 text-sm font-medium">{simulationMessage}</span>
                </div>
              </div>
            )}

            {/* Settlement Calculations Screen */}
            <div className="bg-gray-900/50 backdrop-blur-md border border-gray-800/80 rounded-2xl p-6 shadow-2xl">
              <h4 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
                <TrendingUp className="w-5 h-5 text-green-400" />
                Optimized Settlement Balances
              </h4>

              {/* Balances List */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {DEMO_MEMBERS.map((m) => {
                  const bal = balances[m]
                  const avatar = MEMBER_AVATARS[m]
                  return (
                    <div
                      key={m}
                      className={`p-4 rounded-xl border flex flex-col items-center text-center transition-all ${
                        bal > 0.01
                          ? "bg-green-500/5 border-green-500/25"
                          : bal < -0.01
                            ? "bg-red-500/5 border-red-500/25"
                            : "bg-gray-800/30 border-gray-800"
                      }`}
                    >
                      <span className="text-2xl mb-1">{avatar}</span>
                      <span className="text-sm font-semibold text-gray-300">{m}</span>
                      <span
                        className={`text-base font-extrabold mt-1 ${
                          bal > 0.01
                            ? "text-green-400"
                            : bal < -0.01
                              ? "text-red-400"
                              : "text-gray-500"
                        }`}
                      >
                        {bal > 0.01 ? `+₹${Math.round(bal)}` : bal < -0.01 ? `-₹${Math.round(Math.abs(bal))}` : "₹0"}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Direct Transfers settlement solver */}
              <div className="border-t border-gray-800/80 pt-6">
                <h5 className="text-sm font-bold tracking-wider text-gray-400 uppercase mb-4">Transfer Pathways</h5>
                {settlements.length === 0 ? (
                  <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl text-center">
                    <span className="text-green-400 font-medium text-sm">🎉 Everybody is fully settled up! No transfers needed.</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {settlements.map((set, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3.5 bg-gray-800/30 border border-gray-800/60 rounded-xl">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{MEMBER_AVATARS[set.from]}</span>
                          <span className="text-white font-medium">{set.from}</span>
                          <span className="hidden sm:inline-block text-gray-500 text-xs px-2 py-0.5 border border-gray-800 rounded bg-gray-950 font-mono">Debtor</span>
                        </div>

                        <div className="flex flex-col items-center flex-1 px-4">
                          <span className="text-green-400 font-mono font-bold">₹{set.amount}</span>
                          <div className="w-full flex items-center justify-center gap-1">
                            <div className="h-0.5 bg-gradient-to-r from-red-500/30 to-green-500/30 flex-1"></div>
                            <span className="text-gray-400 text-xs">➔</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="hidden sm:inline-block text-gray-500 text-xs px-2 py-0.5 border border-gray-800 rounded bg-gray-950 font-mono">Creditor</span>
                          <span className="text-white font-medium">{set.to}</span>
                          <span className="text-lg">{MEMBER_AVATARS[set.to]}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sandbox Ledger */}
            <div className="bg-gray-900/50 backdrop-blur-md border border-gray-800/80 rounded-2xl p-6 shadow-2xl">
              <h4 className="text-lg font-bold text-white mb-6 flex items-center justify-between">
                <span>Trip Expenses Ledger</span>
                <span className="text-xs text-gray-500 bg-gray-950 border border-gray-800 px-2 py-1 rounded">
                  {expenses.length} records
                </span>
              </h4>

              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {expenses.map((exp) => (
                  <div key={exp.id} className="flex items-center justify-between p-4 bg-gray-800/20 border border-gray-800/50 rounded-xl hover:bg-gray-850/30 hover:border-gray-750 transition-all group">
                    <div className="space-y-1">
                      <p className="text-white font-semibold text-sm sm:text-base">{exp.description}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-2">
                        <span>Paid by: <span className="font-semibold text-gray-300">{exp.paidBy}</span></span>
                        <span>•</span>
                        <span>Split equally</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-base sm:text-lg font-bold text-white">₹{exp.amount}</span>
                      <Button
                        onClick={() => handleRemoveExpense(exp.id)}
                        variant="ghost"
                        size="sm"
                        className="text-gray-500 hover:text-red-400 hover:bg-red-500/10 h-8 w-8 p-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right Side: Add Simulated Expense */}
          <div className="lg:col-span-4">
            <Card className="bg-gray-900/80 backdrop-blur-md border-gray-800 shadow-2xl sticky top-24">
              <CardHeader>
                <CardTitle className="text-white text-lg font-bold">Add Simulated Expense</CardTitle>
                <CardDescription className="text-gray-400">Add an expense to recalculate sandbox splits.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddExpense} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-gray-300 text-sm">Description</Label>
                    <Input
                      id="description"
                      type="text"
                      placeholder="e.g. Scuba Diving 🤿"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="bg-gray-800/50 border-gray-700 text-white focus:border-green-500 placeholder:text-gray-500"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount" className="text-gray-300 text-sm">Amount (₹)</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                      <Input
                        id="amount"
                        type="number"
                        placeholder="e.g. 5000"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="pl-9 bg-gray-800/50 border-gray-700 text-white focus:border-green-500 placeholder:text-gray-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paidBy" className="text-gray-300 text-sm">Paid By</Label>
                    <select
                      id="paidBy"
                      value={paidBy}
                      onChange={(e) => setPaidBy(e.target.value)}
                      className="w-full p-2.5 rounded-md bg-gray-800/50 border border-gray-700 text-white focus:border-green-500 text-sm"
                    >
                      {DEMO_MEMBERS.map((m) => (
                        <option key={m} value={m}>
                          {MEMBER_AVATARS[m]} {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold shadow-md py-5 rounded-lg transition-all"
                  >
                    Add to Demo Ledger
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

        </div>
      </section>

      {/* Try in Production Banner */}
      <section className="container mx-auto px-4 py-16 max-w-5xl text-center">
        <div className="bg-gradient-to-r from-green-500/10 via-emerald-500/5 to-transparent border border-green-500/20 p-8 sm:p-12 rounded-3xl relative overflow-hidden shadow-2xl">
          <div className="absolute -top-16 -right-16 w-36 h-36 bg-green-500/10 rounded-full blur-2xl"></div>
          
          <Badge className="bg-green-500/20 text-green-400 border border-green-500/40 mb-4 py-1 px-2 text-xs uppercase font-mono">
            🌍 Settle up with real friends
          </Badge>
          
          <h3 className="text-2xl sm:text-4xl font-extrabold text-white mb-4">
            Done Playing? Settle Real Trips Now.
          </h3>
          <p className="text-gray-400 max-w-xl mx-auto mb-8 text-sm sm:text-base leading-relaxed">
            Create real trips, invite your travel buddies, upload real UPI screenshots, and settle your expenses with direct payment links.
          </p>

          <Button
            size="lg"
            onClick={() => router.push("/sign-up")}
            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold px-8 py-5 shadow-lg shadow-green-500/20 rounded-xl"
          >
            Create Your Account
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800/60 bg-gray-950/80 py-8">
        <div className="container mx-auto px-4 max-w-7xl flex flex-col sm:flex-row items-center justify-between text-gray-500 text-sm gap-4">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-green-500" />
            <span className="font-semibold text-gray-400">Trekker Expense Tracker</span>
          </div>
          <div>
            © {new Date().getFullYear()} Trekker. Let AI handle the travel math.
          </div>
        </div>
      </footer>

    </div>
  )
}
