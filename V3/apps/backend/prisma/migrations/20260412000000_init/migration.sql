CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 1. users
CREATE TABLE "users" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "phone" VARCHAR(20) UNIQUE,
    "email" VARCHAR(255) UNIQUE,
    "password_hash" VARCHAR(255),
    "nickname" VARCHAR(50),
    "avatar_url" TEXT,
    "gender" VARCHAR(10),
    "birth_year" INTEGER,
    "height" INTEGER,
    "weight" INTEGER,
    "body_type" VARCHAR(20),
    "color_season" VARCHAR(20),
    "role" VARCHAR(20) DEFAULT 'user',
    "language" VARCHAR(10) DEFAULT 'zh',
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- 1a. body_profiles
CREATE TABLE "body_profiles" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE UNIQUE,
    "body_type" VARCHAR(20),
    "color_season" VARCHAR(20),
    "measurements" JSONB,
    "analysis_result" JSONB,
    "source_image_url" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX "idx_body_profiles_user" ON "body_profiles"("user_id");

-- 2. user_style_preferences
CREATE TABLE "user_style_preferences" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID REFERENCES "users"("id") ON DELETE CASCADE,
    "style_tags" TEXT[],
    "occasion_tags" TEXT[],
    "color_preferences" TEXT[],
    "budget_range" VARCHAR(20),
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);

-- 3. categories
CREATE TABLE "categories" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "name_en" VARCHAR(100),
    "slug" VARCHAR(100) UNIQUE NOT NULL,
    "parent_id" UUID REFERENCES "categories"("id"),
    "sort_order" INTEGER DEFAULT 0
);

-- 4. brands
CREATE TABLE "brands" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" VARCHAR(200) NOT NULL,
    "logo_url" TEXT,
    "description" TEXT
);

-- 5. clothing_items
CREATE TABLE "clothing_items" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "brand_id" UUID REFERENCES "brands"("id"),
    "category_id" UUID REFERENCES "categories"("id"),
    "name" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2),
    "original_price" DECIMAL(10,2),
    "currency" VARCHAR(3) DEFAULT 'CNY',
    "gender" VARCHAR(10),
    "seasons" TEXT[],
    "occasions" TEXT[],
    "style_tags" TEXT[],
    "colors" TEXT[],
    "materials" TEXT[],
    "fit_type" VARCHAR(20),
    "image_urls" TEXT[],
    "source_url" TEXT,
    "purchase_url" TEXT,
    "source_name" VARCHAR(100),
    "embedding" vector(1024),
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX "idx_clothing_category" ON "clothing_items"("category_id");
CREATE INDEX "idx_clothing_brand" ON "clothing_items"("brand_id");
CREATE INDEX "idx_clothing_active_gender" ON "clothing_items"("gender") WHERE "is_active" = true;
CREATE INDEX "idx_clothing_embedding" ON "clothing_items" USING ivfflat ("embedding" vector_cosine_ops);

-- 6. outfits
CREATE TABLE "outfits" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID REFERENCES "users"("id"),
    "name" VARCHAR(200),
    "description" TEXT,
    "occasion" VARCHAR(50),
    "season" VARCHAR(20),
    "style_tags" TEXT[],
    "is_public" BOOLEAN DEFAULT false,
    "likes_count" INTEGER DEFAULT 0,
    "comments_count" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);

-- 7. outfit_items
CREATE TABLE "outfit_items" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "outfit_id" UUID REFERENCES "outfits"("id") ON DELETE CASCADE,
    "clothing_id" UUID REFERENCES "clothing_items"("id"),
    "slot" VARCHAR(20) NOT NULL,
    "sort_order" INTEGER DEFAULT 0
);

-- 8. chat_sessions
CREATE TABLE "chat_sessions" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID REFERENCES "users"("id") ON DELETE CASCADE,
    "title" VARCHAR(200),
    "context" JSONB,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- 9. chat_messages
CREATE TABLE "chat_messages" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "session_id" UUID REFERENCES "chat_sessions"("id") ON DELETE CASCADE,
    "role" VARCHAR(20) NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX "idx_chat_messages_session" ON "chat_messages"("session_id", "created_at" ASC);

-- 10. tryon_results
CREATE TABLE "tryon_results" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID REFERENCES "users"("id") ON DELETE CASCADE,
    "clothing_id" UUID REFERENCES "clothing_items"("id"),
    "source_image_url" TEXT NOT NULL,
    "result_image_url" TEXT,
    "provider" VARCHAR(50),
    "status" VARCHAR(20) DEFAULT 'pending',
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX "idx_tryon_results_user" ON "tryon_results"("user_id", "created_at" DESC);

