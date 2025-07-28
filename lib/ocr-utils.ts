interface ParsedData {
  amount?: number
  merchantName?: string
  transactionId?: string
  paymentMethod?: string
  confidence?: number
}

export function parseUPIText(text: string): ParsedData {
  const lines = text.split('\n').map(line => line.trim())

  let amount: number | undefined
  let merchantName = ''
  let transactionId = ''
  let paymentMethod = ''

  for (const line of lines) {
    if (!amount && /(?:₹|Rs\.?)\s?([\d,.]+)/.test(line)) {
      const match = line.match(/(?:₹|Rs\.?)\s?([\d,.]+)/)
      if (match) {
        amount = parseFloat(match[1].replace(/,/g, ''))
      }
    }

    if (!transactionId && /(?:Ref|UPI Ref|Txn|TXN|Transaction)[^\d]*(\d{6,})/.test(line)) {
      const match = line.match(/(?:Ref|UPI Ref|Txn|TXN|Transaction)[^\d]*(\d{6,})/)
      if (match) {
        transactionId = match[1]
      }
    }

    if (!paymentMethod && /(GPay|Google Pay|PhonePe|Paytm|BHIM|UPI)/i.test(line)) {
      const match = line.match(/(GPay|Google Pay|PhonePe|Paytm|BHIM|UPI)/i)
      if (match) {
        paymentMethod = match[1]
      }
    }

    // crude guess: first line with title case and >5 characters
    if (!merchantName && /^[A-Z][a-z]+\s[A-Z][a-z]+/.test(line)) {
      merchantName = line
    }
  }

  return {
    amount,
    merchantName,
    transactionId,
    paymentMethod,
    confidence: 0.85 // static confidence for now
  }
}
