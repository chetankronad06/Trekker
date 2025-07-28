// app/api/parse/route.ts
import { NextRequest, NextResponse } from "next/server";
import { HfInference } from '@huggingface/inference';

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY!);

export async function POST(req: NextRequest) {
  const { rawText } = await req.json();

  const systemPrompt = `
Extract these fields from the following OCR text:
- amount (₹)
- merchantName
- merchantUPI
- transactionId
- paymentMethod (Google Pay, PhonePe, Paytm, BHIM UPI, UPI)

Only respond in JSON:
{ "amount": "...", "merchantName": "...", "merchantUPI": "...", "transactionId": "...", "paymentMethod": "..." }
`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: rawText }
  ];

  try {
    const res = await hf.chatCompletion({
      model: 'HuggingFaceH4/zephyr-7b-beta',
      messages,
    });

    const reply = res.generated_text || res.choices?.[0]?.message?.content;
    const jsonMatch = reply?.match(/{[\s\S]*}/);

    if (!jsonMatch) {
      console.error("AI reply had no JSON block:", reply);
      return NextResponse.json({ result: null, error: "No JSON in AI reply" }, { status: 200 });
    }

    return NextResponse.json({ result: JSON.parse(jsonMatch[0]) }, { status: 200 });
  } catch (err) {
    console.error("❌ Failed to perform inference:", err);
    return NextResponse.json({ result: null, error: "AI inference failed" }, { status: 500 });
  }
}