-- 11. user_interactions
CREATE TABLE "user_interactions" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID REFERENCES "users"("id") ON DELETE CASCADE,
    "clothing_id" UUID REFERENCES "clothing_items"("id"),
    "interaction_type" VARCHAR(20) NOT NULL,
    "duration_ms" INTEGER,
    "context" JSONB,
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX "idx_user_interactions_user" ON "user_interactions"("user_id", "created_at" DESC);

-- 12. wardrobe_items
CREATE TABLE "wardrobe_items" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID REFERENCES "users"("id") ON DELETE CASCADE,
    "clothing_id" UUID REFERENCES "clothing_items"("id"),
    "custom_name" VARCHAR(200),
    "image_url" TEXT,
    "category" VARCHAR(50),
    "color" VARCHAR(50),
    "brand" VARCHAR(100),
    "notes" TEXT,
    "added_at" TIMESTAMPTZ DEFAULT NOW()
);

-- 13. favorites
CREATE TABLE "favorites" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID REFERENCES "users"("id") ON DELETE CASCADE,
    "target_type" VARCHAR(20) NOT NULL,
    "target_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE("user_id", "target_type", "target_id")
);
CREATE INDEX "idx_favorites_target" ON "favorites"("target_type", "target_id");

-- 14. style_rules
CREATE TABLE "style_rules" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "category" VARCHAR(50) NOT NULL,
    "rule_type" VARCHAR(20) NOT NULL,
    "condition" JSONB NOT NULL,
    "recommendation" TEXT NOT NULL,
    "priority" INTEGER DEFAULT 0,
    "is_active" BOOLEAN DEFAULT true
);

-- 15. community_posts
CREATE TABLE "community_posts" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID REFERENCES "users"("id") ON DELETE CASCADE,
    "title" VARCHAR(200),
    "content" TEXT NOT NULL,
    "image_urls" TEXT[],
    "tags" TEXT[],
    "outfit_id" UUID REFERENCES "outfits"("id"),
    "likes_count" INTEGER DEFAULT 0,
    "comments_count" INTEGER DEFAULT 0,
    "shares_count" INTEGER DEFAULT 0,
    "is_featured" BOOLEAN DEFAULT false,
    "status" VARCHAR(20) DEFAULT 'published',
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX "idx_community_posts_user" ON "community_posts"("user_id", "created_at" DESC);
CREATE INDEX "idx_community_posts_featured" ON "community_posts"("is_featured", "created_at" DESC) WHERE "is_featured" = true;
CREATE INDEX "idx_community_posts_status" ON "community_posts"("status");

-- 16. post_comments
CREATE TABLE "post_comments" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "post_id" UUID REFERENCES "community_posts"("id") ON DELETE CASCADE,
    "user_id" UUID REFERENCES "users"("id") ON DELETE CASCADE,
    "parent_id" UUID REFERENCES "post_comments"("id"),
    "content" TEXT NOT NULL,
    "likes_count" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX "idx_post_comments_post" ON "post_comments"("post_id", "created_at" ASC);

-- 17. user_follows
CREATE TABLE "user_follows" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "follower_id" UUID REFERENCES "users"("id") ON DELETE CASCADE,
    "following_id" UUID REFERENCES "users"("id") ON DELETE CASCADE,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE("follower_id", "following_id")
);
CREATE INDEX "idx_user_follows_following" ON "user_follows"("following_id");

-- 18. chat_rooms
CREATE TABLE "chat_rooms" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);

-- 18a. chat_room_participants
CREATE TABLE "chat_room_participants" (
    "room_id" UUID NOT NULL REFERENCES "chat_rooms"("id") ON DELETE CASCADE,
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "joined_at" TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY ("room_id", "user_id")
);
CREATE INDEX "idx_room_participants_user" ON "chat_room_participants"("user_id");
CREATE INDEX "idx_room_participants_room" ON "chat_room_participants"("room_id");

-- 19. direct_messages
CREATE TABLE "direct_messages" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "room_id" UUID REFERENCES "chat_rooms"("id") ON DELETE CASCADE,
    "sender_id" UUID REFERENCES "users"("id") ON DELETE CASCADE,
    "content" TEXT NOT NULL,
    "message_type" VARCHAR(20) DEFAULT 'text',
    "is_read" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX "idx_direct_messages_room" ON "direct_messages"("room_id", "created_at" ASC);

