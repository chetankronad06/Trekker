"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { QrCode, Upload, Mic, Edit, Sparkles } from "lucide-react"
import QRScanner from "./qr-scanner"
import PaymentFlow from "./payment-flow"
import ScreenshotOCR from "./screenshot-ocr"
import SpeechToExpense from "./speech-to-expense"
import ManualExpenseEntry from "./manual-expense-entry"
import { useToast } from "@/hooks/use-toast"

interface UPIData {
  merchantId: string
  merchantName: string
  amount?: number
  transactionRef?: string
  currency: string
}

interface PaymentData {
  amount: number
  merchantName: string
  merchantId: string
  transactionRef: string
  paymentMethod: string
}

interface ExpenseData {
  amount: number
  description: string
  merchantName: string
  transactionId: string
  paymentMethod: string
  category?: string
  notes?: string
}

interface ExpenseTrackerProps {
  tripId: string
  onExpenseAdded?: (expense: ExpenseData) => void
}

type FlowStep =
  | "main-menu"
  | "qr-scanning"
  | "payment-flow"
  | "screenshot-upload"
  | "speech-input"
  | "manual-entry"
  | "screenshot-ocr"

export default function ExpenseTracker({ tripId, onExpenseAdded }: ExpenseTrackerProps) {
  const [currentStep, setCurrentStep] = useState<FlowStep>("main-menu")
  const [scannedUPIData, setScannedUPIData] = useState<UPIData | null>(null)
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { toast } = useToast()

  const handleQRScanSuccess = (upiData: UPIData) => {
    console.log("🎯 QR Scanned successfully:", upiData)
    setScannedUPIData(upiData)
    setCurrentStep("payment-flow")
    toast({
      title: "QR Code Scanned!",
      description: `Found: ${upiData.merchantName}${upiData.amount ? ` - ₹${upiData.amount}` : ""}`,
    })
  }

  const handlePaymentComplete = (data: PaymentData) => {
    console.log("💳 Payment completed:", data)
    setPaymentData(data)
    setCurrentStep("screenshot-upload")
    toast({
      title: "Payment Initiated",
      description: "Now upload your payment screenshot for verification",
    })
  }

  const handleExpenseLogged = async (expenseData: ExpenseData) => {
    try {
      console.log("💾 Saving expense:", expenseData)
      const response = await fetch(`/api/expenses/${tripId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(expenseData),
      })

      if (!response.ok) {
        throw new Error("Failed to save expense")
      }

      const savedExpense = await response.json()
      toast({
        title: "✨ Expense Added!",
        description: `₹${expenseData.amount} logged for ${expenseData.merchantName}`,
      })

      setCurrentStep("main-menu")
      setScannedUPIData(null)
      setPaymentData(null)
      setIsModalOpen(false)
      onExpenseAdded?.(savedExpense)
    } catch (error) {
      console.error("Error saving expense:", error)
      toast({
        title: "❌ Oops!",
        description: "Failed to save expense. Please try again.",
        variant: "destructive",
      })
    }
  }

  const openModal = (step: FlowStep) => {
    setCurrentStep(step)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setCurrentStep("main-menu")
    setScannedUPIData(null)
    setPaymentData(null)
  }

  const goBack = () => {
    switch (currentStep) {
      case "qr-scanning":
        setCurrentStep("main-menu")
        break
      case "payment-flow":
        setCurrentStep("qr-scanning")
        break
      case "screenshot-upload":
        setCurrentStep("payment-flow")
        break
      case "screenshot-ocr":
      case "speech-input":
      case "manual-entry":
        closeModal() // Close modal and return to main menu
        break
      default:
        closeModal()
    }
  }

  const getModalTitle = () => {
    switch (currentStep) {
      case "qr-scanning":
        return "Scan QR Code"
      case "payment-flow":
        return "Complete Payment"
      case "screenshot-upload":
      case "screenshot-ocr":
        return "Upload Screenshot"
      case "speech-input":
        return "Voice Entry"
      case "manual-entry":
        return "Manual Entry"
      default:
        return "Add Expense"
    }
  }

  const renderModalContent = () => {
    switch (currentStep) {
      case "qr-scanning":
        return <QRScanner onScanSuccess={handleQRScanSuccess} onClose={goBack} />
      case "payment-flow":
        return <PaymentFlow upiData={scannedUPIData} onBack={goBack} onPaymentComplete={handlePaymentComplete} />
      case "screenshot-upload":
        return (
          <ScreenshotOCR
            paymentData={paymentData}
            onBack={goBack}
            onExpenseLogged={handleExpenseLogged}
            mode="after-payment"
          />
        )
      case "screenshot-ocr":
        return <ScreenshotOCR onBack={goBack} onExpenseLogged={handleExpenseLogged} mode="standalone" />
      case "speech-input":
        return <SpeechToExpense onBack={goBack} onExpenseLogged={handleExpenseLogged} />
      case "manual-entry":
        return <ManualExpenseEntry onBack={goBack} onExpenseLogged={handleExpenseLogged} />
      default:
        return null
    }
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header with motivational message */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="h-5 w-5 text-green-400" />
            <h3 className="text-lg font-semibold text-white">Add Your Expense</h3>
            <Sparkles className="h-5 w-5 text-green-400" />
          </div>
          <p className="text-sm text-gray-400">Choose your preferred method to track expenses effortlessly</p>
        </div>

        {/* Compact horizontal layout with dark theme */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Scan & Pay */}
          <Button
            variant="outline"
            className="h-24 flex flex-col items-center justify-center gap-3 bg-gray-800/50 border-gray-600 hover:bg-gray-700/50 text-white hover:scale-105 transition-all duration-200 group"
            onClick={() => openModal("qr-scanning")}
          >
            <QrCode className="h-8 w-8 text-green-400 group-hover:text-green-300 transition-colors" />
            <div className="flex flex-col items-center">
              <span className="text-sm font-medium">Scan & Pay</span>
              <span className="text-sm text-gray-400">Fast</span>
            </div>
          </Button>

          {/* Screenshot */}
          <Button
            variant="outline"
            className="h-24 flex flex-col items-center justify-center gap-3 bg-gray-800/50 border-gray-600 hover:bg-gray-700/50 text-white hover:scale-105 transition-all duration-200 group"
            onClick={() => openModal("screenshot-ocr")}
          >
            <Upload className="h-8 w-8 text-green-400 group-hover:text-green-300 transition-colors" />
            <div className="flex flex-col items-center">
              <span className="text-sm font-medium">Screenshot</span>
              <span className="text-sm text-gray-400">Smart OCR</span>
            </div>
          </Button>

          {/* Voice */}
          <Button
            variant="outline"
            className="h-24 flex flex-col items-center justify-center gap-3 bg-gray-800/50 border-gray-600 hover:bg-gray-700/50 text-white hover:scale-105 transition-all duration-200 group"
            onClick={() => openModal("speech-input")}
          >
            <Mic className="h-8 w-8 text-green-400 group-hover:text-green-300 transition-colors" />
            <div className="flex flex-col items-center">
              <span className="text-sm font-medium">Voice</span>
              <span className="text-sm text-gray-400">Hands-free</span>
            </div>
          </Button>

          {/* Manual */}
          <Button
            variant="outline"
            className="h-24 flex flex-col items-center justify-center gap-3 bg-gray-800/50 border-gray-600 hover:bg-gray-700/50 text-white hover:scale-105 transition-all duration-200 group"
            onClick={() => openModal("manual-entry")}
          >
            <Edit className="h-8 w-8 text-green-400 group-hover:text-green-300 transition-colors" />
            <div className="flex flex-col items-center">
              <span className="text-sm font-medium">Manual</span>
              <span className="text-sm text-gray-400">Detailed</span>
            </div>
          </Button>
        </div>



        {/* Fun tip */}
        <div className="text-center">
          <p className="text-xs text-gray-500 italic">
            💡 Pro tip: Use QR scanning for instant payments and automatic expense logging!
          </p>
        </div>
      </div>

      {/* Modal for expense entry - Fixed height, now scrollable */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-gray-800/95 border-gray-700 text-white max-w-4xl h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b border-gray-700 flex-shrink-0">
            <DialogTitle className="text-white text-lg">{getModalTitle()}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">{renderModalContent()}</div>
        </DialogContent>
      </Dialog>
    </>
  )
}
