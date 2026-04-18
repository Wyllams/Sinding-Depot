"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback } from "react";

interface UndoAction {
  id: string;
  message: string;
  date: Date;
  onUndo: () => Promise<void>;
}

interface UndoContextType {
  history: UndoAction[];
  setUndo: (message: string, onUndo: () => Promise<void>) => void;
  removeAction: (id: string) => void;
  clearHistory: () => void;
  executeUndo: (id: string) => Promise<void>;
  isUndoing: boolean;
}

const UndoContext = createContext<UndoContextType | undefined>(undefined);

export function UndoProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<UndoAction[]>([]);
  const [isUndoing, setIsUndoing] = useState(false);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const removeAction = useCallback((id: string) => {
    setHistory((prev) => prev.filter(a => a.id !== id));
  }, []);

  const setUndo = useCallback((message: string, onUndo: () => Promise<void>) => {
    const id = Date.now().toString();
    setHistory((prev) => [{ id, message, onUndo, date: new Date() }, ...prev]);
  }, []);

  const executeUndo = useCallback(async (id: string) => {
    if (isUndoing) return;
    const action = history.find(a => a.id === id);
    if (action) {
      setIsUndoing(true);
      try {
        await action.onUndo();
        removeAction(id);
      } catch (err) {
        console.error("Undo failed:", err);
      } finally {
        setIsUndoing(false);
      }
    }
  }, [history, isUndoing, removeAction]);

  return (
    <UndoContext.Provider value={{ history, setUndo, removeAction, clearHistory, executeUndo, isUndoing }}>
      {children}
    </UndoContext.Provider>
  );
}

export function useUndo() {
  const context = useContext(UndoContext);
  if (context === undefined) {
    throw new Error("useUndo must be used within an UndoProvider");
  }
  return context;
}
