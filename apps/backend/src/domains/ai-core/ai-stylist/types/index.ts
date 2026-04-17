/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * AI Stylist Module - Type Definitions
 * 
 * This file exports all type definitions used across the AI stylist module.
 * Types are organized by domain for better maintainability.
 */

// ==================== GLM-5 Integration Types ====================

export interface PropertyDefinition {
  type: string;
  description: string;
  enum?: string[];
  properties?: Record<string, PropertyDefinition>;
  items?: { type: string; description?: string };
  required?: string[];
}

export interface GLM5FunctionTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: PropertyDefinition;
  };
}

export interface FunctionCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface FunctionResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

// ==================== LLM Response Types ====================

export interface GLM5Message {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: GLM5ToolCall[];
}

export interface GLM5ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface GLM5Choice {
  index: number;
  message: GLM5Message;
  finish_reason: string;
}

export interface GLM5Response {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: GLM5Choice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// ==================== Clothing Item Types ====================

import { ClothingCategory , TryOnStatus , BodyType, SkinTone, ColorSeason } from "../../../../../types/prisma-enums";

export interface ClothingItemBasic {
  id: string;
  name: string;
  category: ClothingCategory;
  colors: string[];
  tags: string[];
  images: string[];
  price: number;
  brand?: {
    id: string;
    name: string;
    logo: string | null;
  };
  viewCount: number;
  likeCount: number;
}

// ==================== Style Analysis Types ====================

export interface StyleAnalysisResult {
  style: string;
  confidence: number;
  keywords: string[];
  occasions: string[];
  seasons: string[];
  attributes: Record<string, unknown>;
}

// ==================== Try-On Response Types ====================



export interface TryOnServiceResponse {
  success: boolean;
  result_image_url?: string;
  error?: string;
  processing_time?: number;
}

// ==================== Tool Execution Types ====================

export interface ToolExecutionResult {
  toolName: string;
  success: boolean;
  result: unknown;
  executionTime: number;
}

export interface AgentLoopResult {
  response: string;
  toolCalls: ToolExecutionResult[];
}

// ==================== Tool Input/Output Types ====================



export interface GetUserProfileInput {
  userId: string;
}

export interface UserProfileResult {
  userId: string;
  bodyType: BodyType | null;
  bodyTypeName: string | null;
  skinTone: SkinTone | null;
  colorSeason: ColorSeason | null;
  height: number | null;
  weight: number | null;
  stylePreferences: string[];
  colorPreferences: string[];
}

export interface SearchClothingInput {
  query: string;
  filters?: {
    category?: ClothingCategory;
    colors?: string[];
    styles?: string[];
    priceMin?: number;
    priceMax?: number;
  };
  limit?: number;
  offset?: number;
  userId?: string;
}

export interface ClothingSearchResult {
  items: ClothingItemBasic[];
  total: number;
  hasMore: boolean;
}

export interface RecommendOutfitInput {
  context: {
    occasion?: string;
    weather?: string;
    stylePreference?: string;
    userId?: string;
  };
  preferences?: {
    preferredColors?: string[];
    avoidedColors?: string[];
  };
}

export interface OutfitRecommendationResult {
  outfitId: string;
  styleAnalysis: StyleAnalysisResult;
  items: ClothingItemBasic[];
  compatibilityScore: number;
}

export interface VirtualTryOnInput {
  personImage: {
    photoId?: string;
    imageUrl?: string;
  };
  outfit: {
    itemId?: string;
  };
}

export interface VirtualTryOnResult {
  tryOnId: string;
  status: TryOnStatus;
  resultImageUrl: string | null;
  estimatedWaitTime?: number;
}

export interface RecordUserDecisionInput {
  sessionId: string;
  decision: {
    type: "post_like" | "click" | "try_on_complete" | "purchase" | "favorite";
    itemId?: string;
    reason?: string;
  };
}

export interface UserDecisionResult {
  success: boolean;
  recorded: boolean;
}

// ==================== System Context Types ====================

export interface GitContextInfo {
  branch: string;
  lastCommit: string;
  lastCommitAuthor: string;
  lastCommitDate: string;
  lastCommitMessage: string;
  isCleanWorkingTree: boolean;
  changedFiles: number;
  totalCommits: string;
}

export interface DatabaseStatsInfo {
  totalUsers: number;
  totalClothingItems: number;
  activeClothingItems: number;
  totalBrands: number;
  totalCategories: number;
  totalSessions: number;
  activeSessions: number;
  totalTryOns: number;
  completedTryOns: number;
  totalPhotos: number;
  analyzedPhotos: number;
  totalFeedbackRecords: number;
  recentUsers24h: number;
  recentTryOns24h: number;
}

export interface ServiceHealthInfo {
  backend: { status: string; uptimeMs: number; version: string };
  postgresql: { status: string; latencyMs: number };
  redis: { status: string; latencyMs: number };
  qdrant: { status: string; latencyMs: number };
  minio: { status: string; latencyMs: number };
  llmProvider: { provider: string; model: string; status: string };
}

export interface SystemResourcesInfo {
  nodeVersion: string;
  platform: string;
  arch: string;
  memoryUsageMb: Record<string, number>;
  cpuUsage: number;
  uptimeSeconds: number;
  processId: number;
}

export interface ProjectFilesInfo {
  totalTypeScriptFiles: number;
  totalPythonFiles: number;
  backendModuleCount: number;
  mlServiceCount: number;
  packageJsonDeps: number;
  prismaModels: number;
}

export interface SystemContextResult {
  timestamp: string;
  environment: string;
  git: GitContextInfo;
  database: DatabaseStatsInfo;
  services: ServiceHealthInfo;
  resources: SystemResourcesInfo;
  projectFiles: ProjectFilesInfo;
}

export interface GetSystemContextInput {
  refresh?: boolean;
  section?: "git" | "database" | "services" | "resources" | "files" | "all";
}

// ==================== ML Service Types ====================

export interface MLItemRecommendation {
  item_id?: string;
  category?: string;
  reasons?: string[];
  price?: number;
  brand?: string;
  score?: number;
}

export interface MLOutfitRecommendation {
  items?: MLItemRecommendation[];
  style_analysis?: StyleAnalysisResult;
}

// ==================== User Profile Types ====================

export interface StylistContextUserProfile {
  bodyType?: string;
  skinTone?: string;
  faceShape?: string;
  colorSeason?: string;
  height?: number;
  weight?: number;
  stylePreferences?: Array<{ name?: string } | string>;
}

export interface StylistContext {
  userProfile?: StylistContextUserProfile | null;
  recentBehaviors?: Array<{ type: string; data: unknown }>;
  preferences?: Record<string, Record<string, number>>;
}

// ==================== Session Types ====================

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export type StylistActionType =
  | "ask_question"
  | "show_preference_buttons"
  | "request_photo_upload"
  | "poll_analysis"
  | "confirm_preferences"
  | "generate_outfit"
  | "show_outfit_cards";

export interface StylistAction {
  type: StylistActionType;
  field?: string;
  options?: string[];
  canSkip?: boolean;
  photoType?: import("../../../../../types/prisma-enums").PhotoType;
}

export interface StylistSlots {
  occasion?: string;
  weather?: string;
  budgetMin?: number;
  budgetMax?: number;
  latitude?: number;
  longitude?: number;
  preferredStyles: string[];
  styleAvoidances: string[];
  fitGoals: string[];
  preferredColors: string[];
}

export interface StylistBodyProfile {
  bodyType?: string;
  skinTone?: string;
  faceShape?: string;
  colorSeason?: string;
  height?: number;
  weight?: number;
  shapeFeatures: string[];
}

export interface StylistSessionState {
  sceneReady: boolean;
  bodyReady: boolean;
  styleReady: boolean;
  candidateReady: boolean;
  commerceReady: boolean;
  currentStage: string;
  slots: StylistSlots;
  bodyProfile: StylistBodyProfile;
  lastPhotoId?: string;
  lastPhotoStatus?: string;
  photoRequested?: boolean;
  photoSkipped?: boolean;
}

export interface StylistOutfitItem {
  itemId?: string;
  category: string;
  name: string;
  reason: string;
  imageUrl?: string;
  externalUrl?: string | null;
  price?: number | null;
  brand?: string | null;
  score?: number;
}

export interface StylistOutfitPlan {
  title: string;
  items: StylistOutfitItem[];
  styleExplanation: string[];
  estimatedTotalPrice?: number;
}

export interface StylistResolution {
  lookSummary: string;
  whyItFits: string[];
  outfits: StylistOutfitPlan[];
}

export interface StylistProgress {
  stage: string;
  title: string;
  detail: string;
  etaSeconds?: number;
  canLeaveAndResume: boolean;
  isWaiting: boolean;
}

export interface ChatResult {
  success: boolean;
  message: string;
  assistantMessage: string;
  timestamp: string;
  sessionId?: string;
  nextAction?: StylistAction;
  sessionState?: StylistSessionState;
  slotUpdates?: Partial<StylistSlots>;
  missingFields?: string[];
  previewRecommendations?: StylistOutfitItem[];
  result?: StylistResolution;
  photoId?: string;
  analysisStatus?: string;
  progress?: StylistProgress;
  sessionExpiresAt?: string;
  isFallback?: boolean;
  error?: string;
  isAIGenerated?: boolean;
  aiDisclaimer?: string;
}

// ==================== Decision Engine Types ====================

export type DecisionNodeType = "style" | "top" | "bottom" | "color" | "fit";

export interface DecisionNode {
  nodeId: string;
  nodeType: DecisionNodeType;
  question: string;
  options: DecisionOption[];
  llmReasoning: string;
  parentNodeId?: string;
  depth: number;
}

export interface DecisionOption {
  optionId: string;
  content: DecisionOptionContent;
  displayName: string;
  description?: string;
  imageUrl?: string;
  fitScore: number;
  styleScore: number;
  preferenceScore: number;
  compositeScore: number;
}

export interface DecisionOptionContent {
  itemId?: string;
  category?: ClothingCategory;
  styleTags?: string[];
  colorTags?: string[];
  fitAttributes?: string[];
  attributes?: Record<string, unknown>;
}

export interface UserDecision {
  id: string;
  sessionId: string;
  nodeId: string;
  nodeType: DecisionNodeType;
  chosenOptionId: string;
  rejectedOptionIds: string[];
  decisionTime: number;
  timestamp: Date;
}

export interface SerializedDecision {
  id: string;
  sessionId: string;
  nodeId: string;
  nodeType: DecisionNodeType;
  chosenOptionId: string;
  rejectedOptionIds: string[];
  decisionTime: number;
  timestamp: string;
}

export interface DecisionTree {
  treeId: string;
  sessionId: string;
  userId: string;
  rootNodeId: string;
  currentNodeId: string;
  nodes: Map<string, DecisionNode>;
  decisions: UserDecision[];
  status: DecisionTreeStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type DecisionTreeStatus = "active" | "completed" | "expired";

export interface UserProfile {
  userId: string;
  bodyType?: string;
  skinTone?: string;
  colorSeason?: string;
  height?: number;
  weight?: number;
  stylePreferences: string[];
  colorPreferences: string[];
  fitGoals: string[];
  behaviorHistory: BehaviorRecord[];
}

export interface BehaviorRecord {
  type: string;
  category?: string;
  value?: string;
  weight: number;
  timestamp: Date;
}

export interface DecisionContext {
  occasion?: string;
  weather?: string;
  season?: string;
  budgetMin?: number;
  budgetMax?: number;
  preferredStyles: string[];
  styleAvoidances: string[];
  fitGoals: string[];
  preferredColors: string[];
}

export interface CreateDecisionTreeInput {
  userId: string;
  sessionId: string;
  context: DecisionContext;
  userProfile: UserProfile;
}

export interface RecordDecisionInput {
  sessionId: string;
  nodeId: string;
  chosenOptionId: string;
  rejectedOptionIds?: string[];
  decisionTime?: number;
}

export interface DecisionTreeResult {
  success: boolean;
  tree?: DecisionTree;
  currentNode?: DecisionNode;
  nextNode?: DecisionNode;
  isComplete: boolean;
  message: string;
}

// ==================== NL Slot Extraction Types ====================

export interface ExtractedSlots {
  occasion: string | null;
  preferredStyles: string[];
  fitGoals: string[];
  preferredColors: string[];
  styleAvoidances: string[];
  budgetMax: number | null;
  budgetMin: number | null;
  weather: string | null;
  photoSkip: boolean;
}

export interface ExtractionResult {
  slots: Partial<ExtractedSlots>;
  rawResponse: string | null;
  usedLlm: boolean;
  confidence: number;
}

// ==================== LLM Provider Types ====================

export type LlmProvider = "deepseek" | "qwen" | "zhipu" | "openai" | "custom";

export interface LlmChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
}

export interface LlmChatResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  provider: LlmProvider;
  finishReason: string;
}

export interface LlmStructuredResponse<T = Record<string, unknown>> {
  raw: LlmChatResponse;
  parsed: T | null;
  parseError: string | null;
}

export interface LlmHealthCheck {
  provider: LlmProvider;
  model: string;
  available: boolean;
  latencyMs: number | null;
  error: string | null;
}

export interface LlmStreamChunk {
  delta: string;
  finishReason: string | null;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * LLM API response structure for chat completions.
 */
export interface LlmChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string | null;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Configuration for a single LLM provider endpoint.
 */
export interface LlmProviderConfig {
  provider: LlmProvider;
  apiKey: string;
  endpoint: string;
  model: string;
  maxTokens: number;
  temperature: number;
  timeoutMs: number;
}

/**
 * Retry configuration for LLM API calls.
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableStatusCodes: number[];
}

/**
 * Usage metrics logged after each request.
 */
export interface LlmUsageMetrics {
  provider: LlmProvider;
  model: string;
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  requestId: string;
  success: boolean;
  fallbackUsed: boolean;
}
