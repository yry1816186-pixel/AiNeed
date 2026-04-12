export interface OrderRow {
  id: string;
  userId: string;
  studioId: string;
  status: string;
  title: string | null;
  description: string;
  referenceImages: string[];
  budgetRange: string | null;
  deadline: Date | null;
  measurements: unknown;
  assignedStylistId: string | null;
  statusHistory: unknown;
  completedAt: Date | null;
  cancelledAt: Date | null;
  cancelReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderWithStudioRow extends OrderRow {
  studio?: {
    id: string;
    name: string;
    logoUrl: string | null;
    city: string | null;
    specialties: string[];
    rating: unknown;
  };
}

export interface QuoteRow {
  id: string;
  orderId: string;
  studioId: string;
  totalPrice: number;
  items: unknown;
  estimatedDays: number | null;
  validUntil: Date | null;
  notes: string | null;
  status: string;
  createdAt: Date;
}

export function formatOrder(order: OrderRow) {
  return {
    id: order.id,
    userId: order.userId,
    studioId: order.studioId,
    status: order.status,
    title: order.title,
    description: order.description,
    referenceImages: order.referenceImages,
    budgetRange: order.budgetRange,
    deadline: order.deadline ? order.deadline.toISOString().split('T')[0] : undefined,
    measurements: order.measurements as Record<string, unknown> | undefined,
    assignedStylistId: order.assignedStylistId,
    statusHistory: order.statusHistory as Array<{
      status: string;
      at: string;
      by: string;
      note?: string;
    }>,
    completedAt: order.completedAt?.toISOString(),
    cancelledAt: order.cancelledAt?.toISOString(),
    cancelReason: order.cancelReason,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

export function formatOrderWithStudio(order: OrderWithStudioRow) {
  const formatted = formatOrder(order);
  return {
    ...formatted,
    studio: order.studio
      ? {
          id: order.studio.id,
          name: order.studio.name,
          logoUrl: order.studio.logoUrl,
          city: order.studio.city,
          specialties: order.studio.specialties,
          rating: Number(order.studio.rating),
        }
      : undefined,
  };
}

export function formatQuote(quote: QuoteRow) {
  return {
    id: quote.id,
    orderId: quote.orderId,
    studioId: quote.studioId,
    totalPrice: quote.totalPrice,
    items: quote.items as Array<{
      name: string;
      description?: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
    }>,
    estimatedDays: quote.estimatedDays,
    validUntil: quote.validUntil?.toISOString(),
    notes: quote.notes,
    status: quote.status,
    createdAt: quote.createdAt.toISOString(),
  };
}
