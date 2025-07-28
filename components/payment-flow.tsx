"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, ExternalLink, Smartphone, CheckCircle } from "lucide-react"
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

interface PaymentFlowProps {
  upiData?: UPIData
  onBack: () => void
  onPaymentComplete: (data: PaymentData) => void
}

export default function PaymentFlow({ upiData, onBack, onPaymentComplete }: PaymentFlowProps) {
  const [customAmount, setCustomAmount] = useState(upiData?.amount?.toString() || "")
  const [selectedApp, setSelectedApp] = useState<string>("")
  const [isProcessing, setIsProcessing] = useState(false)
  const { toast } = useToast()

  const paymentApps = [
    {
      id: "googlepay",
      name: "Google Pay",
      scheme: "tez://upi/pay",
      fallback: "https://pay.google.com/",
      color: "bg-blue-500",
    },
    {
      id: "phonepe",
      name: "PhonePe",
      scheme: "phonepe://pay",
      fallback: "https://www.phonepe.com/",
      color: "bg-purple-500",
    },
    {
      id: "paytm",
      name: "Paytm",
      scheme: "paytmmp://pay",
      fallback: "https://paytm.com/",
      color: "bg-blue-600",
    },
    {
      id: "bhim",
      name: "BHIM UPI",
      scheme: "bhim://pay",
      fallback: "https://www.npci.org.in/product-overview/bhim-app",
      color: "bg-orange-500",
    },
  ]

  const suggestedAmounts = [50, 100, 200, 500, 1000]

  const handlePayment = async (app: any) => {
    if (!customAmount || Number.parseFloat(customAmount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    setSelectedApp(app.id)

    try {
      const amount = Number.parseFloat(customAmount)
      const transactionRef = upiData?.transactionRef || `TXN${Date.now()}`

      // Build UPI payment URL
      const upiParams = new URLSearchParams({
        pa: upiData?.merchantId || "merchant@upi",
        pn: upiData?.merchantName || "Merchant",
        am: amount.toString(),
        cu: upiData?.currency || "INR",
        tr: transactionRef,
      })

      const upiUrl = `upi://pay?${upiParams.toString()}`
      const appUrl = `${app.scheme}?${upiParams.toString()}`

      console.log("🚀 Opening payment app:", app.name)
      console.log("📱 UPI URL:", upiUrl)

      // Try to open the specific app first
      const openApp = () => {
        // Create a hidden link and click it
        const link = document.createElement("a")
        link.href = appUrl
        link.style.display = "none"
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        // Fallback to generic UPI after a delay
        setTimeout(() => {
          const genericLink = document.createElement("a")
          genericLink.href = upiUrl
          genericLink.style.display = "none"
          document.body.appendChild(genericLink)
          genericLink.click()
          document.body.removeChild(genericLink)
        }, 1000)
      }

      openApp()

      // Show success message and proceed
      setTimeout(() => {
        toast({
          title: "Payment App Opened",
          description: `${app.name} should open now. Complete your payment and return here.`,
        })

        // Simulate payment completion after user returns
        const paymentData: PaymentData = {
          amount,
          merchantName: upiData?.merchantName || "Merchant",
          merchantId: upiData?.merchantId || "merchant@upi",
          transactionRef,
          paymentMethod: app.name,
        }

        // Auto-proceed after 3 seconds (user would manually proceed in real app)
        setTimeout(() => {
          onPaymentComplete(paymentData)
        }, 3000)
      }, 1000)
    } catch (error) {
      console.error("Payment error:", error)
      toast({
        title: "Payment Error",
        description: "Failed to open payment app. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleManualComplete = () => {
    if (!customAmount || Number.parseFloat(customAmount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      })
      return
    }

    const amount = Number.parseFloat(customAmount)
    const transactionRef = upiData?.transactionRef || `TXN${Date.now()}`

    const paymentData: PaymentData = {
      amount,
      merchantName: upiData?.merchantName || "Merchant",
      merchantId: upiData?.merchantId || "merchant@upi",
      transactionRef,
      paymentMethod: "UPI",
    }

    onPaymentComplete(paymentData)
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Complete Payment</CardTitle>
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Merchant Info */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-lg">{upiData?.merchantName || "Merchant"}</h3>
          <p className="text-sm text-gray-600">{upiData?.merchantId || "merchant@upi"}</p>
        </div>

        {/* Amount Selection */}
        <div className="space-y-3">
          <Label htmlFor="amount">Payment Amount (₹)</Label>
          <Input
            id="amount"
            type="number"
            placeholder="Enter amount"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            className="text-lg font-semibold"
          />

          {/* Suggested Amounts */}
          <div className="flex flex-wrap gap-2">
            {suggestedAmounts.map((amount) => (
              <Button
                key={amount}
                variant="outline"
                size="sm"
                onClick={() => setCustomAmount(amount.toString())}
                className="text-xs"
              >
                ₹{amount}
              </Button>
            ))}
          </div>
        </div>

        {/* Payment Apps */}
        <div className="space-y-3">
          <Label>Choose Payment App</Label>
          <div className="grid grid-cols-2 gap-3">
            {paymentApps.map((app) => (
              <Button
                key={app.id}
                variant="outline"
                className={`h-16 flex-col space-y-2 ${
                  selectedApp === app.id ? "border-blue-500 bg-blue-50" : ""
                } ${isProcessing && selectedApp === app.id ? "opacity-50" : ""}`}
                onClick={() => handlePayment(app)}
                disabled={isProcessing}
              >
                <div className={`w-8 h-8 rounded-full ${app.color} flex items-center justify-center`}>
                  <Smartphone className="h-4 w-4 text-white" />
                </div>
                <span className="text-xs font-medium">{app.name}</span>
                {isProcessing && selectedApp === app.id && <div className="text-xs text-blue-600">Opening...</div>}
              </Button>
            ))}
          </div>
        </div>

        {/* Generic UPI Option */}
        <div className="border-t pt-4">
          <Button variant="outline" className="w-full bg-transparent" onClick={handleManualComplete}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Use Any UPI App
          </Button>
          <p className="text-xs text-gray-500 text-center mt-2">Opens your default UPI app or browser</p>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-start space-x-2">
            <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Payment Instructions:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Click on your preferred payment app</li>
                <li>Complete the payment in the app</li>
                <li>Return here and upload payment screenshot</li>
                <li>We'll extract details automatically</li>
              </ol>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
