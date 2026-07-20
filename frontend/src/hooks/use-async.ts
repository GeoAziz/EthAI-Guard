import { useState, useEffect, useCallback, useRef } from 'react';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export function useAsync<T>(
  fn: () => Promise<T>,
  deps: React.DependencyList = []
): AsyncState<T> & { refetch: () => void } {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: true,
    error: null,
  });
  const mountedRef = useRef(true);
  const fetchIdRef = useRef(0);

  const execute = useCallback(async () => {
    const fetchId = ++fetchIdRef.current;
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const data = await fn();
      if (mountedRef.current && fetchId === fetchIdRef.current) {
        setState({ data, loading: false, error: null });
      }
    } catch (error) {
      if (mountedRef.current && fetchId === fetchIdRef.current) {
        setState({
          data: null,
          loading: false,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    }
  }, deps);

  useEffect(() => {
    mountedRef.current = true;
    execute();
    return () => { mountedRef.current = false; };
  }, [execute]);

  return {
    ...state,
    refetch: execute,
  };
}
