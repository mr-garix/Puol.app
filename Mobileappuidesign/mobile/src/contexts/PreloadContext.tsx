import React, { createContext, useContext, useState } from 'react';

export type PreloadContextType = {
  preloadedVideoUri: string | null;
  setPreloadedVideoUri: (uri: string | null) => void;
};

const PreloadContext = createContext<PreloadContextType>({
  preloadedVideoUri: null,
  setPreloadedVideoUri: () => {},
});

export function PreloadProvider({ children }: { children: React.ReactNode }) {
  const [preloadedVideoUri, setPreloadedVideoUri] = useState<string | null>(null);

  return (
    <PreloadContext.Provider value={{ preloadedVideoUri, setPreloadedVideoUri }}>
      {children}
    </PreloadContext.Provider>
  );
}

export function usePreloadedVideo() {
  return useContext(PreloadContext);
}