-- 20. notifications
CREATE TABLE "notifications" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID REFERENCES "users"("id") ON DELETE CASCADE,
    "type" VARCHAR(30) NOT NULL,
    "title" VARCHAR(200),
    "content" TEXT,
    "reference_id" UUID,
    "reference_type" VARCHAR(30),
    "is_read" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX "idx_notifications_user" ON "notifications"("user_id", "created_at" DESC) WHERE "is_read" = false;

-- 21. avatar_templates
CREATE TABLE "avatar_templates" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "gender" VARCHAR(10) NOT NULL,
    "thumbnail_url" VARCHAR(500),
    "drawing_config" JSONB NOT NULL,
    "parameters" JSONB NOT NULL,
    "default_clothing_map" JSONB,
    "is_active" BOOLEAN DEFAULT true,
    "sort_order" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);

-- 22. user_avatars
CREATE TABLE "user_avatars" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "template_id" UUID NOT NULL REFERENCES "avatar_templates"("id"),
    "avatar_params" JSONB NOT NULL,
    "clothing_map" JSONB,
    "thumbnail_url" VARCHAR(500),
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE("user_id") WHERE "is_active" = true
);
CREATE INDEX "idx_user_avatars_user" ON "user_avatars"("user_id") WHERE "is_active" = true;

-- 23. custom_designs
CREATE TABLE "custom_designs" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "name" VARCHAR(200) NOT NULL,
    "design_data" JSONB NOT NULL,
    "pattern_image_url" VARCHAR(500),
    "preview_image_url" VARCHAR(500),
    "product_type" VARCHAR(50) NOT NULL,
    "product_template_id" UUID,
    "is_public" BOOLEAN DEFAULT false,
    "price" INTEGER,
    "likes_count" INTEGER DEFAULT 0,
    "purchases_count" INTEGER DEFAULT 0,
    "downloads_count" INTEGER DEFAULT 0,
    "tags" TEXT[],
    "status" VARCHAR(20) DEFAULT 'draft',
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX "idx_custom_designs_user" ON "custom_designs"("user_id", "created_at" DESC);
CREATE INDEX "idx_custom_designs_public" ON "custom_designs"("is_public", "created_at" DESC) WHERE "is_public" = true;
CREATE INDEX "idx_custom_designs_product" ON "custom_designs"("product_type");

-- 24. custom_orders
CREATE TABLE "custom_orders" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "design_id" UUID NOT NULL REFERENCES "custom_designs"("id"),
    "product_type" VARCHAR(50) NOT NULL,
    "material" VARCHAR(50) NOT NULL,
    "size" VARCHAR(10) NOT NULL,
    "quantity" INTEGER DEFAULT 1,
    "unit_price" INTEGER NOT NULL,
    "total_price" INTEGER NOT NULL,
    "status" VARCHAR(20) DEFAULT 'pending',
    "pod_order_id" VARCHAR(100),
    "tracking_number" VARCHAR(100),
    "shipping_address" JSONB NOT NULL,
    "payment_info" JSONB,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX "idx_custom_orders_user" ON "custom_orders"("user_id", "created_at" DESC);
CREATE INDEX "idx_custom_orders_status" ON "custom_orders"("status");

-- 25. product_templates
CREATE TABLE "product_templates" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "product_type" VARCHAR(50) NOT NULL,
    "material" VARCHAR(50) NOT NULL,
    "base_cost" INTEGER NOT NULL,
    "suggested_price" INTEGER NOT NULL,
    "uv_map_url" VARCHAR(500) NOT NULL,
    "preview_model_url" VARCHAR(500),
    "available_sizes" TEXT[] NOT NULL,
    "print_area" JSONB NOT NULL,
    "pod_provider" VARCHAR(50),
    "pod_product_id" VARCHAR(100),
    "is_active" BOOLEAN DEFAULT true
);
CREATE INDEX "idx_product_templates_type" ON "product_templates"("product_type", "material");

-- 26. design_likes
CREATE TABLE "design_likes" (
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "design_id" UUID NOT NULL REFERENCES "custom_designs"("id") ON DELETE CASCADE,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY ("user_id", "design_id")
);

-- 27. design_reports
CREATE TABLE "design_reports" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "reporter_id" UUID NOT NULL REFERENCES "users"("id"),
    "design_id" UUID NOT NULL REFERENCES "custom_designs"("id"),
    "reason" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "review_result" JSONB,
    "status" VARCHAR(20) DEFAULT 'pending',
    "reviewed_by" UUID REFERENCES "users"("id"),
    "reviewed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX "idx_design_reports_design" ON "design_reports"("design_id");
CREATE INDEX "idx_design_reports_status" ON "design_reports"("status");

