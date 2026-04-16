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
  createdAt: Date;
  updatedAt: Date;
}

export enum CustomizationType {
  Tailored = 'tailored',
  Bespoke = 'bespoke',
  Alteration = 'alteration',
  Design = 'design',
}

export enum CustomizationStatus {
  Draft = 'draft',
  Submitted = 'submitted',
  Quoting = 'quoting',
  Confirmed = 'confirmed',
  InProgress = 'in_progress',
  Shipped = 'shipped',
  Completed = 'completed',
  Cancelled = 'cancelled',
}

export interface CustomizationQuote {
  id: string;
  providerId: string;
  providerName: string;
  price: number;
  currency: string;
  estimatedDays: number;
  description: string;
  createdAt: Date;
}
