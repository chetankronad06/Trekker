import { handleClerkWebhook } from "@/lib/webhooks"

export async function POST(req: Request) {
  return handleClerkWebhook(req)
}
