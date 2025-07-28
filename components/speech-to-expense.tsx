"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Mic, MicOff, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react"
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

interface SpeechToExpenseProps {
  onBack: () => void
  onExpenseLogged: (data: ExpenseData) => void
}

export default function SpeechToExpense({ onBack, onExpenseLogged }: SpeechToExpenseProps) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [extractedData, setExtractedData] = useState<any>(null)
  const [formData, setFormData] = useState({
    amount: "",
    merchantName: "",
    transactionId: "",
    paymentMethod: "",
    category: "Food & Dining",
    description: "",
    notes: "",
  })

  const recognitionRef = useRef<any>(null)
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

  useEffect(() => {
    // Check if speech recognition is supported
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = true
        recognitionRef.current.interimResults = true
        recognitionRef.current.lang = "en-IN" // Indian English

        recognitionRef.current.onresult = (event: any) => {
          let finalTranscript = ""
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript
            }
          }
          if (finalTranscript) {
            setTranscript((prev) => prev + " " + finalTranscript)
          }
        }

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error)
          toast({
            title: "Speech Recognition Error",
            description: "Please check your microphone permissions and try again.",
            variant: "destructive",
          })
          setIsListening(false)
        }

        recognitionRef.current.onend = () => {
          setIsListening(false)
        }
      } else {
        toast({
          title: "Speech Recognition Not Supported",
          description: "Your browser doesn't support speech recognition.",
          variant: "destructive",
        })
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [toast])

  const startListening = () => {
    if (recognitionRef.current) {
      setTranscript("")
      setIsListening(true)
      recognitionRef.current.start()
      toast({
        title: "Listening...",
        description: "Speak your expense details now",
      })
    }
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
      if (transcript.trim()) {
        processSpeechData(transcript)
      }
    }
  }

  const processSpeechData = async (speechText: string) => {
    setIsProcessing(true)
    try {
      console.log("🎤 Processing speech:", speechText)

      const response = await fetch("/api/expenses/speech-process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transcript: speechText,
        }),
      })

      if (!response.ok) {
        throw new Error("Speech processing failed")
      }

      const result = await response.json()
      console.log("✅ Speech processing result:", result)

      setExtractedData(result)

      if (result.success) {
        // Auto-fill form with extracted data
        setFormData((prev) => ({
          ...prev,
          amount: result.amount?.toString() || prev.amount,
          merchantName: result.merchantName || prev.merchantName,
          paymentMethod: result.paymentMethod || prev.paymentMethod,
          category: result.category || prev.category,
          description: result.description || speechText,
          notes: result.notes || prev.notes,
        }))

        toast({
          title: "Speech Processed",
          description: `Extracted expense details with ${Math.round((result.confidence || 0) * 100)}% confidence`,
        })
      } else {
        toast({
          title: "Processing Complete",
          description: "Please verify and complete the expense details",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Speech processing error:", error)
      toast({
        title: "Processing Error",
        description: "Failed to process speech. Please enter details manually.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

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

    const expenseData: ExpenseData = {
      amount: Number.parseFloat(formData.amount),
      description: formData.description || `Payment to ${formData.merchantName}`,
      merchantName: formData.merchantName,
      transactionId: formData.transactionId || `VOICE${Date.now()}`,
      paymentMethod: formData.paymentMethod || "Cash",
      category: formData.category,
      notes: formData.notes,
    }

    onExpenseLogged(expenseData)
  }

  const clearTranscript = () => {
    setTranscript("")
    setExtractedData(null)
  }

  return (
    <div className="space-y-4 text-white">
      {/* Speech Input Section */}
      <div className="space-y-4">
        <div className="text-center">
          <Button
            size="lg"
            className={`w-32 h-32 rounded-full ${
              isListening ? "bg-red-500 hover:bg-red-600 animate-pulse" : "bg-green-600 hover:bg-green-700"
            }`}
            onClick={isListening ? stopListening : startListening}
            disabled={isProcessing}
          >
            {isListening ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
          </Button>
          <p className="text-sm text-gray-300 mt-2">
            {isListening ? "Listening... Tap to stop" : "Tap to start recording"}
          </p>
        </div>

        {/* Example phrases */}
        <div className="bg-gray-700/50 p-3 rounded-lg border border-gray-600">
          <h4 className="font-semibold text-sm text-gray-300 mb-2">Example phrases:</h4>
          <ul className="text-xs text-gray-400 space-y-1">
            <li>• "I paid 500 rupees to McDonald's using Google Pay"</li>
            <li>• "Spent 250 on fuel at HP petrol pump"</li>
            <li>• "Food expense of 180 at Cafe Coffee Day"</li>
          </ul>
        </div>

        {/* Transcript Display */}
        {transcript && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-gray-300">Transcript:</Label>
              <Button variant="ghost" size="sm" onClick={clearTranscript} className="text-gray-400 hover:text-white">
                Clear
              </Button>
            </div>
            <div className="bg-gray-700/50 p-3 rounded-lg border border-gray-600">
              <p className="text-sm text-white">{transcript}</p>
            </div>
          </div>
        )}

        {/* Processing Status */}
        {isProcessing && (
          <div className="flex items-center justify-center space-x-2 py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-400"></div>
            <span className="text-sm text-green-400">Processing speech...</span>
          </div>
        )}

        {/* Extracted Data Display */}
        {extractedData && (
          <div className="bg-green-900/30 p-3 rounded-lg border border-green-700/50">
            <div className="flex items-center space-x-2 mb-2">
              {extractedData.success ? (
                <CheckCircle className="h-4 w-4 text-green-400" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-400" />
              )}
              <h4 className="font-semibold text-sm text-green-400">Extracted from Speech</h4>
            </div>
            <div className="text-xs text-green-300 space-y-1">
              {extractedData.amount && <div>Amount: ₹{extractedData.amount}</div>}
              {extractedData.merchantName && <div>Merchant: {extractedData.merchantName}</div>}
              {extractedData.paymentMethod && <div>Method: {extractedData.paymentMethod}</div>}
              {extractedData.category && <div>Category: {extractedData.category}</div>}
              <div>Confidence: {Math.round((extractedData.confidence || 0) * 100)}%</div>
            </div>
          </div>
        )}
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
            placeholder="e.g., McDonald's, Cafe Coffee Day"
            value={formData.merchantName}
            onChange={(e) => setFormData((prev) => ({ ...prev, merchantName: e.target.value }))}
            required
            className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
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
            placeholder="Additional notes about this expense"
            value={formData.notes}
            onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
            rows={2}
            className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400"
          />
        </div>
      </div>

      {/* Submit Button */}
      <Button
        onClick={handleSubmit}
        className="w-full bg-green-600 hover:bg-green-700 text-white"
        disabled={isProcessing || !formData.amount || !formData.merchantName}
      >
        <CheckCircle className="h-4 w-4 mr-2" />
        Add Expense
      </Button>
    </div>
  )
}
