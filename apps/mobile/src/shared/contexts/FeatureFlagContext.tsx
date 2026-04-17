/* eslint-disable @typescript-eslint/no-explicit-any */
import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { featureFlagApi } from "../../services/api/feature-flag.api";
import wsService from "../services/websocket";

interface FeatureFlagClientDto {
  key: string;
  type: string;
  value: Record<string, any>;
  enabled: boolean;
}

interface FeatureFlagState {
  flags: Record<string, FeatureFlagClientDto>;
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

type FeatureFlagAction =
  | { type: "SET_FLAGS"; payload: Record<string, FeatureFlagClientDto> }
  | { type: "UPDATE_FLAG"; payload: FeatureFlagClientDto }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "CLEAR" };

interface FeatureFlagContextValue extends FeatureFlagState {
  isEnabled: (key: string) => boolean;
  getVariant: (key: string) => string | null;
  refreshFlags: () => Promise<void>;
}

const STORAGE_KEY = "@xuno:feature-flags";

const initialState: FeatureFlagState = {
  flags: {},
  loading: false,
  error: null,
  lastUpdated: null,
};

function featureFlagReducer(state: FeatureFlagState, action: FeatureFlagAction): FeatureFlagState {
  switch (action.type) {
    case "SET_FLAGS":
      return {
        ...state,
        flags: action.payload,
        loading: false,
        lastUpdated: Date.now(),
      };
    case "UPDATE_FLAG":
      return {
        ...state,
        flags: {
          ...state.flags,
          [action.payload.key]: action.payload,
        },
        lastUpdated: Date.now(),
      };
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload, loading: false };
    case "CLEAR":
      return { ...initialState };
    default:
      return state;
  }
}

const FeatureFlagContext = createContext<FeatureFlagContextValue | null>(null);

export function FeatureFlagProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(featureFlagReducer, initialState);

  const loadFromStorage = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const flags = JSON.parse(stored) as Record<string, FeatureFlagClientDto>;
        dispatch({ type: "SET_FLAGS", payload: flags });
      }
    } catch (error) {
      // ignore storage errors
      console.error('Feature flag storage error:', error);
    }
  }, []);

  const saveToStorage = useCallback(async (flags: Record<string, FeatureFlagClientDto>) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(flags));
    } catch (error) {
      // ignore storage errors
      console.error('Feature flag storage error:', error);
    }
  }, []);

  const refreshFlags = useCallback(async () => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const response = await featureFlagApi.getClientFlags();
      if (response.success && response.data) {
        const flagsMap: Record<string, FeatureFlagClientDto> = {};
        for (const flag of response.data) {
          flagsMap[flag.key] = flag;
        }
        dispatch({ type: "SET_FLAGS", payload: flagsMap });
        await saveToStorage(flagsMap);
      } else {
        dispatch({ type: "SET_ERROR", payload: "Failed to fetch feature flags" });
      }
    } catch (err) {
      dispatch({ type: "SET_ERROR", payload: (err as Error).message });
    }
  }, [saveToStorage]);

  useEffect(() => {
    void loadFromStorage().then(() => {
      void refreshFlags();
    });
  }, [loadFromStorage, refreshFlags]);

  useEffect(() => {
    const handleFlagUpdate = () => {
      void refreshFlags();
    };

    const socket = (wsService as unknown as { socket?: { on: (event: string, handler: () => void) => void; off: (event: string, handler: () => void) => void } }).socket;
    if (socket) {
      socket.on("feature_flag_updated", handleFlagUpdate);
      return () => {
        socket.off("feature_flag_updated", handleFlagUpdate);
      };
    }
  }, [refreshFlags]);

  const isEnabled = useCallback(
    (key: string): boolean => {
      const flag = state.flags[key];
      return flag?.enabled ?? false;
    },
    [state.flags]
  );

  const getVariant = useCallback(
    (key: string): string | null => {
      const flag = state.flags[key];
      if (!flag || !flag.enabled) {
        return null;
      }
      return (flag.value?.variant as string) ?? null;
    },
    [state.flags]
  );

  const value: FeatureFlagContextValue = {
    ...state,
    isEnabled,
    getVariant,
    refreshFlags,
  };

  return <FeatureFlagContext.Provider value={value}>{children}</FeatureFlagContext.Provider>;
}

export function useFeatureFlags() {
  const context = useContext(FeatureFlagContext);
  if (!context) {
    throw new Error("useFeatureFlags must be used within a FeatureFlagProvider");
  }
  return context;
}

export default FeatureFlagContext;
