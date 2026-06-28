'use client'

import React from 'react'
import { Terminal } from 'lucide-react'

export function CommandTrigger() {
  const triggerCommandPalette = () => {
    // Dispatches the Cmd+K shortcut event to toggle the Command Palette
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'k',
        metaKey: true,
        bubbles: true
      })
    )
  }

  return (
    <button
      onClick={triggerCommandPalette}
      className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-slate-300 font-semibold text-xs flex items-center gap-1.5 transition-all duration-150 cursor-pointer"
    >
      <Terminal className="h-4 w-4 text-blue-400" />
      Command Palette
    </button>
  )
}
