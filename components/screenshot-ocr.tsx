"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, Camera, Loader2, CheckCircle, AlertCircle, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { createWorker } from 'tesseract.js';

interface OCRResult {
  amount?: number
  transactionId?: string
  paymentMethod?: string
  merchantName?: string
  timestamp?: string
  success: boolean
  confidence?: number
  rawText?: string
  fallback?: boolean
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

interface ScreenshotOCRProps {
  paymentData?: PaymentData
  onBack: () => void
  onExpenseLogged: (data: ExpenseData) => void
  mode: "after-payment" | "standalone"
}

export default function ScreenshotOCR({ paymentData, onBack, onExpenseLogged, mode }: ScreenshotOCRProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [processingStatus, setProcessingStatus] = useState("")
  const [ocrResult, setOcrResult] = useState<any>(null)
  const [formData, setFormData] = useState({
    amount: paymentData?.amount?.toString() || "",
    merchantName: paymentData?.merchantName || "",
    transactionId: paymentData?.transactionRef || "",
    paymentMethod: paymentData?.paymentMethod || "",
    category: "Food & Dining",
    description: "",
    notes: "",
  })

  const fileInputRef = useRef<HTMLInputElement>(null)
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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid File",
        description: "Please select an image file",
        variant: "destructive",
      })
      return
    }

    // Validate file size (max 3MB for faster processing)
    if (file.size > 3 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 3MB for faster processing",
        variant: "destructive",
      })
      return
    }

    setSelectedFile(file)

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    // Auto-process OCR
    processOCR(file)
  }

