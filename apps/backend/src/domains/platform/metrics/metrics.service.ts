/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@nestjs/common';
import {
  Counter,
  Histogram,
  Gauge,
  register,
} from 'prom-client';

// HTTP 请求指标
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'] as const,
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'] as const,
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5, 10],
});

// 数据库指标
export const dbConnectionsActive = new Gauge({
  name: 'db_connections_active',
  help: 'Number of active database connections',
});

export const dbConnectionsIdle = new Gauge({
  name: 'db_connections_idle',
  help: 'Number of idle database connections',
});

export const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['query_type', 'table'] as const,
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
});

// Redis 指标
export const redisConnectionsActive = new Gauge({
  name: 'redis_connections_active',
  help: 'Number of active Redis connections',
});

export const redisCacheHits = new Counter({
  name: 'redis_cache_hits_total',
  help: 'Total number of Redis cache hits',
});

export const redisCacheMisses = new Counter({
  name: 'redis_cache_misses_total',
  help: 'Total number of Redis cache misses',
});

// 业务指标 - 用户
export const userRegistrations = new Counter({
  name: 'user_registrations_total',
  help: 'Total number of user registrations',
  labelNames: ['source'] as const,
});

export const userLogins = new Counter({
  name: 'user_logins_total',
  help: 'Total number of user logins',
  labelNames: ['method'] as const,
});

export const activeUsersGauge = new Gauge({
  name: 'active_users_count',
  help: 'Number of currently active users',
});

// 业务指标 - 风格档案
export const styleProfilesCreated = new Counter({
  name: 'style_profiles_created_total',
  help: 'Total number of style profiles created',
});

// 业务指标 - 照片
export const photosUploaded = new Counter({
  name: 'photos_uploaded_total',
  help: 'Total number of photos uploaded',
  labelNames: ['type'] as const,
});

// 业务指标 - 服装
export const clothingItemsAdded = new Counter({
  name: 'clothing_items_added_total',
  help: 'Total number of clothing items added',
  labelNames: ['category'] as const,
});

// 业务指标 - 收藏
export const favoritesAdded = new Counter({
  name: 'favorites_added_total',
  help: 'Total number of favorites added',
  labelNames: ['item_type'] as const,
});

// 业务指标 - 推荐
export const recommendationsServed = new Counter({
  name: 'recommendations_served_total',
  help: 'Total number of recommendations served',
  labelNames: ['type'] as const,
});

export const recommendationsClicked = new Counter({
  name: 'recommendations_clicked_total',
  help: 'Total number of recommendations clicked',
  labelNames: ['type'] as const,
});

// 业务指标 - 虚拟试穿
export const tryOnRequests = new Counter({
  name: 'try_on_requests_total',
  help: 'Total number of virtual try-on requests',
});

export const tryOnCompleted = new Counter({
  name: 'try_on_completed_total',
  help: 'Total number of successful virtual try-ons',
});

export const tryOnErrors = new Counter({
  name: 'try_on_errors_total',
  help: 'Total number of virtual try-on errors',
  labelNames: ['error_type'] as const,
});

export const tryOnDuration = new Histogram({
  name: 'try_on_duration_seconds',
  help: 'Duration of virtual try-on processing in seconds',
  buckets: [1, 2, 5, 10, 20, 30, 60, 120],
});

// 业务指标 - AI 造型师
export const aiStylistConversations = new Counter({
  name: 'ai_stylist_conversations_total',
  help: 'Total number of AI stylist conversations',
});

export const aiStylistMessages = new Counter({
  name: 'ai_stylist_messages_total',
  help: 'Total number of AI stylist messages',
  labelNames: ['direction'] as const, // 'user' or 'ai'
});

// 业务指标 - 风格分析
export const styleAnalysisTotal = new Counter({
  name: 'style_analysis_total',
  help: 'Total number of style analyses performed',
  labelNames: ['type'] as const,
});

// 业务指标 - 订单
export const ordersCreated = new Counter({
  name: 'orders_created_total',
  help: 'Total number of orders created',
  labelNames: ['status'] as const,
});

export const ordersFailed = new Counter({
  name: 'orders_failed_total',
  help: 'Total number of failed orders',
  labelNames: ['reason'] as const,
});

