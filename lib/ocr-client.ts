import { createWorker } from 'tesseract.js'

export async function runOCR(base64Image: string): Promise<string> {
  const worker = await createWorker('eng')

  try {
    const {
      data: { text }
    } = await worker.recognize(base64Image)
    return text
  } catch (err) {
    console.error('Tesseract OCR error:', err)
    throw err
  } finally {
    await worker.terminate()
  }
}
