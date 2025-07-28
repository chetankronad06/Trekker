import { NextRequest, NextResponse } from "next/server";
import { CohereClient } from "cohere-ai";

console.log("Loaded Cohere key:", process.env.COHERE_API_KEY); // Debug line

const cohere = new CohereClient({ apiKey: process.env.COHERE_API_KEY! });

export async function POST(req: NextRequest) {
  const { rawText } = await req.json();

  const prompt = `
You are a payment receipt parser. Extract the following structured data from UPI transaction text:
- amount
- merchantName
- merchantUPI
- transactionId
- paymentMethod (e.g., Google Pay, PhonePe, Paytm, UPI)
Respond ONLY in this JSON format:
{
  "amount": number,
  "merchantName": string,
  "merchantUPI": string,
  "transactionId": string,
  "paymentMethod": string
}
Raw OCR Text: """${rawText}"""
`;

  try {
    const response = await cohere.generate({
      model: "command",
      prompt,
      max_tokens: 200,
      temperature: 0.1,
    });

    const content = response.generations[0].text;
    const jsonMatch = content.match(/{[\s\S]*}/);
    if (!jsonMatch) return NextResponse.json({ result: null, error: "No JSON in AI reply" }, { status: 200 });

    let parsed = {};
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      return NextResponse.json({ result: null, error: "Invalid JSON in AI reply" }, { status: 200 });
    }

    // Calculate confidence
    const fields = ["amount", "merchantName", "merchantUPI", "transactionId", "paymentMethod"];
    const extractedCount = fields.filter(f => parsed[f] && parsed[f] !== "").length;
    const confidence = Math.min(0.98, 0.3 + extractedCount * 0.14);

    return NextResponse.json({ result: { ...parsed, confidence } }, { status: 200 });
  } catch (err) {
    console.error("Cohere error:", err);
    return NextResponse.json({ result: null, error: "AI parsing failed" }, { status: 500 });
  }
}