-- 28. bespoke_studios
CREATE TABLE "bespoke_studios" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL REFERENCES "users"("id"),
    "name" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(100) UNIQUE NOT NULL,
    "logo_url" VARCHAR(500),
    "cover_image_url" VARCHAR(500),
    "description" TEXT,
    "city" VARCHAR(50),
    "address" TEXT,
    "specialties" TEXT[],
    "service_types" TEXT[],
    "price_range" VARCHAR(20),
    "portfolio_images" TEXT[],
    "rating" DECIMAL(3,2) DEFAULT 0,
    "review_count" INTEGER DEFAULT 0,
    "order_count" INTEGER DEFAULT 0,
    "is_verified" BOOLEAN DEFAULT false,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX "idx_bespoke_studios_city" ON "bespoke_studios"("city") WHERE "is_active" = true;
CREATE INDEX "idx_bespoke_studios_verified" ON "bespoke_studios"("is_verified", "rating" DESC) WHERE "is_active" = true AND "is_verified" = true;

-- 29. bespoke_orders
CREATE TABLE "bespoke_orders" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "studio_id" UUID NOT NULL REFERENCES "bespoke_studios"("id"),
    "status" VARCHAR(20) DEFAULT 'submitted',
    "title" VARCHAR(200),
    "description" TEXT NOT NULL,
    "reference_images" TEXT[],
    "budget_range" VARCHAR(50),
    "deadline" DATE,
    "measurements" JSONB,
    "assigned_stylist_id" UUID REFERENCES "users"("id"),
    "status_history" JSONB DEFAULT '[]',
    "completed_at" TIMESTAMPTZ,
    "cancelled_at" TIMESTAMPTZ,
    "cancel_reason" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX "idx_bespoke_orders_user" ON "bespoke_orders"("user_id", "created_at" DESC);
CREATE INDEX "idx_bespoke_orders_studio" ON "bespoke_orders"("studio_id", "status");
CREATE INDEX "idx_bespoke_orders_status" ON "bespoke_orders"("status");

-- 30. bespoke_messages
CREATE TABLE "bespoke_messages" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL REFERENCES "bespoke_orders"("id") ON DELETE CASCADE,
    "sender_id" UUID NOT NULL REFERENCES "users"("id"),
    "content" TEXT NOT NULL,
    "message_type" VARCHAR(20) DEFAULT 'text',
    "attachments" TEXT[],
    "is_read" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX "idx_bespoke_messages_order" ON "bespoke_messages"("order_id", "created_at" ASC);

-- 31. bespoke_quotes
CREATE TABLE "bespoke_quotes" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL REFERENCES "bespoke_orders"("id") ON DELETE CASCADE,
    "studio_id" UUID NOT NULL REFERENCES "bespoke_studios"("id"),
    "total_price" INTEGER NOT NULL,
    "items" JSONB NOT NULL,
    "estimated_days" INTEGER,
    "valid_until" TIMESTAMPTZ,
    "notes" TEXT,
    "status" VARCHAR(20) DEFAULT 'pending',
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX "idx_bespoke_quotes_order" ON "bespoke_quotes"("order_id", "created_at" DESC);

-- 32. bespoke_reviews
CREATE TABLE "bespoke_reviews" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL REFERENCES "bespoke_orders"("id"),
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "studio_id" UUID NOT NULL REFERENCES "bespoke_studios"("id"),
    "rating" INTEGER NOT NULL CHECK ("rating" >= 1 AND "rating" <= 5),
    "content" TEXT,
    "images" TEXT[],
    "is_anonymous" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE("order_id")
);
CREATE INDEX "idx_bespoke_reviews_studio" ON "bespoke_reviews"("studio_id", "created_at" DESC);

-- 33. outfit_images
CREATE TABLE "outfit_images" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "outfit_data" JSONB NOT NULL,
    "prompt" TEXT,
    "image_url" TEXT,
    "status" VARCHAR(20) DEFAULT 'pending',
    "cost" INTEGER DEFAULT 0,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX "idx_outfit_images_user" ON "outfit_images"("user_id", "created_at" DESC);
CREATE INDEX "idx_outfit_images_status" ON "outfit_images"("status");

-- Prisma migration lock
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id" VARCHAR(36) NOT NULL PRIMARY KEY,
    "checksum" VARCHAR(64) NOT NULL,
    "finished_at" TIMESTAMPTZ,
    "migration_name" VARCHAR(255) NOT NULL,
    "logs" TEXT,
    "rolled_back_at" TIMESTAMPTZ,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0
);
