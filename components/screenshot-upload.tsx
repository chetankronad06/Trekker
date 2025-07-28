"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Upload, ImageIcon, X, ArrowLeft, Loader2, CheckCircle, Camera } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

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
  screenshotUrl?: string
  ocrData?: any
}

interface ScreenshotUploadProps {
  paymentData?: PaymentData
  onBack: () => void
  onExpenseLogged: (data: ExpenseData) => void
  mode: "after-payment" | "standalone"
}

export default function ScreenshotUpload({ paymentData, onBack, onExpenseLogged, mode }: ScreenshotUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [extractedData, setExtractedData] = useState<any>(null)

  // Form fields
  const [amount, setAmount] = useState(paymentData?.amount?.toString() || "")
  const [merchantName, setMerchantName] = useState(paymentData?.merchantName || "")
  const [transactionId, setTransactionId] = useState(paymentData?.transactionRef || "")
  const [paymentMethod, setPaymentMethod] = useState(paymentData?.paymentMethod || "")
  const [description, setDescription] = useState("")

  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid File Type",
          description: "Please select an image file",
          variant: "destructive",
        })
        return
      }

      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please select an image smaller than 10MB",
          variant: "destructive",
        })
        return
      }

      setSelectedFile(file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)

      toast({
        title: "Screenshot Selected",
        description: "Ready to process",
      })
    }
  }

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    const file = event.dataTransfer.files[0]
    if (file) {
      const fakeEvent = {
        target: { files: [file] },
      } as React.ChangeEvent<HTMLInputElement>
      handleFileSelect(fakeEvent)
    }
  }

  const uploadAndProcess = async () => {
    if (!selectedFile) {
      toast({
        title: "No Screenshot",
        description: "Please select a screenshot first",
        variant: "destructive",
      })
      return
    }

    try {
      setIsUploading(true)

      // Upload file
      const formData = new FormData()
      formData.append("file", selectedFile)

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!uploadResponse.ok) {
        throw new Error("Upload failed")
      }

      const uploadResult = await uploadResponse.json()
      setIsUploading(false)
      setIsProcessing(true)

      // Process with OCR
      const ocrResponse = await fetch("/api/expenses/ocr-process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl: uploadResult.url,
        }),
      })

      if (ocrResponse.ok) {
        const ocrResult = await ocrResponse.json()
        setExtractedData(ocrResult)

        // Auto-fill fields if not already filled
        if (ocrResult.amount && !amount) {
          setAmount(ocrResult.amount.toString())
        }
        if (ocrResult.transactionId && !transactionId) {
          setTransactionId(ocrResult.transactionId)
        }
        if (ocrResult.merchantName && !merchantName) {
          setMerchantName(ocrResult.merchantName)
        }
        if (ocrResult.paymentMethod && !paymentMethod) {
          setPaymentMethod(ocrResult.paymentMethod)
        }

        toast({
          title: "OCR Processing Complete",
          description: `Extracted data with ${Math.round((ocrResult.confidence || 0.8) * 100)}% confidence`,
        })
      }

      setIsProcessing(false)
    } catch (error) {
      setIsUploading(false)
      setIsProcessing(false)

      toast({
        title: "Processing Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      })
    }
  }

  const handleSubmit = () => {
    if (!amount || Number.parseFloat(amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      })
      return
    }

    if (!merchantName.trim()) {
      toast({
        title: "Merchant Name Required",
        description: "Please enter the merchant name",
        variant: "destructive",
      })
      return
    }

    const expenseData: ExpenseData = {
      amount: Number.parseFloat(amount),
      description: description || `Payment to ${merchantName}`,
      merchantName: merchantName.trim(),
      transactionId: transactionId || `TXN${Date.now()}`,
      paymentMethod: paymentMethod || "UPI",
      screenshotUrl: previewUrl || undefined,
      ocrData: extractedData,
    }

    onExpenseLogged(expenseData)
  }

  const removeFile = () => {
    setSelectedFile(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    setExtractedData(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {mode === "after-payment" ? "Upload Payment Screenshot" : "Add Expense"}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Payment Info (if available) */}
        {paymentData && (
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-green-800">Payment Initiated</h4>
              <Badge variant="secondary">{paymentData.paymentMethod}</Badge>
            </div>
            <div className="text-sm text-green-700 space-y-1">
              <div>Amount: ₹{paymentData.amount}</div>
              <div>Merchant: {paymentData.merchantName}</div>
              <div>Ref: {paymentData.transactionRef}</div>
            </div>
          </div>
        )}

        {/* File Upload */}
        {!selectedFile ? (
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-sm text-gray-600 mb-2">Upload your payment screenshot</p>
            <p className="text-xs text-gray-500 mb-4">Drag & drop or click to browse</p>
            <Button variant="outline" size="sm">
              <ImageIcon className="h-4 w-4 mr-2" />
              Select Screenshot
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <img
                src={previewUrl || ""}
                alt="Payment screenshot"
                className="w-full h-48 object-cover rounded-lg border"
              />
              <Button variant="destructive" size="sm" className="absolute top-2 right-2" onClick={removeFile}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {!extractedData && (
              <Button onClick={uploadAndProcess} disabled={isUploading || isProcessing} className="w-full">
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Process Screenshot
                  </>
                )}
              </Button>
            )}
          </div>
        )}

        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

        {/* Extracted Data Display */}
        {extractedData && (
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              <h4 className="font-semibold text-blue-800">Data Extracted</h4>
            </div>
            <div className="text-xs text-blue-700 space-y-1">
              {extractedData.amount && <div>Amount: ₹{extractedData.amount}</div>}
              {extractedData.transactionId && <div>Transaction ID: {extractedData.transactionId}</div>}
              {extractedData.merchantName && <div>Merchant: {extractedData.merchantName}</div>}
              {extractedData.paymentMethod && <div>Method: {extractedData.paymentMethod}</div>}
            </div>
          </div>
        )}

        {/* Manual Input Fields */}
        <div className="space-y-3">
          <div>
            <Label htmlFor="amount">Amount (₹) *</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="merchant">Merchant Name *</Label>
            <Input
              id="merchant"
              placeholder="Enter merchant name"
              value={merchantName}
              onChange={(e) => setMerchantName(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="transactionId">Transaction ID</Label>
            <Input
              id="transactionId"
              placeholder="Enter transaction ID"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="paymentMethod">Payment Method</Label>
            <Input
              id="paymentMethod"
              placeholder="e.g., Google Pay, PhonePe"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Add notes about this expense..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        {/* Submit Button */}
        <Button onClick={handleSubmit} className="w-full" size="lg" disabled={!amount || !merchantName.trim()}>
          <CheckCircle className="h-4 w-4 mr-2" />
          Log Expense
        </Button>

        {/* Instructions */}
        <div className="bg-yellow-50 p-3 rounded-lg">
          <h4 className="font-semibold text-sm text-yellow-800 mb-1">Tips:</h4>
          <ul className="text-xs text-yellow-700 space-y-1">
            <li>• Upload a clear screenshot of payment confirmation</li>
            <li>• Ensure amount and transaction details are visible</li>
            <li>• Review auto-filled data before submitting</li>
            {mode === "after-payment" && <li>• Screenshot helps verify the payment was completed</li>}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
