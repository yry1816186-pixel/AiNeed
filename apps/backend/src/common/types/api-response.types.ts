/**
 * Unified API Response Types
 * 
 * This file defines standard response formats used across the backend and frontend.
 * All services should return responses matching these interfaces for consistency.
 */

/**
 * Standard paginated response format
 * 
 * @template T - Type of items in the data array
 */
export interface PaginatedResponse<T> {
  /**
   * Array of items on the current page
   */
  items: T[];

  /**
   * Total number of items across all pages
   */
  total: number;

  /**
   * Current page number (1-indexed)
   */
  page: number;

  /**
   * Number of items per page (replaces 'limit' for consistency with frontend)
   */
  pageSize: number;

  /**
   * Legacy field name (for backward compatibility)
   * @deprecated Use pageSize instead
   */
  limit: number;

  /**
   * Whether there are more items available
   * Calculated as: page * pageSize < total
   */
  hasMore: boolean;

  /**
   * Total number of pages (optional, for display purposes)
   */
  totalPages?: number;
}

/**
 * Standard API response wrapper
 * 
 * @template T - Type of data payload
 */
export interface ApiResponse<T> {
  /**
   * Success indicator
   */
  success: boolean;
  
  /**
   * Response data payload
   */
  data?: T;
  
  /**
   * Error information (if success is false)
   */
  error?: ApiError;
  
  /**
   * Additional message or description
   */
  message?: string;
  
  /**
   * Response timestamp
   */
  timestamp?: string;
  
  /**
   * Request path
   */
  path?: string;
}

/**
 * Standard error format
 */
export interface ApiError {
  /**
   * Error code
   */
  code: string;
  
  /**
   * Human-readable error message
   */
  message: string;
  
  /**
   * Additional error details
   */
  details?: Record<string, unknown>;
  
  /**
   * HTTP status code
   */
  statusCode?: number;
}

/**
 * Pagination parameters for API requests
 */
export interface PaginationParams {
  /**
   * Page number (1-indexed)
   */
  page?: number;
  
  /**
   * Number of items per page
   */
  pageSize?: number;
  
  /**
   * Legacy parameter name for backward compatibility
   * @deprecated Use pageSize instead
   */
  limit?: number;
  
  /**
   * Field to sort by
   */
  sortBy?: string;
  
  /**
   * Sort direction
   */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Helper function to create a paginated response
 * 
 * @param items - Array of items
 * @param total - Total number of items
 * @param page - Current page number
 * @param pageSize - Items per page
 * @returns Standardized paginated response
 */
export function createPaginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / pageSize);
  const hasMore = page * pageSize < total;

  return {
    items,
    total,
    page,
    pageSize,
    limit: pageSize, // Legacy field for backward compatibility
    hasMore,
    totalPages,
  };
}

/**
 * Helper function to normalize pagination parameters
 * 
 * @param params - Pagination parameters
 * @returns Normalized parameters with consistent field names
 */
export function normalizePaginationParams(
  params: PaginationParams,
): { page: number; pageSize: number; sortBy?: string; sortOrder?: 'asc' | 'desc' } {
  return {
    page: params.page ?? 1,
    pageSize: params.pageSize ?? params.limit ?? 20,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  };
}
