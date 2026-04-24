import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SceneStep } from "../screens/SceneStep";
import { StyleStep } from "../screens/StyleStep";
import { PreferenceStep } from "../screens/PreferenceStep";
import { ResultStep } from "../screens/ResultStep";

export type OnboardingStackParamList = {
  Step1_Scene: undefined;
  Step2_Style: undefined;
  Step3_Preference: undefined;
  Step4_Result: undefined;
};

const OnboardingStack = createNativeStackNavigator<OnboardingStackParamList>();

export const OnboardingNavigator: React.FC = () => (
  <OnboardingStack.Navigator screenOptions={{ headerShown: false }}>
    <OnboardingStack.Screen name="Step1_Scene" component={SceneStep} />
    <OnboardingStack.Screen name="Step2_Style" component={StyleStep} />
    <OnboardingStack.Screen name="Step3_Preference" component={PreferenceStep} />
    <OnboardingStack.Screen name="Step4_Result" component={ResultStep} />
  </OnboardingStack.Navigator>
);

export default OnboardingNavigator;
