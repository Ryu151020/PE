import { useCallback, useEffect, useRef, useState } from "react";

export function useTableHistory(initialData, onCommit, limit = 50) {
  const [data, setDataState] = useState(initialData);
  const pastRef = useRef([]);
  const futureRef = useRef([]);
  const presentRef = useRef(initialData);

  useEffect(() => {
    if (JSON.stringify(initialData) !== JSON.stringify(presentRef.current)) {
      presentRef.current = initialData;
      setDataState(initialData);
    }
  }, [initialData]);

  const updateData = useCallback((nextDataOrFn) => {
    const next = typeof nextDataOrFn === "function" ? nextDataOrFn(presentRef.current) : nextDataOrFn;
    pastRef.current.push(presentRef.current);
    if (pastRef.current.length > limit) {
      pastRef.current.shift();
    }
    presentRef.current = next;
    futureRef.current = [];
    setDataState(next);
    if (onCommit) onCommit(next);
  }, [onCommit, limit]);

  const undo = useCallback(() => {
    if (pastRef.current.length === 0) return;
    const previous = pastRef.current.pop();
    futureRef.current.unshift(presentRef.current);
    presentRef.current = previous;
    setDataState(previous);
    if (onCommit) onCommit(previous);
  }, [onCommit]);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;
    const next = futureRef.current.shift();
    pastRef.current.push(presentRef.current);
    presentRef.current = next;
    setDataState(next);
    if (onCommit) onCommit(next);
  }, [onCommit]);

  return {
    data,
    updateData,
    undo,
    redo,
    canUndo: pastRef.current.length > 0,
    canRedo: futureRef.current.length > 0,
  };
}
