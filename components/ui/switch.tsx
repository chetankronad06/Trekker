"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, checked, onCheckedChange, ...props }, ref) => {
    return (
      <label className="relative inline-flex items-center cursor-pointer select-none">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          className="sr-only peer"
          ref={ref}
          {...props}
        />
        <div className={cn(
          "w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-green-500/50",
          "peer-checked:after:translate-x-full peer-checked:after:border-white after:content-['']",
          "after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300",
          "after:border after:rounded-full after:h-5 after:w-5 after:transition-all",
          "peer-checked:bg-green-500",
          className
        )} />
      </label>
    )
  }
)
Switch.displayName = "Switch"

export { Switch }
