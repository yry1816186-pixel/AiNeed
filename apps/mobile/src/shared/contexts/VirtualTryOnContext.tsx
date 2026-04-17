import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { TryOnResult } from "../../services/api/tryon.api";
import { virtualTryOnService } from '../../services/ai';
import { photosApi, type PhotoType } from "../../services/api/photos.api";

const VTO_STORAGE_KEY = "@virtual_tryons";

interface VirtualTryOnState {
  history: TryOnResult[];
  currentResult: TryOnResult | null;
  isProcessing: boolean;
  error: string | null;
}

type VirtualTryOnAction =
  | { type: "SET_HISTORY"; payload: TryOnResult[] }
  | { type: "ADD_RESULT"; payload: TryOnResult }
  | { type: "DELETE_RESULT"; payload: string }
  | { type: "SET_CURRENT"; payload: TryOnResult | null }
  | { type: "SET_PROCESSING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null };

const initialState: VirtualTryOnState = {
  history: [],
  currentResult: null,
  isProcessing: false,
  error: null,
};

function virtualTryOnReducer(
  state: VirtualTryOnState,
  action: VirtualTryOnAction
): VirtualTryOnState {
  switch (action.type) {
    case "SET_HISTORY":
      return { ...state, history: action.payload };
    case "ADD_RESULT":
      return { ...state, history: [action.payload, ...state.history] };
    case "DELETE_RESULT":
      return {
        ...state,
        history: state.history.filter((item) => item.id !== action.payload),
      };
    case "SET_CURRENT":
      return { ...state, currentResult: action.payload };
    case "SET_PROCESSING":
      return { ...state, isProcessing: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload, isProcessing: false };
    default:
      return state;
  }
}

interface VirtualTryOnContextValue extends VirtualTryOnState {
  loadHistory: () => Promise<void>;
  tryOnWithIds: (photoId: string, itemId: string) => Promise<TryOnResult | null>;
  tryOnWithImages: (personImageUri: string, clothingItemId: string) => Promise<TryOnResult | null>;
  deleteResult: (id: string) => Promise<void>;
  setCurrentResult: (result: TryOnResult | null) => void;
  clearError: () => void;
}

const VirtualTryOnContext = createContext<VirtualTryOnContextValue | null>(null);

export function VirtualTryOnProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(virtualTryOnReducer, initialState);

  useEffect(() => {
    void loadFromStorage();
  }, []);

  const loadFromStorage = async () => {
    try {
      const stored = await AsyncStorage.getItem(VTO_STORAGE_KEY);
      if (stored) {
        const history = JSON.parse(stored);
        dispatch({ type: "SET_HISTORY", payload: history });
      }
    } catch (error) {
      console.error("Failed to load VTO history:", error);
      dispatch({ type: "SET_ERROR", payload: "加载试衣历史失败" });
    }
  };

  const saveToStorage = async (history: TryOnResult[]) => {
    await AsyncStorage.setItem(VTO_STORAGE_KEY, JSON.stringify(history));
  };

  const loadHistory = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(VTO_STORAGE_KEY);
      if (stored) {
        const history = JSON.parse(stored);
        dispatch({ type: "SET_HISTORY", payload: history });
      }
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: "Failed to load history" });
    }
  }, []);

  const tryOnWithIds = useCallback(
    async (photoId: string, itemId: string): Promise<TryOnResult | null> => {
      dispatch({ type: "SET_PROCESSING", payload: true });
      dispatch({ type: "SET_ERROR", payload: null });

      try {
        const result = await virtualTryOnService.tryOn(photoId, itemId);

        if (result.status === "completed") {
          dispatch({ type: "ADD_RESULT", payload: result });
          dispatch({ type: "SET_CURRENT", payload: result });
          const updatedHistory = [result, ...state.history];
          await saveToStorage(updatedHistory);
        } else {
          dispatch({ type: "SET_ERROR", payload: "Virtual try-on failed" });
        }

        dispatch({ type: "SET_PROCESSING", payload: false });
        return result;
      } catch (error) {
        dispatch({
          type: "SET_ERROR",
          payload: error instanceof Error ? error.message : "Unknown error",
        });
        dispatch({ type: "SET_PROCESSING", payload: false });
        return null;
      }
    },
    [state.history]
  );

  const tryOnWithImages = useCallback(
    async (personImageUri: string, clothingItemId: string): Promise<TryOnResult | null> => {
      dispatch({ type: "SET_PROCESSING", payload: true });
      dispatch({ type: "SET_ERROR", payload: null });

      try {
        const uploadResponse = await photosApi.upload(personImageUri, "full_body" as PhotoType);
        if (!uploadResponse.success || !uploadResponse.data) {
          throw new Error(uploadResponse.error?.message || "照片上传失败");
        }

        const photoId = uploadResponse.data.id;
        const result = await virtualTryOnService.tryOn(photoId, clothingItemId);

        if (result.status === "completed") {
          dispatch({ type: "ADD_RESULT", payload: result });
          dispatch({ type: "SET_CURRENT", payload: result });
          const updatedHistory = [result, ...state.history];
          await saveToStorage(updatedHistory);
        } else {
          dispatch({ type: "SET_ERROR", payload: "Virtual try-on failed" });
        }

        dispatch({ type: "SET_PROCESSING", payload: false });
        return result;
      } catch (error) {
        dispatch({
          type: "SET_ERROR",
          payload: error instanceof Error ? error.message : "Unknown error",
        });
        dispatch({ type: "SET_PROCESSING", payload: false });
        return null;
      }
    },
    [state.history]
  );

  const deleteResult = useCallback(
    async (id: string) => {
      dispatch({ type: "DELETE_RESULT", payload: id });
      const updatedHistory = state.history.filter((item) => item.id !== id);
      await saveToStorage(updatedHistory);
    },
    [state.history]
  );

  const setCurrentResult = useCallback((result: TryOnResult | null) => {
    dispatch({ type: "SET_CURRENT", payload: result });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: "SET_ERROR", payload: null });
  }, []);

  const value: VirtualTryOnContextValue = {
    ...state,
    loadHistory,
    tryOnWithIds,
    tryOnWithImages,
    deleteResult,
    setCurrentResult,
    clearError,
  };

  return <VirtualTryOnContext.Provider value={value}>{children}</VirtualTryOnContext.Provider>;
}

export function useVirtualTryOn() {
  const context = useContext(VirtualTryOnContext);
  if (!context) {
    throw new Error("useVirtualTryOn must be used within a VirtualTryOnProvider");
  }
  return context;
}

export default VirtualTryOnContext;
