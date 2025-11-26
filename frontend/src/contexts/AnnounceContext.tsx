"use client"

import React from 'react'

type AnnounceContextType = {
  announce: (text: string) => void
}

const AnnounceContext = React.createContext<AnnounceContextType | null>(null)

export const AnnounceProvider = ({ children }: { children: React.ReactNode }) => {
  const [message, setMessage] = React.useState('')

  const announce = (text: string) => {
    // toggle to ensure screen readers pick up consecutive messages
    setMessage('')
    requestAnimationFrame(() => setMessage(text))
  }

  return (
    <AnnounceContext.Provider value={{ announce }}>
      {children}
      <div aria-live="polite" aria-atomic="true" role="status" id="a11y-announcer" className="sr-only">{message}</div>
    </AnnounceContext.Provider>
  )
}

export const useAnnounce = () => {
  const ctx = React.useContext(AnnounceContext)
  if (!ctx) throw new Error('useAnnounce must be used within AnnounceProvider')
  return ctx.announce
}

export default AnnounceContext