export const orderValue = new Histogram({
  name: 'order_value_dollars',
  help: 'Value of orders in dollars',
  buckets: [10, 25, 50, 100, 200, 500, 1000],
});

// 业务指标 - 支付
export const paymentsInitiated = new Counter({
  name: 'payments_initiated_total',
  help: 'Total number of payments initiated',
  labelNames: ['method'] as const,
});

export const paymentsCompleted = new Counter({
  name: 'payments_completed_total',
  help: 'Total number of payments completed',
  labelNames: ['method'] as const,
});

export const paymentsFailed = new Counter({
  name: 'payments_failed_total',
  help: 'Total number of failed payments',
  labelNames: ['method', 'reason'] as const,
});

// 业务指标 - 订阅
export const subscriptionsCreated = new Counter({
  name: 'subscriptions_created_total',
  help: 'Total number of subscriptions created',
  labelNames: ['plan'] as const,
});

export const subscriptionsCanceled = new Counter({
  name: 'subscriptions_canceled_total',
  help: 'Total number of subscriptions canceled',
  labelNames: ['plan', 'reason'] as const,
});

export const subscriptionActiveTotal = new Gauge({
  name: 'subscription_active_total',
  help: 'Number of active subscriptions',
  labelNames: ['plan'] as const,
});

// 业务指标 - 营收
export const revenueTotal = new Counter({
  name: 'revenue_total',
  help: 'Total revenue in dollars',
  labelNames: ['source'] as const,
});

// AI 服务指标
export const aiServiceCalls = new Counter({
  name: 'ai_service_calls_total',
  help: 'Total number of AI service calls',
  labelNames: ['endpoint'] as const,
});

export const aiServiceErrors = new Counter({
  name: 'ai_service_errors_total',
  help: 'Total number of AI service errors',
  labelNames: ['endpoint', 'error_type'] as const,
});

export const aiServiceDuration = new Histogram({
  name: 'ai_service_duration_seconds',
  help: 'Duration of AI service calls in seconds',
  labelNames: ['endpoint'] as const,
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
});

// 向量搜索指标
export const vectorSearchTotal = new Counter({
  name: 'vector_search_total',
  help: 'Total number of vector searches',
  labelNames: ['collection'] as const,
});

export const vectorSearchDuration = new Histogram({
  name: 'vector_search_duration_seconds',
  help: 'Duration of vector searches in seconds',
  labelNames: ['collection'] as const,
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5],
});

// 文件存储指标
export const storageUploads = new Counter({
  name: 'storage_uploads_total',
  help: 'Total number of file uploads',
  labelNames: ['bucket', 'type'] as const,
});

export const storageUploadBytes = new Counter({
  name: 'storage_upload_bytes_total',
  help: 'Total bytes uploaded to storage',
  labelNames: ['bucket'] as const,
});

export const gpuMemoryUsedBytes = new Gauge({
  name: 'gpu_memory_used_bytes',
  help: 'GPU memory currently used in bytes',
  labelNames: ['device'] as const,
});

export const gpuMemoryTotalBytes = new Gauge({
  name: 'gpu_memory_total_bytes',
  help: 'Total GPU memory in bytes',
  labelNames: ['device'] as const,
});

export const gpuModelLoaded = new Gauge({
  name: 'gpu_model_loaded',
  help: 'Whether the ML model is loaded (1=loaded, 0=not loaded)',
  labelNames: ['model'] as const,
});

