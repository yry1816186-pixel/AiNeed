import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import {
  ClothingItem,
  ClothingFilter,
  ClothingSortOptions,
  ClothingItemInput,
  ClothingCategory,
} from "../types/clothing";
import { clothingApi } from "../services/api/clothing.api";
import { backgroundRemovalService } from "../services/ai";
import { clothingCategorizationService } from "../services/ai";

const CLOTHING_STORAGE_KEY = "@clothing_items";
const _CLOTHING_IMAGES_DIR = `${FileSystem.documentDirectory ?? ""}clothing/`;

interface ClothingState {
  items: ClothingItem[];
  filteredItems: ClothingItem[];
  filter: ClothingFilter;
  sort: ClothingSortOptions;
  selectedId: string | null;
  isLoading: boolean;
  isUploading: boolean;
  error: string | null;
}

type ClothingAction =
  | { type: "SET_ITEMS"; payload: ClothingItem[] }
  | { type: "SET_FILTERED_ITEMS"; payload: ClothingItem[] }
  | { type: "ADD_ITEM"; payload: ClothingItem }
  | {
      type: "UPDATE_ITEM";
      payload: { id: string; data: Partial<ClothingItem> };
    }
  | { type: "DELETE_ITEM"; payload: string }
  | { type: "SET_FILTER"; payload: ClothingFilter }
  | { type: "SET_SORT"; payload: ClothingSortOptions }
  | { type: "SET_SELECTED"; payload: string | null }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_UPLOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null };

const initialState: ClothingState = {
  items: [],
  filteredItems: [],
  filter: {},
  sort: { field: "createdAt", direction: "desc" },
  selectedId: null,
  isLoading: false,
  isUploading: false,
  error: null,
};

function clothingReducer(state: ClothingState, action: ClothingAction): ClothingState {
  switch (action.type) {
    case "SET_ITEMS":
      return { ...state, items: action.payload, isLoading: false };
    case "SET_FILTERED_ITEMS":
      return { ...state, filteredItems: action.payload };
    case "ADD_ITEM":
      const newItems = [action.payload, ...state.items];
      return { ...state, items: newItems };
    case "UPDATE_ITEM":
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.payload.id ? { ...item, ...action.payload.data } : item
        ),
      };
    case "DELETE_ITEM":
      return {
        ...state,
        items: state.items.filter((item) => item.id !== action.payload),
      };
    case "SET_FILTER":
      return { ...state, filter: action.payload };
    case "SET_SORT":
      return { ...state, sort: action.payload };
    case "SET_SELECTED":
      return { ...state, selectedId: action.payload };
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_UPLOADING":
      return { ...state, isUploading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload, isLoading: false };
    default:
      return state;
  }
}

interface ClothingContextValue extends ClothingState {
  loadItems: () => Promise<void>;
  addItem: (data: ClothingItemInput) => Promise<ClothingItem | null>;
  updateItem: (id: string, data: Partial<ClothingItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  incrementWearCount: (id: string) => Promise<void>;
  setFilter: (filter: ClothingFilter) => void;
  setSort: (sort: ClothingSortOptions) => void;
  selectItem: (id: string | null) => void;
  getItemsByCategory: (category: ClothingCategory) => ClothingItem[];
  getFavorites: () => ClothingItem[];
  getRecentItems: (limit?: number) => ClothingItem[];
  clearError: () => void;
}

const ClothingContext = createContext<ClothingContextValue | null>(null);

export function ClothingProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(clothingReducer, initialState);

  useEffect(() => {
    void loadFromStorage();
  }, []);

  useEffect(() => {
    applyFilterAndSort();
  }, [state.items, state.filter, state.sort]);

