"use client"

import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast"
import { useToast } from "@/hooks/use-toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, action, ...props }) => (
        <Toast key={id} {...props} className="bg-gray-800 border-gray-700 text-white">
          <div className="grid gap-1">
            {title && <ToastTitle className="text-white">{title}</ToastTitle>}
            {description && <ToastDescription className="text-gray-300">{description}</ToastDescription>}
          </div>
          {action}
          <ToastClose className="text-gray-400 hover:text-white" />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  )
}
