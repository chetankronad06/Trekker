import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"

interface SpeechResult {
  amount?: number
  merchantName?: string
  paymentMethod?: string
  category?: string
  description?: string
  notes?: string
  success: boolean
  confidence?: number
  rawTranscript?: string
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { transcript } = await request.json()

    if (!transcript || typeof transcript !== "string") {
      return NextResponse.json({ error: "Transcript is required" }, { status: 400 })
    }

    console.log("🎤 Processing speech transcript:", transcript)

    // Process the speech transcript
    const result = await processSpeechTranscript(transcript)

    console.log("✅ Speech processing result:", result)

    return NextResponse.json(result)
  } catch (error) {
    console.error("❌ Speech processing error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Speech processing failed",
      },
      { status: 500 },
    )
  }
}

function processSpeechTranscript(transcript: string): SpeechResult {
  const lowerTranscript = transcript.toLowerCase()
  const cleanTranscript = transcript.replace(/[^\w\s₹.,]/g, " ").replace(/\s+/g, " ")

  // Extract amount - multiple patterns for Indian speech
  const amountPatterns = [
    /(?:paid|spent|cost|costs|amount|rupees?|rs\.?)\s*(?:of|is|was)?\s*(?:₹|rs\.?)?\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
    /(\d+(?:,\d+)*(?:\.\d{2})?)\s*(?:₹|rupees?|rs\.?|bucks?)/i,
    /(?:₹|rs\.?)\s*(\d+(?:,\d+)*(?:\.\d{2})?)/i,
    /(\d+(?:,\d+)*(?:\.\d{2})?)\s*(?:only|total)/i,
  ]

  let amount: number | undefined
  for (const pattern of amountPatterns) {
    const match = cleanTranscript.match(pattern)
    if (match) {
      const parsedAmount = Number.parseFloat(match[1].replace(/,/g, ""))
      if (parsedAmount > 0 && parsedAmount < 100000) {
        // Reasonable range
        amount = parsedAmount
        break
      }
    }
  }

  // Extract merchant name - common patterns
  const merchantPatterns = [
    /(?:to|at|from|in)\s+([a-z\s&'-]+?)(?:\s+(?:using|via|through|for|today|yesterday)|\s*$)/i,
    /(?:paid|spent)\s+(?:at|to)\s+([a-z\s&'-]+?)(?:\s+(?:using|via|through|for)|\s*$)/i,
    /(?:restaurant|cafe|shop|store|mall|hotel|petrol|pump|station)\s+([a-z\s&'-]+?)(?:\s|$)/i,
  ]

  let merchantName: string | undefined
  for (const pattern of merchantPatterns) {
    const match = lowerTranscript.match(pattern)
    if (match) {
      let name = match[1].trim()
      // Clean up merchant name
      name = name.replace(/\b(?:the|a|an|and|&|pvt|ltd|limited|restaurant|cafe|shop|store)\b/gi, "").trim()
      name = name.replace(/\s+/g, " ").trim()
      if (name.length > 2 && name.length < 50) {
        // Capitalize first letter of each word
        merchantName = name
          .split(" ")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(" ")
        break
      }
    }
  }

  // Extract payment method
  const paymentMethods = [
    { patterns: ["google pay", "gpay", "g pay"], name: "Google Pay" },
    { patterns: ["phonepe", "phone pe", "phone pay"], name: "PhonePe" },
    { patterns: ["paytm"], name: "Paytm" },
    { patterns: ["bhim", "bhim upi"], name: "BHIM UPI" },
    { patterns: ["upi"], name: "UPI" },
    { patterns: ["cash", "money"], name: "Cash" },
    { patterns: ["card", "credit card", "debit card"], name: "Card" },
    { patterns: ["net banking", "netbanking", "online"], name: "Net Banking" },
  ]

  let paymentMethod: string | undefined
  for (const method of paymentMethods) {
    for (const pattern of method.patterns) {
      if (lowerTranscript.includes(pattern)) {
        paymentMethod = method.name
        break
      }
    }
    if (paymentMethod) break
  }

  // Extract category based on keywords
  const categoryKeywords = [
    {
      keywords: [
        "food",
        "restaurant",
        "cafe",
        "meal",
        "lunch",
        "dinner",
        "breakfast",
        "eat",
        "pizza",
        "burger",
        "coffee",
      ],
      category: "Food & Dining",
    },
    {
      keywords: ["taxi", "uber", "ola", "bus", "train", "metro", "auto", "rickshaw", "transport", "travel", "ticket"],
      category: "Transportation",
    },
    { keywords: ["hotel", "stay", "accommodation", "room", "booking"], category: "Accommodation" },
    { keywords: ["movie", "cinema", "entertainment", "game", "fun", "party"], category: "Entertainment" },
    { keywords: ["shop", "shopping", "buy", "purchase", "store", "mall", "clothes", "shirt"], category: "Shopping" },
    { keywords: ["grocery", "groceries", "vegetables", "fruits", "market", "supermarket"], category: "Groceries" },
    { keywords: ["doctor", "medicine", "medical", "hospital", "pharmacy", "health"], category: "Medical" },
    { keywords: ["petrol", "diesel", "fuel", "gas", "pump"], category: "Fuel" },
  ]

  let category: string | undefined
  for (const cat of categoryKeywords) {
    for (const keyword of cat.keywords) {
      if (lowerTranscript.includes(keyword)) {
        category = cat.category
        break
      }
    }
    if (category) break
  }

  // Generate description
  let description = ""
  if (merchantName && amount) {
    description = `Payment of ₹${amount} to ${merchantName}`
  } else if (merchantName) {
    description = `Payment to ${merchantName}`
  } else if (amount) {
    description = `Expense of ₹${amount}`
  } else {
    description = transcript
  }

  // Calculate confidence based on extracted fields
  const extractedFields = [amount, merchantName, paymentMethod, category].filter(Boolean).length
  const confidence = Math.min(0.95, 0.4 + extractedFields * 0.15)

  return {
    amount,
    merchantName,
    paymentMethod,
    category: category || "Other",
    description,
    notes: `Extracted from speech: "${transcript}"`,
    success: extractedFields >= 2, // At least amount and one other field
    confidence,
    rawTranscript: transcript,
  }
}
