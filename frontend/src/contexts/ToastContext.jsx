import { createContext, useContext } from 'react'
import { useToast } from '../hooks/useToast'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const toast = useToast()
  return (
    <ToastContext.Provider value={toast}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToastContext() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToastContext must be used within ToastProvider')
  }
  return context
}
