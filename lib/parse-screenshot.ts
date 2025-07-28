// lib/parse-screenshot.ts
import axios from 'axios'

export async function extractPaymentDetailsFromText(rawText: string): Promise<any> {
  const prompt = `
Extract the following fields from this payment text:
- Amount (₹)
- Merchant Name
- UPI ID (if available)
- Google Transaction ID or UPI Transaction ID
- Payment Method (PhonePe, GPay, etc.)

Text:
${rawText}

Respond in JSON format with keys:
amount, merchantName, merchantUPI, transactionId, paymentMethod.
  `.trim()

  const response = await axios.post(
    'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.1',
    {
      inputs: prompt,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  )

  return response.data[0]?.generated_text || {}
}
