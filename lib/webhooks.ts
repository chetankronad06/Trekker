import { Webhook } from "svix"
import { headers } from "next/headers"
import type { WebhookEvent } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export async function handleClerkWebhook(req: Request) {
  // Get the headers - await the headers() function
  const headerPayload = await headers()
  const svix_id = headerPayload.get("svix-id")
  const svix_timestamp = headerPayload.get("svix-timestamp")
  const svix_signature = headerPayload.get("svix-signature")

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.log("❌ Missing svix headers")
    return new Response("Error occured -- no svix headers", {
      status: 400,
    })
  }

  // Get the body
  const payload = await req.text()
  const body = JSON.parse(payload)

  // Create a new Svix instance with your secret.
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || "")

  let evt: WebhookEvent

  // Verify the payload with the headers
  try {
    evt = wh.verify(payload, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error("❌ Error verifying webhook:", err)
    return new Response("Error occured", {
      status: 400,
    })
  }

  // Handle the webhook
  const eventType = evt.type
  console.log("🔔 Webhook received:", eventType)

  if (eventType === "user.created") {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data

    try {
      const user = await prisma.user.create({
        data: {
          clerkId: id,
          email: email_addresses[0]?.email_address || "",
          firstName: first_name || "",
          lastName: last_name || "",
          profileImageUrl: image_url || null,
        },
      })
      console.log("✅ User created via webhook:", user.id)
    } catch (error) {
      console.error("❌ Error creating user via webhook:", error)
      // If user already exists, try to update instead
      try {
        const updatedUser = await prisma.user.update({
          where: { clerkId: id },
          data: {
            email: email_addresses[0]?.email_address || "",
            firstName: first_name || "",
            lastName: last_name || "",
            profileImageUrl: image_url || null,
          },
        })
        console.log("✅ User updated via webhook:", updatedUser.id)
      } catch (updateError) {
        console.error("❌ Error updating user via webhook:", updateError)
      }
    }
  }

  if (eventType === "user.updated") {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data

    try {
      await prisma.user.update({
        where: { clerkId: id },
        data: {
          email: email_addresses[0]?.email_address || "",
          firstName: first_name || "",
          lastName: last_name || "",
          profileImageUrl: image_url || null,
        },
      })
      console.log("✅ User updated via webhook:", id)
    } catch (error) {
      console.error("❌ Error updating user via webhook:", error)
    }
  }

  if (eventType === "user.deleted") {
    const { id } = evt.data

    try {
      await prisma.user.delete({
        where: { clerkId: id },
      })
      console.log("✅ User deleted via webhook:", id)
    } catch (error) {
      console.error("❌ Error deleting user via webhook:", error)
    }
  }

  return new Response("", { status: 200 })
}
