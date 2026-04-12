import * as Linking from 'expo-linking';
import type { Router } from 'expo-router';

export type DeepLinkRoute =
  | { path: 'clothing'; id: string }
  | { path: 'outfit'; id: string }
  | { path: 'post'; id: string }
  | { path: 'user'; id: string }
  | { path: 'market/design'; id: string }
  | { path: 'bespoke/studio'; id: string }
  | { path: 'stylist' };

type DeepLinkHandler = (route: DeepLinkRoute) => void;

const ROUTE_PATH_MAP: Record<DeepLinkRoute['path'], (route: DeepLinkRoute) => string> = {
  clothing: (route) => `/clothing/${(route as { path: 'clothing'; id: string }).id}`,
  outfit: (route) => `/outfit/${(route as { path: 'outfit'; id: string }).id}`,
  post: (route) => `/community/${(route as { path: 'post'; id: string }).id}`,
  user: (route) => `/community/user/${(route as { path: 'user'; id: string }).id}`,
  'market/design': (route) => `/market/${(route as { path: 'market/design'; id: string }).id}`,
  'bespoke/studio': (route) => `/bespoke/${(route as { path: 'bespoke/studio'; id: string }).id}`,
  stylist: () => '/(tabs)/stylist',
};

const PATH_PATTERNS: Array<{ pattern: RegExp; builder: (match: RegExpMatchArray) => DeepLinkRoute }> = [
  {
    pattern: /^\/clothing\/([^/]+)$/,
    builder: (m) => ({ path: 'clothing', id: m[1] }),
  },
  {
    pattern: /^\/outfit\/([^/]+)$/,
    builder: (m) => ({ path: 'outfit', id: m[1] }),
  },
  {
    pattern: /^\/post\/([^/]+)$/,
    builder: (m) => ({ path: 'post', id: m[1] }),
  },
  {
    pattern: /^\/user\/([^/]+)$/,
    builder: (m) => ({ path: 'user', id: m[1] }),
  },
  {
    pattern: /^\/market\/design\/([^/]+)$/,
    builder: (m) => ({ path: 'market/design', id: m[1] }),
  },
  {
    pattern: /^\/bespoke\/studio\/([^/]+)$/,
    builder: (m) => ({ path: 'bespoke/studio', id: m[1] }),
  },
  {
    pattern: /^\/stylist$/,
    builder: () => ({ path: 'stylist' }),
  },
];

class DeepLinkService {
  private handler: DeepLinkHandler | null = null;

  parseUrl(url: string): DeepLinkRoute | null {
    let pathname: string;

    try {
      const parsed = Linking.parse(url);
      pathname = parsed.path ?? '';
    } catch {
      const urlObj = new URL(url);
      pathname = urlObj.pathname;
    }

    const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;

    for (const { pattern, builder } of PATH_PATTERNS) {
      const match = normalizedPath.match(pattern);
      if (match) {
        return builder(match);
      }
    }

    return null;
  }

  navigate(route: DeepLinkRoute, router: Router): void {
    const targetPath = ROUTE_PATH_MAP[route.path](route);
    router.push(targetPath);
  }

  generateShareLink(route: DeepLinkRoute): string {
    const path = this.routeToPathString(route);
    return `https://aineed.app${path}`;
  }

  onDeepLink(handler: DeepLinkHandler): void {
    this.handler = handler;
  }

  handleUrl(url: string): void {
    const route = this.parseUrl(url);
    if (route && this.handler) {
      this.handler(route);
    }
  }

  private routeToPathString(route: DeepLinkRoute): string {
    switch (route.path) {
      case 'clothing':
        return `/clothing/${route.id}`;
      case 'outfit':
        return `/outfit/${route.id}`;
      case 'post':
        return `/post/${route.id}`;
      case 'user':
        return `/user/${route.id}`;
      case 'market/design':
        return `/market/design/${route.id}`;
      case 'bespoke/studio':
        return `/bespoke/studio/${route.id}`;
      case 'stylist':
        return '/stylist';
    }
  }
}

export const deepLinkService = new DeepLinkService();
