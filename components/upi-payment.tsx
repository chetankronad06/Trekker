"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Smartphone, ExternalLink, ArrowLeft } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface UPIPaymentProps {
  upiData: {
    merchantId: string
    merchantName: string
    amount?: number
    transactionRef?: string
    currency: string
  }
  onPaymentComplete: () => void
  onBack: () => void
}

export default function UPIPayment({ upiData, onPaymentComplete, onBack }: UPIPaymentProps) {
  const [customAmount, setCustomAmount] = useState(upiData.amount?.toString() || "")
  const [selectedApp, setSelectedApp] = useState<string | null>(null)
  const { toast } = useToast()

  const upiApps = [
    {
      name: "Google Pay",
      id: "googlepay",
      scheme: "tez://upi/pay",
      fallback: "https://pay.google.com/about/",
      color: "bg-blue-600",
    },
    {
      name: "PhonePe",
      id: "phonepe",
      scheme: "phonepe://pay",
      fallback: "https://www.phonepe.com/",
      color: "bg-purple-600",
    },
    {
      name: "Paytm",
      id: "paytm",
      scheme: "paytmmp://pay",
      fallback: "https://paytm.com/",
      color: "bg-blue-500",
    },
    {
      name: "BHIM",
      id: "bhim",
      scheme: "bhim://pay",
      fallback: "https://www.npci.org.in/product-overview/bhim-app",
      color: "bg-orange-600",
    },
  ]

  const generateUPILink = (app: (typeof upiApps)[0]) => {
    const amount = customAmount || upiData.amount
    const params = new URLSearchParams({
      pa: upiData.merchantId,
      pn: upiData.merchantName,
      cu: upiData.currency,
    })

    if (amount) {
      params.set("am", amount.toString())
    }

    if (upiData.transactionRef) {
      params.set("tr", upiData.transactionRef)
    }

    return `${app.scheme}?${params.toString()}`
  }

  const generateGenericUPILink = () => {
    const amount = customAmount || upiData.amount
    const params = new URLSearchParams({
      pa: upiData.merchantId,
      pn: upiData.merchantName,
      cu: upiData.currency,
    })

    if (amount) {
      params.set("am", amount.toString())
    }

    if (upiData.transactionRef) {
      params.set("tr", upiData.transactionRef)
    }

    return `upi://pay?${params.toString()}`
  }

  const handlePayment = (app: (typeof upiApps)[0]) => {
    setSelectedApp(app.id)
    const upiLink = generateUPILink(app)

    toast({
      title: `Opening ${app.name}`,
      description: "Redirecting to payment app...",
    })

    // Try to open the UPI app
    window.location.href = upiLink

    // Set a timeout to show completion button
    setTimeout(() => {
      toast({
        title: "Payment in Progress",
        description: "Complete the payment in your UPI app, then return here to upload screenshot",
      })
    }, 2000)
  }

  const handleGenericPayment = () => {
    const upiLink = generateGenericUPILink()

    toast({
      title: "Opening UPI App",
      description: "Choose your preferred UPI app...",
    })

    window.location.href = upiLink

    setTimeout(() => {
      toast({
        title: "Payment in Progress",
        description: "Complete the payment in your UPI app, then return here to upload screenshot",
      })
    }, 2000)
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Complete Payment</CardTitle>
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Payment Details */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-sm text-gray-700 mb-2">Payment Details</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Merchant:</span>
              <span className="font-medium">{upiData.merchantName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">UPI ID:</span>
              <span className="font-mono text-xs">{upiData.merchantId}</span>
            </div>
            {upiData.transactionRef && (
              <div className="flex justify-between">
                <span className="text-gray-600">Ref:</span>
                <span className="font-mono text-xs">{upiData.transactionRef}</span>
              </div>
            )}
          </div>
        </div>

        {/* Amount Input */}
        <div>
          <Label htmlFor="amount">Amount (₹)</Label>
          <Input
            id="amount"
            type="number"
            placeholder="Enter amount"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            className="text-lg font-semibold"
          />
          {upiData.amount && <p className="text-xs text-gray-500 mt-1">Suggested amount: ₹{upiData.amount}</p>}
        </div>

        {/* UPI Apps */}
        <div>
          <h3 className="font-semibold text-sm text-gray-700 mb-3">Choose Payment App</h3>
          <div className="grid grid-cols-2 gap-2">
            {upiApps.map((app) => (
              <Button
                key={app.id}
                variant="outline"
                className={`h-16 flex flex-col items-center justify-center space-y-1 ${
                  selectedApp === app.id ? app.color + " text-white" : ""
                }`}
                onClick={() => handlePayment(app)}
              >
                <Smartphone className="h-5 w-5" />
                <span className="text-xs font-medium">{app.name}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Generic UPI Button */}
        <Button variant="outline" className="w-full bg-transparent" onClick={handleGenericPayment}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Open with Any UPI App
        </Button>

        {/* Instructions */}
        <div className="bg-blue-50 p-3 rounded-lg">
          <h4 className="font-semibold text-sm text-blue-800 mb-1">Instructions:</h4>
          <ol className="text-xs text-blue-700 space-y-1">
            <li>1. Click on your preferred UPI app above</li>
            <li>2. Complete the payment in the app</li>
            <li>3. Take a screenshot of the payment confirmation</li>
            <li>4. Return here to upload the screenshot</li>
          </ol>
        </div>

        {/* Payment Complete Button */}
        <Button onClick={onPaymentComplete} className="w-full" size="lg">
          I've Completed Payment - Upload Screenshot
        </Button>
      </CardContent>
    </Card>
  )
}
