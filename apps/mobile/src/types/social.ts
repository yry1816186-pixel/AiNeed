/**
 * 社交和社区相关类型定义
 */

// 帖子数据
export interface PostCardData {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  images: string[];
  title?: string;
  content: string;
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
  isBookmarked: boolean;
  tags: string[];
  createdAt: string;
  location?: string;
}

// 评论数据
export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  likes: number;
  isLiked: boolean;
  replies: Comment[];
  createdAt: string;
}

// 用户互动
export interface UserInteraction {
  type: 'like' | 'comment' | 'share' | 'bookmark' | 'follow';
  targetId: string;
  targetType: 'post' | 'comment' | 'user' | 'outfit';
  createdAt: string;
}

// 社交平台
export interface SocialPlatform {
  id: string;
  name: string;
  icon: string;
  shareUrl: string;
  packageName?: string;
}

// 分享选项
export interface ShareOption {
  social: 'weixin' | 'sinaweibo' | 'qq' | 'twitter' | 'facebook' | 'instagram';
  title: string;
  message: string;
  url?: string;
  image?: string;
}

// 分享结果
export interface ShareResult {
  success: boolean;
  platform?: string;
  error?: string;
}

// 通知类型
export interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'recommendation' | 'system';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

// 消息类型
export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  type: 'text' | 'image' | 'outfit' | 'recommendation';
  read: boolean;
  createdAt: string;
}

// 关注关系
export interface FollowRelation {
  followerId: string;
  followingId: string;
  createdAt: string;
}

// 用户统计
export interface UserSocialStats {
  posts: number;
  followers: number;
  following: number;
  likes: number;
  bookmarks: number;
}

// 标签
export interface Tag {
  id: string;
  name: string;
  count: number;
  isTrending: boolean;
}

// 话题
export interface Topic {
  id: string;
  name: string;
  description?: string;
  coverImage?: string;
  postCount: number;
  followerCount: number;
  isFollowing: boolean;
}
