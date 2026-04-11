import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Outfit,
  OutfitInput,
  OutfitItem,
  OutfitCanvasState,
} from "../types/outfit";
import { ClothingItem } from "../types/clothing";
import { outfitApi } from "../services/api/outfit.api";

const OUTFIT_STORAGE_KEY = "@outfits";

interface OutfitState {
  outfits: Outfit[];
  currentOutfit: Outfit | null;
  canvasState: OutfitCanvasState;
  selectedOutfitId: string | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
}

type OutfitAction =
  | { type: "SET_OUTFITS"; payload: Outfit[] }
  | { type: "ADD_OUTFIT"; payload: Outfit }
  | { type: "UPDATE_OUTFIT"; payload: { id: string; data: Partial<Outfit> } }
  | { type: "DELETE_OUTFIT"; payload: string }
  | { type: "SET_CURRENT_OUTFIT"; payload: Outfit | null }
  | { type: "SET_CANVAS_STATE"; payload: Partial<OutfitCanvasState> }
  | { type: "SET_SELECTED"; payload: string | null }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_SAVING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null };

const initialCanvasState: OutfitCanvasState = {
  items: [],
  selectedItemId: null,
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
};

const initialState: OutfitState = {
  outfits: [],
  currentOutfit: null,
  canvasState: initialCanvasState,
  selectedOutfitId: null,
  isLoading: false,
  isSaving: false,
  error: null,
};

function outfitReducer(state: OutfitState, action: OutfitAction): OutfitState {
  switch (action.type) {
    case "SET_OUTFITS":
      return { ...state, outfits: action.payload, isLoading: false };
    case "ADD_OUTFIT":
      return { ...state, outfits: [action.payload, ...state.outfits] };
    case "UPDATE_OUTFIT":
      return {
        ...state,
        outfits: state.outfits.map((outfit) =>
          outfit.id === action.payload.id
            ? { ...outfit, ...action.payload.data }
            : outfit,
        ),
      };
    case "DELETE_OUTFIT":
      return {
        ...state,
        outfits: state.outfits.filter((outfit) => outfit.id !== action.payload),
      };
    case "SET_CURRENT_OUTFIT":
      return { ...state, currentOutfit: action.payload };
    case "SET_CANVAS_STATE":
      return {
        ...state,
        canvasState: { ...state.canvasState, ...action.payload },
      };
    case "SET_SELECTED":
      return { ...state, selectedOutfitId: action.payload };
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_SAVING":
      return { ...state, isSaving: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload, isLoading: false };
    default:
      return state;
  }
}

interface OutfitContextValue extends OutfitState {
  loadOutfits: () => Promise<void>;
  createOutfit: (data: OutfitInput) => Promise<Outfit | null>;
  updateOutfit: (id: string, data: Partial<Outfit>) => Promise<void>;
  deleteOutfit: (id: string) => Promise<void>;
  setCurrentOutfit: (outfit: Outfit | null) => void;
  addItemToCanvas: (item: ClothingItem) => void;
  removeItemFromCanvas: (clothingId: string) => void;
  updateItemPosition: (
    clothingId: string,
    position: { x: number; y: number; rotation?: number },
  ) => void;
  selectCanvasItem: (itemId: string | null) => void;
  setCanvasZoom: (zoom: number) => void;
  setCanvasOffset: (offsetX: number, offsetY: number) => void;
  saveCurrentOutfit: () => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  getOutfitsByOccasion: (occasion: string) => Outfit[];
  getOutfitsBySeason: (season: string) => Outfit[];
  clearError: () => void;
}

const OutfitContext = createContext<OutfitContextValue | null>(null);

