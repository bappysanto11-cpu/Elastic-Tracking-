import { useState, useCallback } from 'react';

export function useHistory<T>(initialState: T | (() => T)) {
  const [state, setState] = useState<T>(initialState);
  const [past, setPast] = useState<T[]>([]);
  const [future, setFuture] = useState<T[]>([]);

  const set = useCallback((value: T | ((prev: T) => T)) => {
    setState((currentState) => {
      const nextState = typeof value === 'function' ? (value as (prev: T) => T)(currentState) : value;
      if (nextState === currentState) return currentState;
      
      setPast(prev => {
        const newPast = [...prev, currentState];
        if (newPast.length > 50) return newPast.slice(newPast.length - 50);
        return newPast;
      });
      setFuture([]);
      return nextState;
    });
  }, []);

  const undo = useCallback(() => {
    setPast(prevPast => {
      if (prevPast.length === 0) return prevPast;
      const previous = prevPast[prevPast.length - 1];
      const newPast = prevPast.slice(0, prevPast.length - 1);
      
      setState(currentState => {
        setFuture(prevFuture => [currentState, ...prevFuture]);
        return previous;
      });
      return newPast;
    });
  }, []);

  const redo = useCallback(() => {
    setFuture(prevFuture => {
      if (prevFuture.length === 0) return prevFuture;
      const next = prevFuture[0];
      const newFuture = prevFuture.slice(1);
      
      setState(currentState => {
        setPast(prevPast => [...prevPast, currentState]);
        return next;
      });
      return newFuture;
    });
  }, []);

  const reset = useCallback((newState: T) => {
    setState(newState);
    setPast([]);
    setFuture([]);
  }, []);

  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  return { state, set, undo, redo, reset, canUndo, canRedo, past, future };
}