@Injectable()
export class MetricsService {
  // HTTP 请求记录方法
  recordHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    duration: number,
  ) {
    httpRequestsTotal.labels(method, route, statusCode.toString()).inc();
    httpRequestDuration
      .labels(method, route, statusCode.toString())
      .observe(duration);
  }

  // 数据库连接更新
  updateDbConnections(active: number, idle: number) {
    dbConnectionsActive.set(active);
    dbConnectionsIdle.set(idle);
  }

  // Redis 连接更新
  updateRedisConnections(active: number) {
    redisConnectionsActive.set(active);
  }

  // 缓存命中/未命中
  recordCacheHit() {
    redisCacheHits.inc();
  }

  recordCacheMiss() {
    redisCacheMisses.inc();
  }

  // 用户注册
  recordUserRegistration(source: string = 'email') {
    userRegistrations.labels(source).inc();
  }

  // 用户登录
  recordUserLogin(method: string = 'password') {
    userLogins.labels(method).inc();
  }

  // 活跃用户
  setActiveUsers(count: number) {
    activeUsersGauge.set(count);
  }

  // 风格档案创建
  recordStyleProfileCreated() {
    styleProfilesCreated.inc();
  }

  // 照片上传
  recordPhotoUpload(type: string = 'user') {
    photosUploaded.labels(type).inc();
  }

  // 服装添加
  recordClothingAdded(category: string = 'unknown') {
    clothingItemsAdded.labels(category).inc();
  }

  // 收藏添加
  recordFavoriteAdded(itemType: string) {
    favoritesAdded.labels(itemType).inc();
  }

  // 推荐服务
  recordRecommendationServed(type: string = 'style') {
    recommendationsServed.labels(type).inc();
  }

  recordRecommendationClicked(type: string = 'style') {
    recommendationsClicked.labels(type).inc();
  }

  // 虚拟试穿
  recordTryOnRequest() {
    tryOnRequests.inc();
  }

  recordTryOnCompleted(duration?: number) {
    tryOnCompleted.inc();
    if (duration) {
      tryOnDuration.observe(duration);
    }
  }

  recordTryOnError(errorType: string = 'unknown') {
    tryOnErrors.labels(errorType).inc();
  }

  // AI 造型师
  recordAIStylistConversation() {
    aiStylistConversations.inc();
  }

  recordAIStylistMessage(direction: 'user' | 'ai') {
    aiStylistMessages.labels(direction).inc();
  }

  // 风格分析
  recordStyleAnalysis(type: string = 'photo') {
    styleAnalysisTotal.labels(type).inc();
  }

  // 订单
  recordOrderCreated(status: string = 'pending', value?: number) {
    ordersCreated.labels(status).inc();
    if (value) {
      orderValue.observe(value);
    }
  }

  recordOrderFailed(reason: string = 'unknown') {
    ordersFailed.labels(reason).inc();
  }

  // 支付
  recordPaymentInitiated(method: string = 'credit_card') {
    paymentsInitiated.labels(method).inc();
  }

  recordPaymentCompleted(method: string = 'credit_card') {
    paymentsCompleted.labels(method).inc();
  }

  recordPaymentFailed(method: string, reason: string = 'unknown') {
    paymentsFailed.labels(method, reason).inc();
  }

  // 订阅
  recordSubscriptionCreated(plan: string = 'basic') {
    subscriptionsCreated.labels(plan).inc();
  }

  recordSubscriptionCanceled(plan: string, reason: string = 'user_request') {
    subscriptionsCanceled.labels(plan, reason).inc();
  }

  setActiveSubscriptions(plan: string, count: number) {
    subscriptionActiveTotal.labels(plan).set(count);
  }

  // 营收
  recordRevenue(amount: number, source: string = 'subscription') {
    revenueTotal.labels(source).inc(amount);
  }

  // AI 服务
  recordAIServiceCall(endpoint: string) {
    aiServiceCalls.labels(endpoint).inc();
  }

  recordAIServiceError(endpoint: string, errorType: string = 'unknown') {
    aiServiceErrors.labels(endpoint, errorType).inc();
  }

  recordAIServiceDuration(endpoint: string, duration: number) {
    aiServiceDuration.labels(endpoint).observe(duration);
  }

  // 向量搜索
  recordVectorSearch(collection: string, duration: number) {
    vectorSearchTotal.labels(collection).inc();
    vectorSearchDuration.labels(collection).observe(duration);
  }

  // 文件存储
  recordStorageUpload(bucket: string, type: string, bytes: number) {
    storageUploads.labels(bucket, type).inc();
    storageUploadBytes.labels(bucket).inc(bytes);
  }

  updateGpuMemory(device: string, usedBytes: number, totalBytes: number) {
    gpuMemoryUsedBytes.labels(device).set(usedBytes);
    gpuMemoryTotalBytes.labels(device).set(totalBytes);
  }

  updateModelLoaded(model: string, loaded: boolean) {
    gpuModelLoaded.labels(model).set(loaded ? 1 : 0);
  }
}