export function OutfitProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(outfitReducer, initialState);

  useEffect(() => {
    loadFromStorage();
  }, []);

  const loadFromStorage = async () => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const stored = await AsyncStorage.getItem(OUTFIT_STORAGE_KEY);
      if (stored) {
        const outfits = JSON.parse(stored);
        dispatch({ type: "SET_OUTFITS", payload: outfits });
      }
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: "Failed to load outfits" });
    }
  };

  const saveToStorage = async (outfits: Outfit[]) => {
    await AsyncStorage.setItem(OUTFIT_STORAGE_KEY, JSON.stringify(outfits));
  };

  const loadOutfits = useCallback(async () => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const response = await outfitApi.getAll();
      if (response.success && response.data) {
        dispatch({ type: "SET_OUTFITS", payload: response.data.items });
        await saveToStorage(response.data.items);
      }
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: "Failed to load outfits" });
    }
  }, []);

  const createOutfit = useCallback(
    async (data: OutfitInput): Promise<Outfit | null> => {
      dispatch({ type: "SET_SAVING", payload: true });
      try {
        const newOutfit: Outfit = {
          id: `outfit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: data.name,
          description: data.description,
          items: data.items,
          occasions: data.occasions || [],
          seasons: data.seasons || [],
          style: data.style,
          rating: 0,
          wearCount: 0,
          isFavorite: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        dispatch({ type: "ADD_OUTFIT", payload: newOutfit });
        const updatedOutfits = [newOutfit, ...state.outfits];
        await saveToStorage(updatedOutfits);

        dispatch({ type: "SET_SAVING", payload: false });
        return newOutfit;
      } catch (error) {
        dispatch({ type: "SET_ERROR", payload: "Failed to create outfit" });
        dispatch({ type: "SET_SAVING", payload: false });
        return null;
      }
    },
    [state.outfits],
  );

  const updateOutfit = useCallback(
    async (id: string, data: Partial<Outfit>) => {
      dispatch({
        type: "UPDATE_OUTFIT",
        payload: { id, data: { ...data, updatedAt: new Date().toISOString() } },
      });
      const updatedOutfits = state.outfits.map((outfit) =>
        outfit.id === id ? { ...outfit, ...data } : outfit,
      );
      await saveToStorage(updatedOutfits);
    },
    [state.outfits],
  );

  const deleteOutfit = useCallback(
    async (id: string) => {
      dispatch({ type: "DELETE_OUTFIT", payload: id });
      const updatedOutfits = state.outfits.filter((outfit) => outfit.id !== id);
      await saveToStorage(updatedOutfits);
    },
    [state.outfits],
  );

  const setCurrentOutfit = useCallback((outfit: Outfit | null) => {
    dispatch({ type: "SET_CURRENT_OUTFIT", payload: outfit });
    if (outfit) {
      dispatch({
        type: "SET_CANVAS_STATE",
        payload: {
          items: outfit.items,
          zoom: 1,
          offsetX: 0,
          offsetY: 0,
          selectedItemId: null,
        },
      });
    }
  }, []);

  const addItemToCanvas = useCallback(
    (item: ClothingItem) => {
      const newItem: OutfitItem = {
        clothingId: item.id,
        x: 100 + Math.random() * 100,
        y: 100 + Math.random() * 100,
        width: 150,
        height: 200,
        rotation: 0,
        zIndex: state.canvasState.items.length,
      };
      dispatch({
        type: "SET_CANVAS_STATE",
        payload: {
          items: [...state.canvasState.items, newItem],
        },
      });
    },
    [state.canvasState.items],
  );

  const removeItemFromCanvas = useCallback(
    (clothingId: string) => {
      dispatch({
        type: "SET_CANVAS_STATE",
        payload: {
          items: state.canvasState.items.filter(
            (item) => item.clothingId !== clothingId,
          ),
        },
      });
    },
    [state.canvasState.items],
  );

  const updateItemPosition = useCallback(
    (
      clothingId: string,
      position: { x: number; y: number; rotation?: number },
    ) => {
      dispatch({
        type: "SET_CANVAS_STATE",
        payload: {
          items: state.canvasState.items.map((item) =>
            item.clothingId === clothingId ? { ...item, ...position } : item,
          ),
        },
      });
    },
    [state.canvasState.items],
  );

  const selectCanvasItem = useCallback((itemId: string | null) => {
    dispatch({ type: "SET_CANVAS_STATE", payload: { selectedItemId: itemId } });
  }, []);

  const setCanvasZoom = useCallback((zoom: number) => {
    dispatch({ type: "SET_CANVAS_STATE", payload: { zoom } });
  }, []);

  const setCanvasOffset = useCallback((offsetX: number, offsetY: number) => {
    dispatch({ type: "SET_CANVAS_STATE", payload: { offsetX, offsetY } });
  }, []);

  const saveCurrentOutfit = useCallback(async () => {
    if (!state.currentOutfit) return;

    dispatch({ type: "SET_SAVING", payload: true });
    try {
      await updateOutfit(state.currentOutfit.id, {
        items: state.canvasState.items,
      });
      dispatch({ type: "SET_SAVING", payload: false });
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: "Failed to save outfit" });
      dispatch({ type: "SET_SAVING", payload: false });
    }
  }, [state.currentOutfit, state.canvasState.items, updateOutfit]);

  const toggleFavorite = useCallback(
    async (id: string) => {
      const outfit = state.outfits.find((o) => o.id === id);
      if (outfit) {
        await updateOutfit(id, { isFavorite: !outfit.isFavorite });
      }
    },
    [state.outfits, updateOutfit],
  );

  const getOutfitsByOccasion = useCallback(
    (occasion: string) =>
      state.outfits.filter((outfit) => outfit.occasions.includes(occasion)),
    [state.outfits],
  );

  const getOutfitsBySeason = useCallback(
    (season: string) =>
      state.outfits.filter((outfit) => outfit.seasons.includes(season)),
    [state.outfits],
  );

  const clearError = useCallback(() => {
    dispatch({ type: "SET_ERROR", payload: null });
  }, []);

  const value: OutfitContextValue = {
    ...state,
    loadOutfits,
    createOutfit,
    updateOutfit,
    deleteOutfit,
    setCurrentOutfit,
    addItemToCanvas,
    removeItemFromCanvas,
    updateItemPosition,
    selectCanvasItem,
    setCanvasZoom,
    setCanvasOffset,
    saveCurrentOutfit,
    toggleFavorite,
    getOutfitsByOccasion,
    getOutfitsBySeason,
    clearError,
  };

  return (
    <OutfitContext.Provider value={value}>{children}</OutfitContext.Provider>
  );
}

export function useOutfit() {
  const context = useContext(OutfitContext);
  if (!context) {
    throw new Error("useOutfit must be used within an OutfitProvider");
  }
  return context;
}

export default OutfitContext;
