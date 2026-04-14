export type ProductTemplateType =
  | "tshirt"
  | "hat"
  | "shoes"
  | "bag"
  | "phone_case"
  | "mug";

export type DesignLayerType = "image" | "text" | "shape";

export interface CustomizationTemplate {
  id: string;
  type: ProductTemplateType;
  name: string;
  description?: string;
  imageUrl: string;
  basePrice: number;
  printableArea: PrintableAreaBounds;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PrintableAreaBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  maxWidth: number;
  maxHeight: number;
}

export interface CustomizationDesign {
  id: string;
  userId: string;
  templateId: string;
  canvasData: Record<string, unknown>;
  previewUrl?: string;
  layers: CustomizationDesignLayer[];
  createdAt: string;
  updatedAt: string;
}

export interface CustomizationDesignLayer {
  id: string;
  designId: string;
  type: DesignLayerType;
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
  rotation: number;
  opacity: number;
  zIndex: number;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  imageUrl?: string;
  shapeType?: string;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
}

export interface CreateDesignRequest {
  templateId: string;
  canvasData: Record<string, unknown>;
}

export interface UpdateDesignRequest {
  canvasData: Record<string, unknown>;
  layers?: CustomizationDesignLayer[];
}

export interface QuoteCalculationResponse {
  quoteId: string;
  pricing: {
    basePrice: number;
    complexitySurcharge: number;
    textSurcharge: number;
    sideSurcharge: number;
    totalPrice: number;
    currency: string;
    estimatedDays: number;
  };
}

export interface PreviewResponse {
  previewUrl: string;
  designId: string;
}

export interface CreateFromDesignResponse {
  id: string;
  status: string;
}

export interface PaymentResponse {
  paymentId: string;
  status: string;
  paymentUrl?: string;
}

export interface ProductionStatusResponse {
  status: string;
  trackingNumber?: string;
  carrier?: string;
  estimatedDelivery?: string;
  progress: number;
}

export type CustomizationType =
  | "tailored"
  | "bespoke"
  | "alteration"
  | "design"
  | "pod";

export type CustomizationStatus =
  | "draft"
  | "submitted"
  | "quoting"
  | "confirmed"
  | "in_progress"
  | "shipped"
  | "completed"
  | "cancelled";

export interface CustomizationQuote {
  id: string;
  providerId: string;
  providerName: string;
  price: number;
  currency: string;
  estimatedDays: number;
  description: string;
  createdAt: string;
}

export interface CustomizationRequest {
  id: string;
  userId: string;
  type: CustomizationType;
  description: string;
  referenceImages: string[];
  preferences: Record<string, unknown>;
  status: CustomizationStatus;
  quotes?: CustomizationQuote[];
  selectedQuoteId?: string;
  designId?: string;
  templateId?: string;
  previewImageUrl?: string;
  trackingNumber?: string;
  carrier?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomizationDto {
  type: CustomizationType;
  description: string;
  referenceImages?: string[];
  preferences?: Record<string, unknown>;
}

export interface UpdateCustomizationDto {
  type?: CustomizationType;
  description?: string;
  referenceImages?: string[];
  preferences?: Record<string, unknown>;
  status?: CustomizationStatus;
}
