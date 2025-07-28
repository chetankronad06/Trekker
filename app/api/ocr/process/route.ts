import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { ocrService } from "@/lib/ocr-service"

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

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { imageUrl, type } = await request.json()

    if (!imageUrl) {
      return NextResponse.json({ error: "Image URL is required" }, { status: 400 })
    }

    console.log(`🔍 Processing ${type} image:`, imageUrl)

    let ocrResult: OCRResult

    if (type === "upi-screenshot") {
      ocrResult = await ocrService.processUPIScreenshot(imageUrl)
    } else {
      ocrResult = await ocrService.processGenericImage(imageUrl)
    }

    console.log("✅ OCR Result:", {
      success: ocrResult.success,
      confidence: ocrResult.confidence,
      extractedFields: {
        amount: ocrResult.amount,
        transactionId: ocrResult.transactionId,
        status: ocrResult.status,
        paymentMethod: ocrResult.paymentMethod,
      },
    })

    return NextResponse.json(ocrResult)
  } catch (error) {
    console.error("❌ OCR API error:", error)

    // Return a more detailed error for debugging
    const errorMessage = error instanceof Error ? error.message : "Unknown error"

    return NextResponse.json(
      {
        error: "Failed to process image",
        details: errorMessage,
        success: false,
        confidence: 0,
      },
      { status: 500 },
    )
  }
}
