import type { RootStackParamList } from '../types/navigation';

export const DEEPLINK_PREFIX = 'xuno://';

interface DeepLinkConfigItem {
  pattern: string;
  screen: keyof RootStackParamList;
  paramsMapping: (params: Record<string, string>) => Record<string, unknown> | undefined;
}

export const DEEPLINK_CONFIG: DeepLinkConfigItem[] = [
  {
    pattern: 'profile/:userId',
    screen: 'Profile',
    paramsMapping: (params) => ({ userId: params.userId }),
  },
  {
    pattern: 'wardrobe',
    screen: 'Wardrobe',
    paramsMapping: () => undefined,
  },
  {
    pattern: 'stylist',
    screen: 'AiStylist',
    paramsMapping: () => undefined,
  },
  {
    pattern: 'share/poster/:id',
    screen: 'OutfitDetail',
    paramsMapping: (params) => ({ outfitId: params.id }),
  },
  {
    pattern: 'try-on/:id',
    screen: 'VirtualTryOn',
    paramsMapping: (params) => ({ clothingId: params.id }),
  },
];

export function parseDeepLink(
  url: string,
): { screen: keyof RootStackParamList; params: Record<string, unknown> | undefined } | null {
  if (!url.startsWith(DEEPLINK_PREFIX)) {
    return null;
  }

  const path = url.slice(DEEPLINK_PREFIX.length);

  for (const config of DEEPLINK_CONFIG) {
    const patternParts = config.pattern.split('/');
    const pathParts = path.split('/');

    if (patternParts.length !== pathParts.length) {
      continue;
    }

    let match = true;
    const params: Record<string, string> = {};

    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i];
      const pathPart = pathParts[i];

      if (patternPart.startsWith(':')) {
        params[patternPart.slice(1)] = pathPart;
      } else if (patternPart !== pathPart) {
        match = false;
        break;
      }
    }

    if (match) {
      return {
        screen: config.screen,
        params: config.paramsMapping(params),
      };
    }
  }

  return null;
}
