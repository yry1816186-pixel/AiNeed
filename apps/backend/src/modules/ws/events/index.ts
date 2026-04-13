export const PROFILE_EVENTS = {
  PROFILE_UPDATED: 'profile.updated',
  ONBOARDING_COMPLETED: 'profile.onboarding_completed',
} as const;

export type ProfileEventType = typeof PROFILE_EVENTS[keyof typeof PROFILE_EVENTS];

export interface ProfileUpdatedPayload {
  userId: string;
  updatedFields: string[];
}

export interface OnboardingCompletedPayload {
  userId: string;
  profileCompleteness: number;
}

export type ProfileEventPayload = ProfileUpdatedPayload | OnboardingCompletedPayload;

export const AI_EVENTS = {
  AI_TASK_STARTED: 'ai.task_started',
  AI_TASK_PROGRESS: 'ai.task_progress',
  AI_TASK_COMPLETED: 'ai.task_completed',
} as const;

export type AIEventType = typeof AI_EVENTS[keyof typeof AI_EVENTS];

export interface AITaskStartedPayload {
  userId: string;
  jobId: string;
  taskType: string;
}

export interface AITaskProgressPayload {
  userId: string;
  jobId: string;
  progress: number;
  stage: string;
  message?: string;
}

export interface AITaskCompletedPayload {
  userId: string;
  jobId: string;
  result: Record<string, unknown>;
  duration: number;
}

export type AIEventPayload = AITaskStartedPayload | AITaskProgressPayload | AITaskCompletedPayload;

export const QUIZ_EVENTS = {
  QUIZ_PROGRESS_SAVED: 'quiz.progress_saved',
} as const;

export type QuizEventType = typeof QUIZ_EVENTS[keyof typeof QUIZ_EVENTS];

export interface QuizProgressSavedPayload {
  userId: string;
  quizId: string;
  currentStep: number;
  totalSteps: number;
}

export type QuizEventPayload = QuizProgressSavedPayload;

export const NOTIFICATION_EVENTS = {
  NEW_NOTIFICATION: 'notification.new',
  NOTIFICATION_READ: 'notification.read',
} as const;

export type NotificationEventType = typeof NOTIFICATION_EVENTS[keyof typeof NOTIFICATION_EVENTS];

export interface NewNotificationPayload {
  userId: string;
  notificationId: string;
  type: string;
  title: string;
  content: string;
}

export interface NotificationReadPayload {
  userId: string;
  notificationId: string;
}

export type NotificationEventPayload = NewNotificationPayload | NotificationReadPayload;

export const COMMUNITY_EVENTS = {
  NEW_POST: 'community.new_post',
  NEW_COMMENT: 'community.new_comment',
  NEW_LIKE: 'community.new_like',
} as const;

export type CommunityEventType = typeof COMMUNITY_EVENTS[keyof typeof COMMUNITY_EVENTS];

export interface NewPostPayload {
  userId: string;
  postId: string;
  authorId: string;
  authorName: string;
}

export interface NewCommentPayload {
  userId: string;
  postId: string;
  commentId: string;
  commenterName: string;
}

export interface NewLikePayload {
  userId: string;
  postId: string;
  likerName: string;
}

export type CommunityEventPayload = NewPostPayload | NewCommentPayload | NewLikePayload;

export type WSEventType =
  | ProfileEventType
  | AIEventType
  | QuizEventType
  | NotificationEventType
  | CommunityEventType;

export interface WSEvent<T = unknown> {
  type: WSEventType;
  userId: string;
  payload: T;
  timestamp: string;
}
