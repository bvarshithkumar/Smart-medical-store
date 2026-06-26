/**
 * OfflineContext – App-wide offline state & guard
 * Sri Venkateshwara Medical Store
 */
import React, { createContext, useContext } from 'react';
import { useOffline } from '../hooks/useOffline';

const OfflineContext = createContext(null);

export const OfflineProvider = ({ children }) => {
  const offline = useOffline();
  return (
    <OfflineContext.Provider value={offline}>
      {children}
    </OfflineContext.Provider>
  );
};

export const useOfflineContext = () => {
  const ctx = useContext(OfflineContext);
  if (!ctx) throw new Error('useOfflineContext must be used inside OfflineProvider');
  return ctx;
};
