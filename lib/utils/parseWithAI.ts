// lib/utils/parseWithAI.ts
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY });


export async function parseScreenshotTextAI(rawText: string) {
  const systemPrompt = `
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
  `;
  const userPrompt = `Raw OCR Text:\n"""${rawText}"""`;

  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.1,
  });

  const content = response.choices[0].message.content;
  const jsonMatch = content?.match(/{[\s\S]*}/);
  if (!jsonMatch) return null;
  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

