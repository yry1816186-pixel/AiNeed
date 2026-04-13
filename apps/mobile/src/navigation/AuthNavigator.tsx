import React, { Suspense, lazy } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AuthStackParamList } from './types';
import { theme } from '../theme';

const Stack = createNativeStackNavigator<AuthStackParamList>();

const LoginScreen = lazy(() => import('../screens/LoginScreen'));
const PhoneLoginScreen = lazy(() => import('../screens/PhoneLoginScreen'));
const RegisterScreen = lazy(() => import('../screens/RegisterScreen'));
const OnboardingScreen = lazy(() => import('../screens/onboarding/OnboardingWizard'));

function AuthLoader() {
  return (
    <View style={styles.loader}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );
}

export function AuthNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="Login"
    >
      <Stack.Screen name="Login">
        {() => (
          <Suspense fallback={<AuthLoader />}>
            <LoginScreen />
          </Suspense>
        )}
      </Stack.Screen>
      <Stack.Screen name="PhoneLogin">
        {() => (
          <Suspense fallback={<AuthLoader />}>
            <PhoneLoginScreen />
          </Suspense>
        )}
      </Stack.Screen>
      <Stack.Screen name="Register">
        {() => (
          <Suspense fallback={<AuthLoader />}>
            <RegisterScreen />
          </Suspense>
        )}
      </Stack.Screen>
      <Stack.Screen name="Onboarding">
        {() => (
          <Suspense fallback={<AuthLoader />}>
            <OnboardingScreen />
          </Suspense>
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
