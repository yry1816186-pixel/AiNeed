import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '../src/stores/auth.store';
import { colors } from '../src/theme';
import type { AuthState } from '../src/stores/auth.store';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 2,
    },
  },
});

function AuthGate({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s: AuthState) => s.isAuthenticated);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'onboarding';

    if (!isAuthenticated && !inAuthGroup && !inOnboarding) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, segments]);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthGate>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.textPrimary,
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen
            name="clothing/[id]"
            options={{ headerTitle: '服装详情' }}
          />
          <Stack.Screen name="search" options={{ headerTitle: '搜索' }} />
          <Stack.Screen name="avatar/create" options={{ headerTitle: '创建形象' }} />
          <Stack.Screen name="avatar/edit" options={{ headerTitle: '编辑形象' }} />
          <Stack.Screen name="avatar/showcase" options={{ headerTitle: '我的形象', headerShown: false }} />
          <Stack.Screen
            name="customize/preview"
            options={{ headerTitle: '定制预览' }}
          />
          <Stack.Screen
            name="customize/orders/index"
            options={{ headerTitle: '我的订单' }}
          />
          <Stack.Screen
            name="customize/orders/[orderId]"
            options={{ headerTitle: '订单详情' }}
          />
          <Stack.Screen name="messages/index" options={{ headerTitle: '消息' }} />
          <Stack.Screen name="messages/[chatId]" options={{ headerTitle: '聊天' }} />
          <Stack.Screen name="bespoke/index" options={{ headerTitle: '高端定制' }} />
          <Stack.Screen name="bespoke/[studioId]" options={{ headerTitle: '工作室详情' }} />
          <Stack.Screen name="bespoke/submit" options={{ headerTitle: '提交需求' }} />
          <Stack.Screen name="bespoke/chat/[orderId]" options={{ headerTitle: '定制沟通' }} />
          <Stack.Screen name="bespoke/quote/[orderId]" options={{ headerTitle: '查看报价' }} />
          <Stack.Screen name="bespoke/orders" options={{ headerTitle: '我的定制' }} />
        </Stack>
      </AuthGate>
    </QueryClientProvider>
  );
}
