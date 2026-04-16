import { create } from "zustand";

import customizationApi from "../../../services/api/customization.api";
import type {
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";
  CustomizationTemplate as ApiTemplate,
  CustomizationDesign,
  CustomizationDesignLayer,
  ProductTemplateType,
  QuoteCalculationResponse,
  PreviewResponse,
  CreateFromDesignResponse,
} from "../../../types/customization";

export type { PrintableAreaBounds } from "../../../types/customization";
export type DesignLayer = Omit<CustomizationDesignLayer, "designId">;
export type Template = ApiTemplate;

// ==================== Types ====================

interface EditorState {
  selectedTemplate: Template | null;
  designLayers: DesignLayer[];
  selectedLayerId: string | null;
  canvasData: Record<string, unknown>;
  designId: string | null;
  isLoading: boolean;
  isSaving: boolean;
  previewUrl: string | null;
  quote: {
    basePrice: number;
    complexitySurcharge: number;
    textSurcharge: number;
    sideSurcharge: number;
    totalPrice: number;
    currency: string;
    estimatedDays: number;
    quoteId: string;
  } | null;
  templates: Template[];
  isLoadingTemplates: boolean;
  error: string | null;
}

interface EditorActions {
  loadTemplates: (type?: ProductTemplateType) => Promise<void>;
  selectTemplate: (template: Template) => void;
  addImageLayer: (imageUri: string, width: number, height: number) => void;
  addTextLayer: (text: string, fontSize?: number, color?: string) => void;
  updateLayerPosition: (layerId: string, x: number, y: number) => void;
  updateLayerScale: (layerId: string, scale: number) => void;
  updateLayerRotation: (layerId: string, rotation: number) => void;
  updateLayerProperty: (layerId: string, props: Partial<DesignLayer>) => void;
  removeLayer: (layerId: string) => void;
  reorderLayers: (layerIds: string[]) => void;
  setSelectedLayer: (layerId: string | null) => void;
  saveDesign: () => Promise<void>;
  calculateQuote: (printSide: "front" | "back" | "both") => Promise<void>;
  generatePreview: () => Promise<void>;
  submitCustomization: (quoteId: string) => Promise<string | null>;
  setError: (message: string) => void;
  clearError: () => void;
  reset: () => void;
}

let layerCounter = 0;

const generateLayerId = () => {
  layerCounter += 1;
  return `layer_${Date.now()}_${layerCounter}`;
};

const initialState: EditorState = {
  selectedTemplate: null,
  designLayers: [],
  selectedLayerId: null,
  canvasData: {},
  designId: null,
  isLoading: false,
  isSaving: false,
  previewUrl: null,
  quote: null,
  templates: [],
  isLoadingTemplates: false,
  error: null,
};

