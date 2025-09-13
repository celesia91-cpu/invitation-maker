import { createContext, useContext, useState } from 'react';

const AppStateContext = createContext(null);

export function AppStateProvider({ children }) {
  const [selectedSlide, setSelectedSlide] = useState(0);
  const [tokenBalance, setTokenBalance] = useState(0);

  const value = {
    selectedSlide,
    setSelectedSlide,
    tokenBalance,
    setTokenBalance,
  };

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return ctx;
}
