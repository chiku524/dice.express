import { createContext, useContext } from 'react'

const AccountModalContext = createContext(null)

export function AccountModalProvider({ open, children }) {
  return (
    <AccountModalContext.Provider value={{ open: open ?? (() => {}) }}>
      {children}
    </AccountModalContext.Provider>
  )
}

export function useAccountModal() {
  const ctx = useContext(AccountModalContext)
  return ctx ? ctx.open : () => {}
}