export const useCustomizationEditorStore = create<EditorState & EditorActions>((set, get) => ({
  ...initialState,

  loadTemplates: async (type?: ProductTemplateType) => {
    set({ isLoadingTemplates: true, error: null });
    try {
      const response = await customizationApi.getTemplates(type);
      if (response.success && response.data) {
        set({ templates: response.data as Template[] });
      }
    } catch {
      set({ error: '获取模板失败', isLoadingTemplates: false });
    } finally {
      set({ isLoadingTemplates: false });
    }
  },

  selectTemplate: (template: Template) => {
    set({
      selectedTemplate: template,
      designLayers: [],
      selectedLayerId: null,
      canvasData: {},
      designId: null,
      previewUrl: null,
      quote: null,
    });
  },

  addImageLayer: (imageUri: string, width: number, height: number) => {
    const state = get();
    const newLayer: DesignLayer = {
      id: generateLayerId(),
      type: "image",
      x: 50,
      y: 50,
      width: Math.min(width, 150),
      height: Math.min(height, 150),
      scale: 1,
      rotation: 0,
      opacity: 1,
      zIndex: state.designLayers.length,
      content: imageUri,
      imageUrl: imageUri,
    };
    set({
      designLayers: [...state.designLayers, newLayer],
      selectedLayerId: newLayer.id,
    });
  },

  addTextLayer: (text: string, fontSize = 24, color = DesignTokens.colors.neutral.black) => {
    const state = get();
    const newLayer: DesignLayer = {
      id: generateLayerId(),
      type: "text",
      x: 50,
      y: 50,
      width: 200,
      height: fontSize + 10,
      scale: 1,
      rotation: 0,
      opacity: 1,
      zIndex: state.designLayers.length,
      content: text,
      fontSize,
      color,
    };
    set({
      designLayers: [...state.designLayers, newLayer],
      selectedLayerId: newLayer.id,
    });
  },

  updateLayerPosition: (layerId: string, x: number, y: number) => {
    set((state) => ({
      designLayers: state.designLayers.map((l) => (l.id === layerId ? { ...l, x, y } : l)),
    }));
  },

  updateLayerScale: (layerId: string, scale: number) => {
    set((state) => ({
      designLayers: state.designLayers.map((l) =>
        l.id === layerId ? { ...l, scale: Math.max(0.1, Math.min(5, scale)) } : l
      ),
    }));
  },

  updateLayerRotation: (layerId: string, rotation: number) => {
    set((state) => ({
      designLayers: state.designLayers.map((l) => (l.id === layerId ? { ...l, rotation } : l)),
    }));
  },

  updateLayerProperty: (layerId: string, props: Partial<DesignLayer>) => {
    set((state) => ({
      designLayers: state.designLayers.map((l) => (l.id === layerId ? { ...l, ...props } : l)),
    }));
  },

  removeLayer: (layerId: string) => {
    set((state) => ({
      designLayers: state.designLayers.filter((l) => l.id !== layerId),
      selectedLayerId: state.selectedLayerId === layerId ? null : state.selectedLayerId,
    }));
  },

  reorderLayers: (layerIds: string[]) => {
    set((state) => {
      const reordered = layerIds
        .map((id, index) => {
          const layer = state.designLayers.find((l) => l.id === id);
          return layer ? { ...layer, zIndex: index } : null;
        })
        .filter(Boolean) as DesignLayer[];
      return { designLayers: reordered };
    });
  },

  setSelectedLayer: (layerId: string | null) => {
    set({ selectedLayerId: layerId });
  },

  saveDesign: async () => {
    const state = get();
    if (!state.selectedTemplate) {
      return;
    }

    set({ isSaving: true, error: null });
    try {
      const canvasData = {
        layers: state.designLayers,
        templateId: state.selectedTemplate.id,
      };

      if (state.designId) {
        await customizationApi.updateDesign(state.designId, {
          canvasData,
          layers: state.designLayers.map((layer) => ({
            ...layer,
            designId: state.designId ?? "",
          })) as CustomizationDesignLayer[],
        });
      } else {
        const response = await customizationApi.createDesign(state.selectedTemplate.id, canvasData);
        if (response.success && response.data) {
          const design = response.data as CustomizationDesign;
          set({ designId: design.id });
        }
      }
    } catch {
      set({ error: '保存设计失败', isSaving: false });
    } finally {
      set({ isSaving: false });
    }
  },

  calculateQuote: async (printSide: "front" | "back" | "both" = "front") => {
    const state = get();
    if (!state.designId) {
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const response = await customizationApi.calculateQuote(state.designId, printSide);
      if (response.success && response.data) {
        const data = response.data as QuoteCalculationResponse;
        set({
          quote: {
            basePrice: data.pricing?.basePrice ?? 0,
            complexitySurcharge: data.pricing?.complexitySurcharge ?? 0,
            textSurcharge: data.pricing?.textSurcharge ?? 0,
            sideSurcharge: data.pricing?.sideSurcharge ?? 0,
            totalPrice: data.pricing?.totalPrice ?? 0,
            currency: data.pricing?.currency ?? "CNY",
            estimatedDays: data.pricing?.estimatedDays ?? 3,
            quoteId: data.quoteId ?? "",
          },
        });
      }
    } catch {
      set({ error: '获取报价失败' });
    } finally {
      set({ isLoading: false });
    }
  },

  generatePreview: async () => {
    const state = get();
    if (!state.designId) {
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const response = await customizationApi.generatePreview(state.designId);
      if (response.success && response.data) {
        const previewData = response.data as PreviewResponse;
        set({ previewUrl: previewData.previewUrl });
      }
    } catch {
      set({ error: '生成预览失败' });
    } finally {
      set({ isLoading: false });
    }
  },

  submitCustomization: async (quoteId: string) => {
    const state = get();
    if (!state.designId) {
      return null;
    }

    set({ isLoading: true, error: null });
    try {
      const response = await customizationApi.createFromDesign(state.designId, quoteId);
      if (response.success && response.data) {
        const result = response.data as CreateFromDesignResponse;
        return result.id;
      }
      return null;
    } catch {
      set({ error: '提交定制订单失败' });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  setError: (message: string) => set({ error: message }),
  clearError: () => set({ error: null }),

  reset: () => {
    set(initialState);
  },
}));
