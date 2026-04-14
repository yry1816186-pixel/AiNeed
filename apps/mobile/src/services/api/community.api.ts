import apiClient from "./client";
import { ApiResponse, PaginatedResponse } from "../../types";

export interface CommunityPost {
  id: string;
  authorId: string;
  author: {
    id: string;
    nickname: string;
    avatar: string | null;
  };
  title: string;
  content: string;
  category: string;
  images: string[];
  tags: string[];
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  isBookmarked: boolean;
  createdAt: string;
  updatedAt: string;
  outfit?: {
    id: string;
    items: Array<{
      id: string;
      name: string;
      brand: string;
      price: number;
      image: string;
    }>;
  };
}

export interface PostComment {
  id: string;
  authorId: string;
  author: {
    id: string;
    nickname: string;
    avatar: string | null;
  };
  content: string;
  images: string[];
  likesCount: number;
  repliesCount: number;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  nickname: string;
  avatar: string | null;
  bio: string;
  isFollowing: boolean;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  outfitsCount: number;
}

interface BackendCommunityItem {
  id: string;
  authorId: string;
  author?: {
    id: string;
    nickname?: string | null;
    avatar?: string | null;
  } | null;
  title?: string | null;
  content?: string | null;
  category?: string | null;
  images?: string[] | null;
  tags?: string[] | null;
  likeCount?: number | null;
  commentCount?: number | null;
  isLiked?: boolean;
  createdAt?: string;
  updatedAt?: string;
  relatedItems?: Array<{
    id: string;
    name?: string | null;
    mainImage?: string | null;
    price?: number | null;
    brand?: { name?: string | null } | null;
  }>;
  _count?: {
    likes?: number;
    comments?: number;
    replies?: number;
  };
}

interface BackendCommentItem {
  id: string;
  authorId: string;
  author?: {
    id: string;
    nickname?: string | null;
    avatar?: string | null;
  } | null;
  content?: string | null;
  images?: string[] | null;
  likeCount?: number | null;
  createdAt?: string;
  _count?: {
    replies?: number;
  };
}

interface BackendMeta {
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
}

interface BackendPaginatedResponse<T> {
  data?: T[];
  meta?: BackendMeta;
}

const communityCategoryMap: Record<string, string> = {
  outfit: "outfit_share",
  recommend: "item_review",
  style: "style_tips",
  ootd: "brand_story",
};

function normalizeCategory(category?: string): string | undefined {
  if (!category || category === "all") {
    return undefined;
  }

  return communityCategoryMap[category] ?? category;
}

function normalizeCommunityPost(
  post: BackendCommunityItem,
): CommunityPost {
  const relatedItems = (post.relatedItems ?? []).map((item) => ({
    id: item.id,
    name: item.name ?? "",
    brand: item.brand?.name ?? "",
    price: item.price ?? 0,
    image: item.mainImage ?? "",
  }));

  return {
    id: post.id,
    authorId: post.authorId,
    author: {
      id: post.author?.id ?? "",
      nickname: post.author?.nickname ?? "User",
      avatar: post.author?.avatar ?? null,
    },
    title: post.title ?? "",
    content: post.content ?? "",
    category: post.category ?? "",
    images: post.images ?? [],
    tags: post.tags ?? [],
    likesCount: post.likeCount ?? post._count?.likes ?? 0,
    commentsCount: post.commentCount ?? post._count?.comments ?? 0,
    isLiked: post.isLiked ?? false,
    isBookmarked: false,
    createdAt: post.createdAt ?? new Date(0).toISOString(),
    updatedAt: post.updatedAt ?? post.createdAt ?? new Date(0).toISOString(),
    outfit:
      relatedItems.length > 0
        ? {
            id: `${post.id}-related-items`,
            items: relatedItems,
          }
        : undefined,
  };
}

function normalizePostComment(comment: BackendCommentItem): PostComment {
  return {
    id: comment.id,
    authorId: comment.authorId,
    author: {
      id: comment.author?.id ?? "",
      nickname: comment.author?.nickname ?? "User",
      avatar: comment.author?.avatar ?? null,
    },
    content: comment.content ?? "",
    images: comment.images ?? [],
    likesCount: comment.likeCount ?? 0,
    repliesCount: comment._count?.replies ?? 0,
    createdAt: comment.createdAt ?? new Date(0).toISOString(),
  };
}