  const loadFromStorage = async () => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const stored = await AsyncStorage.getItem(CLOTHING_STORAGE_KEY);
      if (stored) {
        const items = JSON.parse(stored);
        dispatch({ type: "SET_ITEMS", payload: items });
      }
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: "Failed to load clothing items" });
    }
  };

  const saveToStorage = async (items: ClothingItem[]) => {
    await AsyncStorage.setItem(CLOTHING_STORAGE_KEY, JSON.stringify(items));
  };

  const applyFilterAndSort = () => {
    let filtered = [...state.items];

    if (state.filter.category) {
      filtered = filtered.filter((item) => item.category === state.filter.category);
    }
    if (state.filter.isFavorite !== undefined) {
      filtered = filtered.filter((item) => item.isFavorite === state.filter.isFavorite);
    }
    if (state.filter.searchQuery) {
      const query = state.filter.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.name?.toLowerCase().includes(query) ||
          item.brand?.toLowerCase().includes(query) ||
          item.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    filtered.sort((a, b) => {
      const field = state.sort.field;
      const direction = state.sort.direction === "asc" ? 1 : -1;
      if (field === "name") {
        return direction * (a.name || "").localeCompare(b.name || "");
      }
      return direction * (new Date(a[field]).getTime() - new Date(b[field]).getTime());
    });

    dispatch({ type: "SET_FILTERED_ITEMS", payload: filtered });
  };

  const loadItems = useCallback(async () => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const response = await clothingApi.getAll();
      if (response.success && response.data) {
        dispatch({ type: "SET_ITEMS", payload: response.data.items });
        await saveToStorage(response.data.items);
      }
    } catch (error) {
      dispatch({ type: "SET_ERROR", payload: "Failed to load items" });
    }
  }, []);

  const addItem = useCallback(
    async (data: ClothingItemInput): Promise<ClothingItem | null> => {
      dispatch({ type: "SET_UPLOADING", payload: true });
      try {
        let imageUri = data.imageUri;

        const bgResult = await backgroundRemovalService.removeBackground(imageUri);
        if (bgResult.success) {
          imageUri = bgResult.imageUri;
        }

        const categorization = await clothingCategorizationService.categorize(imageUri);

        const newItem: ClothingItem = {
          id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          imageUri,
          category: data.category || categorization.category,
          subcategory: data.subcategory || categorization.subcategory,
          name: data.name || categorization.name,
          brand: data.brand || categorization.brand,
          color: data.color || categorization.colors[0] || "",
          colors: categorization.colors,
          style: data.style || categorization.style,
          seasons: data.seasons || categorization.seasons,
          occasions: data.occasions || categorization.occasions,
          tags: data.tags || categorization.tags,
          wearCount: 0,
          isFavorite: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        dispatch({ type: "ADD_ITEM", payload: newItem });
        const updatedItems = [newItem, ...state.items];
        await saveToStorage(updatedItems);

        dispatch({ type: "SET_UPLOADING", payload: false });
        return newItem;
      } catch (error) {
        dispatch({ type: "SET_ERROR", payload: "Failed to add item" });
        dispatch({ type: "SET_UPLOADING", payload: false });
        return null;
      }
    },
    [state.items]
  );

  const updateItem = useCallback(
    async (id: string, data: Partial<ClothingItem>) => {
      dispatch({
        type: "UPDATE_ITEM",
        payload: { id, data: { ...data, updatedAt: new Date().toISOString() } },
      });
      const updatedItems = state.items.map((item) =>
        item.id === id ? { ...item, ...data } : item
      );
      await saveToStorage(updatedItems);
    },
    [state.items]
  );

  const deleteItem = useCallback(
    async (id: string) => {
      dispatch({ type: "DELETE_ITEM", payload: id });
      const updatedItems = state.items.filter((item) => item.id !== id);
      await saveToStorage(updatedItems);
    },
    [state.items]
  );

  const toggleFavorite = useCallback(
    async (id: string) => {
      const item = state.items.find((i) => i.id === id);
      if (item) {
        await updateItem(id, { isFavorite: !item.isFavorite });
      }
    },
    [state.items, updateItem]
  );

  const incrementWearCount = useCallback(
    async (id: string) => {
      const item = state.items.find((i) => i.id === id);
      if (item) {
        await updateItem(id, {
          wearCount: item.wearCount + 1,
          lastWorn: new Date().toISOString(),
        });
      }
    },
    [state.items, updateItem]
  );

  const setFilter = useCallback((filter: ClothingFilter) => {
    dispatch({ type: "SET_FILTER", payload: filter });
  }, []);

  const setSort = useCallback((sort: ClothingSortOptions) => {
    dispatch({ type: "SET_SORT", payload: sort });
  }, []);

  const selectItem = useCallback((id: string | null) => {
    dispatch({ type: "SET_SELECTED", payload: id });
  }, []);

  const getItemsByCategory = useCallback(
    (category: ClothingCategory) => state.items.filter((item) => item.category === category),
    [state.items]
  );

  const getFavorites = useCallback(
    () => state.items.filter((item) => item.isFavorite),
    [state.items]
  );

  const getRecentItems = useCallback(
    (limit: number = 10) =>
      [...state.items]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit),
    [state.items]
  );

  const clearError = useCallback(() => {
    dispatch({ type: "SET_ERROR", payload: null });
  }, []);

  const value: ClothingContextValue = {
    ...state,
    loadItems,
    addItem,
    updateItem,
    deleteItem,
    toggleFavorite,
    incrementWearCount,
    setFilter,
    setSort,
    selectItem,
    getItemsByCategory,
    getFavorites,
    getRecentItems,
    clearError,
  };

  return <ClothingContext.Provider value={value}>{children}</ClothingContext.Provider>;
}

export function useClothing() {
  const context = useContext(ClothingContext);
  if (!context) {
    throw new Error("useClothing must be used within a ClothingProvider");
  }
  return context;
}

export default ClothingContext;
