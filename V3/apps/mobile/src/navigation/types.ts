import { Routes } from './routes';

export type RouteParams = {
  [Routes.LOGIN]: undefined;
  [Routes.VERIFY]: undefined;
  [Routes.ONBOARDING]: undefined;

  [Routes.HOME]: undefined;
  [Routes.STYLIST]: undefined;
  [Routes.WARDROBE]: undefined;
  [Routes.PROFILE]: undefined;

  [Routes.SEARCH]: undefined;
  [Routes.CLOTHING_DETAIL]: { id: string };
  [Routes.AVATAR_CREATE]: undefined;
  [Routes.AVATAR_EDIT]: undefined;
  [Routes.AVATAR_SHOWCASE]: undefined;
  [Routes.COMMUNITY]: undefined;
  [Routes.COMMUNITY_POST]: { postId: string };
  [Routes.COMMUNITY_CREATE]: undefined;
  [Routes.USER_PROFILE]: { userId: string };
  [Routes.MESSAGES]: undefined;
  [Routes.MESSAGE_CHAT]: { chatId: string };
  [Routes.CUSTOMIZE_EDITOR]: undefined;
  [Routes.CUSTOMIZE_PREVIEW]: undefined;
  [Routes.CUSTOMIZE_ORDERS]: undefined;
  [Routes.CUSTOMIZE_ORDER_DETAIL]: { orderId: string };
  [Routes.MARKET]: undefined;
  [Routes.MARKET_DESIGN]: { designId: string };
  [Routes.BESPOKE]: undefined;
  [Routes.BESPOKE_STUDIO]: { studioId: string };
  [Routes.BESPOKE_SUBMIT]: undefined;
  [Routes.BESPOKE_CHAT]: { orderId: string };
  [Routes.BESPOKE_QUOTE]: { orderId: string };
  [Routes.BESPOKE_ORDERS]: undefined;
  [Routes.ACTIONS]: undefined;
  [Routes.SETTINGS]: undefined;
  [Routes.SETTINGS_PREFERENCES]: undefined;
  [Routes.SETTINGS_PRIVACY]: undefined;
};

export type ParamRoutes = {
  [K in keyof RouteParams]: RouteParams[K] extends undefined ? never : K
}[keyof RouteParams];

export type NoParamRoutes = {
  [K in keyof RouteParams]: RouteParams[K] extends undefined ? K : never
}[keyof RouteParams];