function normalizePaginatedResponse<TInput, TOutput>(
  response: ApiResponse<BackendPaginatedResponse<TInput>>,
  itemMapper: (item: TInput) => TOutput,
): ApiResponse<PaginatedResponse<TOutput>> {
  if (!response.success || !response.data) {
    return {
      success: false,
      error:
        response.error ?? {
          code: "COMMUNITY_REQUEST_FAILED",
          message: "Failed to load community data",
        },
    };
  }

  const items = (response.data.data ?? []).map(itemMapper);
  const meta = response.data.meta ?? {};
  const page = meta.page ?? 1;
  const pageSize = meta.pageSize ?? items.length;
  const total = meta.total ?? items.length;
  const totalPages =
    meta.totalPages ?? (pageSize > 0 ? Math.ceil(total / pageSize) : 0);

  return {
    success: true,
    data: {
      items,
      total,
      page,
      pageSize,
      limit: pageSize,
      totalPages,
      hasMore: page * pageSize < total,
    },
  };
}

export const communityApi = {
  async getPosts(params?: {
    category?: string;
    tags?: string[];
    authorId?: string;
    sort?: "latest" | "popular" | "trending";
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<CommunityPost>>> {
    const response = await apiClient.get<BackendPaginatedResponse<BackendCommunityItem>>(
      "/community/posts",
      {
        authorId: params?.authorId,
        category: normalizeCategory(params?.category),
        tags: params?.tags,
        sortBy: params?.sort,
        page: params?.page,
        pageSize: params?.limit,
      },
    );

    return normalizePaginatedResponse(response, normalizeCommunityPost);
  },

  async getFollowingPosts(params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<CommunityPost>>> {
    const response = await apiClient.get<BackendPaginatedResponse<BackendCommunityItem>>(
      "/community/posts/following",
      {
        page: params?.page,
        pageSize: params?.limit,
      },
    );

    return normalizePaginatedResponse(response, normalizeCommunityPost);
  },

  async getRecommendedPosts(params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<CommunityPost>>> {
    const response = await apiClient.get<BackendPaginatedResponse<BackendCommunityItem>>(
      "/community/posts/recommended",
      {
        page: params?.page,
        pageSize: params?.limit,
      },
    );

    return normalizePaginatedResponse(response, normalizeCommunityPost);
  },

  async getPostById(id: string): Promise<ApiResponse<CommunityPost>> {
    const response = await apiClient.get<BackendCommunityItem>(
      `/community/posts/${id}`,
    );

    if (!response.success || !response.data) {
      return {
        success: false,
        error:
          response.error ?? {
            code: "COMMUNITY_POST_NOT_FOUND",
            message: "Failed to load community post",
          },
      };
    }

    return {
      success: true,
      data: normalizeCommunityPost(response.data),
    };
  },

  async createPost(data: {
    title: string;
    content: string;
    category?: string;
    images?: string[];
    tags?: string[];
    outfitId?: string;
  }): Promise<ApiResponse<CommunityPost>> {
    const response = await apiClient.post<BackendCommunityItem>(
      "/community/posts",
      {
        title: data.title,
        content: data.content,
        category: normalizeCategory(data.category),
        images: data.images,
        tags: data.tags,
      },
    );

    if (!response.success || !response.data) {
      return {
        success: false,
        error:
          response.error ?? {
            code: "COMMUNITY_POST_CREATE_FAILED",
            message: "Failed to create community post",
          },
      };
    }

    return {
      success: true,
      data: normalizeCommunityPost(response.data),
    };
  },

  async updatePost(
    id: string,
    data: Partial<{
      title: string;
      content: string;
      category: string;
      images: string[];
      tags: string[];
    }>,
  ): Promise<ApiResponse<CommunityPost>> {
    const response = await apiClient.put<BackendCommunityItem>(
      `/community/posts/${id}`,
      {
        ...data,
        category: normalizeCategory(data.category),
      },
    );

    if (!response.success || !response.data) {
      return {
        success: false,
        error:
          response.error ?? {
            code: "COMMUNITY_POST_UPDATE_FAILED",
            message: "Failed to update community post",
          },
      };
    }

    return {
      success: true,
      data: normalizeCommunityPost(response.data),
    };
  },

  async deletePost(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/community/posts/${id}`);
  },

  async toggleLike(postId: string): Promise<ApiResponse<{ liked: boolean }>> {
    return apiClient.post<{ liked: boolean }>(
      `/community/posts/${postId}/like`,
    );
  },

  async getComments(
    postId: string,
    params?: { page?: number; limit?: number },
  ): Promise<ApiResponse<PaginatedResponse<PostComment>>> {
    const response = await apiClient.get<BackendPaginatedResponse<BackendCommentItem>>(
      `/community/posts/${postId}/comments`,
      {
        page: params?.page,
        pageSize: params?.limit,
      },
    );

    return normalizePaginatedResponse(response, normalizePostComment);
  },

  async addComment(
    postId: string,
    data: { content: string; images?: string[] },
  ): Promise<ApiResponse<PostComment>> {
    const response = await apiClient.post<BackendCommentItem>(
      `/community/posts/${postId}/comments`,
      data,
    );

    if (!response.success || !response.data) {
      return {
        success: false,
        error:
          response.error ?? {
            code: "COMMUNITY_COMMENT_CREATE_FAILED",
            message: "Failed to create comment",
          },
      };
    }

    return {
      success: true,
      data: normalizePostComment(response.data),
    };
  },

  async toggleFollow(
    userId: string,
  ): Promise<ApiResponse<{ following: boolean }>> {
    return apiClient.post<{ following: boolean }>(
      `/community/users/${userId}/follow`,
    );
  },

  async getFollowingFeed(params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<CommunityPost & { feedType?: string }>>> {
    const response = await apiClient.get<BackendPaginatedResponse<BackendCommunityItem & { feedType?: string }>>(
      "/community/following/feed",
      {
        page: params?.page,
        pageSize: params?.limit,
      },
    );

    return normalizePaginatedResponse(
      response as ApiResponse<BackendPaginatedResponse<BackendCommunityItem & { feedType?: string }>>,
      (item) => ({
        ...normalizeCommunityPost(item),
        feedType: (item as BackendCommunityItem & { feedType?: string }).feedType,
      }),
    ) as ApiResponse<PaginatedResponse<CommunityPost & { feedType?: string }>>;
  },

  async getTrending(params?: {
    type?: string;
    limit?: number;
  }): Promise<ApiResponse<Array<{ name: string; direction: string; count?: number }>>> {
    return apiClient.get<Array<{ name: string; direction: string; count?: number }>>(
      "/community/trending",
      {
        type: params?.type,
        limit: params?.limit,
      },
    );
  },

  async bookmarkPost(
    postId: string,
    data?: { collectionId?: string },
  ): Promise<ApiResponse<{ bookmarked: boolean }>> {
    return apiClient.post<{ bookmarked: boolean }>(
      `/community/posts/${postId}/bookmark`,
      data ?? {},
    );
  },

  async sharePost(postId: string): Promise<ApiResponse<{ shared: boolean }>> {
    return apiClient.post<{ shared: boolean }>(
      `/community/posts/${postId}/share`,
    );
  },

  async reportContent(data: {
    targetType: string;
    targetId: string;
    reason: string;
    description?: string;
  }): Promise<ApiResponse<{ reported: boolean }>> {
    return apiClient.post<{ reported: boolean }>(
      "/community/reports",
      data,
    );
  },

  async getCollections(): Promise<ApiResponse<Array<{ id: string; name: string; icon: string; _count: { items: number } }>>> {
    return apiClient.get<Array<{ id: string; name: string; icon: string; _count: { items: number } }>>(
      "/wardrobe/collections",
    );
  },

  async createCollection(data: {
    name: string;
    icon?: string;
  }): Promise<ApiResponse<{ id: string; name: string }>> {
    return apiClient.post<{ id: string; name: string }>(
      "/wardrobe/collections",
      data,
    );
  },

  async getUserProfile(userId: string): Promise<ApiResponse<{
    id: string;
    nickname: string;
    avatar: string | null;
    bio: string;
    bloggerLevel?: string | null;
    followersCount: number;
    followingCount: number;
    postsCount: number;
    isFollowing: boolean;
  }>> {
    return apiClient.get(`/community/users/${userId}/profile`);
  },
};
