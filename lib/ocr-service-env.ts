import vision from "@google-cloud/vision"

interface OCRResult {
  amount?: string
  transactionId?: string
  merchantName?: string
  paymentMethod?: string
  timestamp?: string
  status?: string
  success: boolean
  confidence?: number
  extractedText?: string
}

class OCRService {
  private client: vision.ImageAnnotatorClient

  constructor() {
    // Use environment variables instead of key file
    this.client = new vision.ImageAnnotatorClient({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      credentials: {
        client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      },
    })
  }

  // ... rest of the methods remain the same as above
  async processUPIScreenshot(imageUrl: string): Promise<OCRResult> {
    try {
      console.log("🔍 Processing UPI screenshot with Google Vision API:", imageUrl)

      const [result] = await this.client.textDetection(imageUrl)
      const detections = result.textAnnotations

      if (!detections || detections.length === 0) {
        return {
          success: false,
          confidence: 0,
          extractedText: "No text detected in image",
        }
      }

      const fullText = detections[0].description || ""
      console.log("📝 Extracted text:", fullText)

      const parsedData = this.parseUPIText(fullText)

      return {
        ...parsedData,
        success: true,
        confidence: this.calculateConfidence(parsedData, fullText),
        extractedText: fullText,
      }
    } catch (error) {
      console.error("❌ OCR processing failed:", error)
      return {
        success: false,
        confidence: 0,
        extractedText: `OCR processing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      }
    }
  }

  private parseUPIText(text: string): Partial<OCRResult> {
    const result: Partial<OCRResult> = {}

    // Extract amount
    const amountPatterns = [
      /₹\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
      /(?:amount|paid|rs\.?)\s*:?\s*₹?\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
      /(\d+(?:,\d+)*(?:\.\d{2})?)\s*₹/i,
    ]

    for (const pattern of amountPatterns) {
      const match = text.match(pattern)
      if (match) {
        result.amount = match[1].replace(/,/g, "")
        break
      }
    }

    // Extract transaction ID
    const transactionPatterns = [
      /(?:transaction|txn|upi)\s*(?:id|ref|no|reference)?\s*:?\s*([A-Z0-9]{8,})/i,
      /(?:ref|reference)\s*(?:no|number)?\s*:?\s*([A-Z0-9]{8,})/i,
      /([A-Z0-9]{12,})/g,
    ]

    for (const pattern of transactionPatterns) {
      const match = text.match(pattern)
      if (match) {
        result.transactionId = match[1]
        break
      }
    }

    // Extract status
    const statusPatterns = [
      /(success|successful|completed|done|paid|payment\s+successful)/i,
      /(failed|failure|declined|error)/i,
      /(pending|processing)/i,
    ]

    for (const pattern of statusPatterns) {
      const match = text.match(pattern)
      if (match) {
        const status = match[1].toLowerCase()
        if (
          status.includes("success") ||
          status.includes("completed") ||
          status.includes("done") ||
          status.includes("paid")
        ) {
          result.status = "SUCCESS"
        } else if (status.includes("failed") || status.includes("declined") || status.includes("error")) {
          result.status = "FAILED"
        } else {
          result.status = "PENDING"
        }
        break
      }
    }

    // Extract payment method
    const paymentMethodPatterns = [
      /(google\s*pay|gpay)/i,
      /(phonepe|phone\s*pe)/i,
      /(paytm)/i,
      /(bhim)/i,
      /(amazon\s*pay)/i,
    ]

    for (const pattern of paymentMethodPatterns) {
      const match = text.match(pattern)
      if (match) {
        const method = match[1].toLowerCase()
        if (method.includes("google") || method.includes("gpay")) {
          result.paymentMethod = "Google Pay"
        } else if (method.includes("phonepe")) {
          result.paymentMethod = "PhonePe"
        } else if (method.includes("paytm")) {
          result.paymentMethod = "Paytm"
        } else if (method.includes("bhim")) {
          result.paymentMethod = "BHIM"
        } else {
          result.paymentMethod = match[1]
        }
        break
      }
    }

    // Extract merchant name
    const merchantPatterns = [
      /(?:to|paid\s+to)\s+([A-Za-z\s&.'-]+?)(?:\n|$|upi|@)/i,
      /merchant\s*:?\s*([A-Za-z\s&.'-]+?)(?:\n|$)/i,
      /payee\s*:?\s*([A-Za-z\s&.'-]+?)(?:\n|$)/i,
    ]

    for (const pattern of merchantPatterns) {
      const match = text.match(pattern)
      if (match) {
        result.merchantName = match[1].trim()
        break
      }
    }

    return result
  }

  private calculateConfidence(parsedData: Partial<OCRResult>, fullText: string): number {
    let confidence = 0.5

    if (parsedData.amount) confidence += 0.2
    if (parsedData.transactionId) confidence += 0.15
    if (parsedData.status) confidence += 0.1
    if (parsedData.paymentMethod) confidence += 0.1
    if (parsedData.merchantName) confidence += 0.05

    const upiKeywords = ["upi", "payment", "transaction", "successful", "paid", "₹"]
    const keywordCount = upiKeywords.filter((keyword) => fullText.toLowerCase().includes(keyword)).length

    confidence += keywordCount * 0.02
    return Math.min(confidence, 0.95)
  }
}

export const ocrService = new OCRService()