function parseUPIText(text: string): Partial<OCRResult> {
  // Normalize text for easier matching
  const upperText = text.toUpperCase();
  const cleanText = text.replace(/[^\w\s₹.,:@-]/g, " ").replace(/\s+/g, " ");

  // -------------------- Amount Extraction --------------------
  let amount: number | undefined;

  // 1. Try to match ₹ or Rs or Amount in lines, prefer lines with "to"/merchant
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);

  // Helper: extract amount from a string
  const extractAmount = (str: string): number | undefined => {
    // ₹12,345.67 or Rs. 12345.67 or Amount: 12345.67
    const match = str.match(/(?:₹|RS\.?|AMOUNT[:\s₹]*)\s*([0-9,]+(?:\.\d{1,2})?)/i);
    if (match) {
      const parsed = parseFloat(match[1].replace(/,/g, ""));
      if (parsed > 0 && parsed < 1000000) return parsed;
    }
    // Fallback: just a number with 3+ digits (avoid phone numbers)
    const match2 = str.match(/([0-9]{3,7}(?:\.\d{1,2})?)/);
    if (match2) {
      const parsed = parseFloat(match2[1].replace(/,/g, ""));
      if (parsed > 0 && parsed < 1000000) return parsed;
    }
    return undefined;
  };

  // 2. Prefer lines with "to", "paid", "merchant", "debited", "credited"
  const likelyAmountLines = lines.filter(line =>
    /(₹|RS\.?|AMOUNT|PAID|DEBITED|CREDITED|TO|MERCHANT)/i.test(line)
  );
  for (const line of likelyAmountLines) {
    const amt = extractAmount(line);
    if (amt) {
      amount = amt;
      break;
    }
  }

  // 3. Fallback: global search for ₹ or Rs
  if (!amount) {
    const match = cleanText.match(/(?:₹|RS\.?)\s*([0-9,]+(?:\.\d{1,2})?)/i);
    if (match) {
      const parsed = parseFloat(match[1].replace(/,/g, ""));
      if (parsed > 0 && parsed < 1000000) amount = parsed;
    }
  }

  // 4. Fallback: look for "debited"/"credited" lines with numbers
  if (!amount) {
    const debitLine = lines.find(line => /(debited|credited)/i.test(line) && /\d/.test(line));
    if (debitLine) {
      const amt = extractAmount(debitLine);
      if (amt) amount = amt;
    }
  }

  // 5. Fallback: any line with a ₹ or Rs and a number
  if (!amount) {
    for (const line of lines) {
      const amt = extractAmount(line);
      if (amt) {
        amount = amt;
        break;
      }
    }
  }

  // -------------------- Transaction ID --------------------
  let transactionId: string | undefined;
  // Only match Transaction ID and UPI Transaction ID
  const txnLines = lines.filter(line =>
    /(TRANSACTION ID|UPI TRANSACTION ID)/i.test(line)
  );
  for (const line of txnLines) {
    // Match patterns like "Transaction ID: ABC123456789", "UPI Transaction ID: 1234567890ABC"
    let match = line.match(/(?:TRANSACTION ID|UPI TRANSACTION ID)[:\s\-]*([A-Z0-9]{8,})/i);
    if (match && match[1].length >= 8) {
      transactionId = match[1].trim();
      break;
    }
    // Fallback: any long alphanumeric string at end of line
    match = line.match(/([A-Z0-9]{8,})$/i);
    if (match && match[1].length >= 8) {
      transactionId = match[1].trim();
      break;
    }
  }
  // Fallback: global search in text for Transaction ID or UPI Transaction ID
  if (!transactionId) {
    let match = upperText.match(/(?:TRANSACTION ID|UPI TRANSACTION ID)[:\s\-]*([A-Z0-9]{8,})/i);
    if (match) transactionId = match[1].trim();
  }

  // -------------------- Payment Method --------------------
  let paymentMethod: string | undefined;
  if (/GOOGLE PAY|G PAY/i.test(text)) paymentMethod = "Google Pay";
  else if (/PHONEPE|PHONE PE/i.test(text)) paymentMethod = "PhonePe";
  else if (/PAYTM/i.test(text)) paymentMethod = "Paytm";
  else if (/BHIM/i.test(text)) paymentMethod = "BHIM UPI";
  else if (/UPI/i.test(text)) paymentMethod = "UPI";
  else if (/CASH/i.test(text)) paymentMethod = "Cash";
  else if (/CARD/i.test(text)) paymentMethod = "Card";

  // -------------------- Merchant / Receiver Name --------------------
  let merchantName: string | undefined;
  // 1. "Paid to: NAME"
  let match = upperText.match(/PAID TO[:\s]*([A-Z0-9 &.'\-]{3,50})/i);
  if (match) merchantName = match[1].trim();
  // 2. "To: NAME"
  if (!merchantName) {
    match = upperText.match(/TO[:\s]*([A-Z0-9 &.'\-]{3,50})/i);
    if (match) merchantName = match[1].trim();
  }
  // 3. "Merchant: NAME"
  if (!merchantName) {
    match = upperText.match(/MERCHANT[:\s]*([A-Z0-9 &.'\-]{3,50})/i);
    if (match) merchantName = match[1].trim();
  }
  // 4. Name before @upi or @ybl etc.
  if (!merchantName) {
    match = upperText.match(/([A-Z0-9 &.'\-]{3,50})@(?:UPI|YBL|OKICICI|OKHDFC|OKSBI|OKAXIS)/i);
    if (match) merchantName = match[1].trim();
  }
  // 5. Fallback: first line with "to" and a name
  if (!merchantName) {
    const toLine = lines.find(line => /to/i.test(line) && /[a-zA-Z]/.test(line));
    if (toLine) {
      const nameMatch = toLine.match(/to\s+([A-Za-z0-9 &.'\-]{3,50})/i);
      if (nameMatch) merchantName = nameMatch[1].trim();
    }
  }
  // 6. Fallback: look for a line with @upi and take the word before @
  if (!merchantName) {
    const upiLine = lines.find(line => /@(?:upi|ybl|okicici|okhdfc|oksbi|okaxis)/i.test(line));
    if (upiLine) {
      const nameMatch = upiLine.match(/([A-Za-z0-9 &.'\-]{3,50})@(?:upi|ybl|okicici|okhdfc|oksbi|okaxis)/i);
      if (nameMatch) merchantName = nameMatch[1].trim();
    }
  }
  // 7. Fallback: look for a line with "by" or "from" (for received payments)
  if (!merchantName) {
    const byLine = lines.find(line => /(by|from)/i.test(line) && /[a-zA-Z]/.test(line));
    if (byLine) {
      const nameMatch = byLine.match(/(?:by|from)\s+([A-Za-z0-9 &.'\-]{3,50})/i);
      if (nameMatch) merchantName = nameMatch[1].trim();
    }
  }

  // -------------------- Timestamp (Date + Time) --------------------
  let timestamp: string | undefined;
  match = text.match(/(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)[^\d]*(\d{1,2}\s+\w+\s+\d{4})/i);
  if (match) {
    timestamp = `${match[1]} ${match[2]}`;
  } else {
    match = text.match(/(\d{1,2}\s+\w+\s+\d{4})[^\d]*(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)/i);
    if (match) timestamp = `${match[2]} ${match[1]}`;
  }

  // -------------------- Confidence Calculation --------------------
  const extractedFields = [amount, transactionId, paymentMethod, merchantName].filter(Boolean).length;
  const confidence = Math.min(0.98, 0.3 + extractedFields * 0.2);

  return {
    amount,
    transactionId,
    paymentMethod,
    merchantName,
    timestamp,
    confidence,
  };
}



  // const processOCR = async (file: File) => {
  //   setIsProcessing(true)
  //   setProcessingProgress(0)
  //   setProcessingStatus("Preparing image...")

  //   try {

  //     if (!file) return

  //     setProcessingStatus("Loading OCR engine...")
  //     setProcessingProgress(10)
  //     const worker = await createWorker("eng")

  //     setProcessingStatus("Recognizing text...")
  //     setProcessingProgress(30)
  //     const { data: { text, confidence } } = await worker.recognize(file)

  //     await worker.terminate()

  //     setProcessingProgress(60)
  //     setProcessingStatus("Parsing extracted text...")
  //     console.log("Extracted text:", text)
  //     const response = parseUPIText(text)
  //     response.confidence = confidence ? confidence / 100 : response.confidence || 0.7

  //     setOcrResult({ ...response, rawText: text, success: !!(response.amount && response.merchantName && response.transactionId) })

  //     setProcessingProgress(100)
  //     setProcessingStatus("Complete!")

  //     // Auto-fill form with OCR data
  //     setFormData((prev) => ({
  //       ...prev,
  //       amount: response.amount?.toString() || prev.amount,
  //       merchantName: response.merchantName || prev.merchantName,
  //       transactionId: response.transactionId || prev.transactionId,
  //       paymentMethod: response.paymentMethod || prev.paymentMethod,
  //       description: response.merchantName ? `Payment to ${response.merchantName}` : prev.description,
  //     }))

  //     toast({
  //       title: "OCR Successful",
  //       description: `Extracted details with ${Math.round((response.confidence || 0) * 100)}% confidence`,
  //     })
  //   } catch (error) {
  //     console.error("OCR Error:", error)
  //     toast({
  //       title: "Processing Error",
  //       description: "Failed to process image. Please enter details manually.",
  //       variant: "destructive",
  //     })
  //     setOcrResult(null)
  //   } finally {
  //     setIsProcessing(false)
  //     setProcessingProgress(0)
  //     setProcessingStatus("")
  //   }
  // }
// const performCohereParse = async (text: string) => {
//   const response = await fetch("/api/parseWithCohere", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ rawText: text }),
//   });
//   const data = await response.json();
//   return data.result;
// };

const processOCR = async (file: File) => {
  setIsProcessing(true)
  setProcessingProgress(0)
  setProcessingStatus("Preparing image...")

  try {
    if (!file) return

    setProcessingStatus("Loading OCR engine...")
    setProcessingProgress(10)
    const worker = await createWorker("eng")

    setProcessingStatus("Recognizing text...")
    setProcessingProgress(30)
    const { data: { text, confidence } } = await worker.recognize(file)

    await worker.terminate()

    setProcessingProgress(60)
    setProcessingStatus("Parsing extracted text with Cohere AI...")

    // Call Cohere API route
    let response = null
    try {
      const apiRes = await fetch("/api/parseWithCohere", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: text }),
      })
      const data = await apiRes.json()
      response = data.result
      // If Cohere returns null, fallback to local parser
      if (!response) {
        throw new Error("Cohere returned null");
      }
    } catch (aiError) {
      console.error("Cohere API Error:", aiError)
      toast({
        title: "AI Parsing Error",
        description: "Failed to parse details with Cohere. Falling back to local parsing.",
        variant: "destructive",
      })
      response = parseUPIText(text)
      response.fallback = true
    }

    // Only set confidence if response is not null
    if (response) {
      response.confidence = confidence ? confidence / 100 : response.confidence || 0.7

      setOcrResult({ ...response, rawText: text, success: !!(response.amount && response.merchantName && response.transactionId) })

      setProcessingProgress(100)
      setProcessingStatus("Complete!")

      // Auto-fill form with OCR data
      setFormData((prev) => ({
        ...prev,
        amount: response.amount?.toString() || prev.amount,
        merchantName: response.merchantName || prev.merchantName,
        transactionId: response.transactionId || prev.transactionId,
        paymentMethod: response.paymentMethod || prev.paymentMethod,
        description: response.merchantName ? `Payment to ${response.merchantName}` : prev.description,
      }))

      toast({
        title: "OCR Successful",
        description: `Extracted details with ${Math.round((response.confidence || 0) * 100)}% confidence`,
      })
    } else {
      // If both Cohere and local parsing fail
      setOcrResult(null)
      toast({
        title: "Parsing Error",
        description: "Failed to extract details from the image.",
        variant: "destructive",
      })
    }
  } catch (error) {
    console.error("OCR Error:", error)
    toast({
      title: "Processing Error",
      description: "Failed to process image. Please enter details manually.",
      variant: "destructive",
    })
    setOcrResult(null)
  } finally {
    setIsProcessing(false)
    setProcessingProgress(0)
    setProcessingStatus("")
  }
}




const fileToBase64 = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.response as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
    }

const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
    }

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const files = e.dataTransfer.files
      if (files.length > 0) {
        const file = files[0]
        if (file.type.startsWith("image/")) {
          setSelectedFile(file)
          const reader = new FileReader()
          reader.onload = (e) => {
            setPreviewUrl(e.target?.response as string)
          }
          reader.readAsDataURL(file)
          processOCR(file)
        }
      }
    }

    const removeFile = () => {
      setSelectedFile(null)
      setPreviewUrl("")
      setOcrResult(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }

    const handleSubmit = () => {
      // Validate required fields
      if (!formData.amount || !formData.merchantName || !formData.transactionId) {
        toast({
          title: "Missing Information",
          description: "Please fill in amount, merchant name, and transaction ID",
          variant: "destructive",
        })
        return
      }

      const expenseData: ExpenseData = {
        amount: Number.parseFloat(formData.amount),
        description: formData.description || `Payment to ${formData.merchantName}`,
        merchantName: formData.merchantName,
        transactionId: formData.transactionId,
        paymentMethod: formData.paymentMethod,
        category: formData.category,
        notes: formData.notes,
      }

      onExpenseLogged(expenseData)
    }

    return (
      <div className="space-y-4 text-white">
      {/* Payment Info (if available) */}
      {paymentData && (
        <div className="bg-green-900/30 p-3 rounded-lg border border-green-700/50">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-green-400">Payment Initiated</h4>
            <span className="text-xs bg-green-800/50 text-green-400 px-2 py-1 rounded border border-green-700/50">
              {paymentData.paymentMethod}
            </span>
          </div>
          <div className="text-sm text-green-300 space-y-1">
            <div>Amount: ₹{paymentData.amount}</div>
            <div>Merchant: {paymentData.merchantName}</div>
            <div>Ref: {paymentData.transactionRef}</div>
          </div>
        </div>
      )}

      {/* File Upload Area */}
      <div
        className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-gray-500 transition-colors"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isProcessing}
        />
        {previewUrl ? (
          <div className="space-y-3">
            <div className="relative">
              <img
                src={previewUrl || "/placeholder.svg"}
                alt="Preview"
                className="max-w-full h-32 object-contain mx-auto rounded"
              />
              {!isProcessing && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute -top-2 -right-2"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFile()
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            {/* Processing Status */}
            {isProcessing ? (
              <div className="space-y-2">
                <div className="flex items-center justify-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin text-green-400" />
                  <span className="text-sm text-green-400">{processingStatus}</span>
                </div>
                <Progress value={processingProgress} className="w-full bg-gray-700">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${processingProgress}%` }} />
                </Progress>
                <p className="text-xs text-gray-400">Processing with optimized OCR...</p>
              </div>
            ) : ocrResult?.success ? (
              <div className="flex items-center justify-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span className="text-sm text-green-400">Details extracted successfully</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2">
                <AlertCircle className="h-4 w-4 text-yellow-400" />
                <span className="text-sm text-yellow-400">Please verify extracted details</span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-center">
              <div className="p-3 bg-gray-700/50 rounded-full">
                <Camera className="h-8 w-8 text-gray-400" />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-white">Upload Payment Screenshot</p>
              <p className="text-xs text-gray-400">Drag & drop or click to select</p>
              <p className="text-xs text-gray-500 mt-1">Supports JPG, PNG (max 3MB)</p>
            </div>
          </div>
        )}
      </div>

      {/* OCR Confidence */}
      {ocrResult && (
        <div className="bg-gray-700/50 p-3 rounded-lg border border-gray-600">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-300">OCR Confidence:</span>
            <span className={`font-medium ${ocrResult.confidence > 0.8 ? "text-green-400" : "text-yellow-400"}`}>
              {Math.round((ocrResult.confidence || 0) * 100)}%
            </span>
          </div>
          {ocrResult.fallback && (
            <p className="text-xs text-yellow-400 mt-1">Using optimized Tesseract.js processing</p>
          )}
        </div>
      )}

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
              Transaction ID *
            </Label>
            <Input
              id="transactionId"
              placeholder="TXN123456789"
              value={formData.transactionId}
              onChange={(e) => setFormData((prev) => ({ ...prev, transactionId: e.target.value }))}
              required
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
        disabled={isProcessing || !formData.amount || !formData.merchantName || !formData.transactionId}
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CheckCircle className="h-4 w-4 mr-2" />
            Add Expense
          </>
        )}
      </Button>
    </div>
    )
  }
