import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { StripeProvider } from '@stripe/stripe-react-native';
import {
  useFonts,
  PlayfairDisplay_400Regular,
  PlayfairDisplay_400Regular_Italic,
  PlayfairDisplay_700Bold,
} from '@expo-google-fonts/playfair-display';
import { OrderProvider } from './src/context/OrderContext';
import BottomTabNavigator from './src/navigation/BottomTabNavigator';
import { COLORS } from './src/theme';

// Replace with your Stripe publishable key (pk_test_... or pk_live_...)
const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_400Regular_Italic,
    PlayfairDisplay_700Bold,
  });

  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.forestGreen, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={COLORS.cream} />
      </View>
    );
  }

  return (
    <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY} merchantIdentifier="merchant.com.maisonfraise">
      <SafeAreaProvider>
        <StatusBar style="light" />
        <OrderProvider>
          <NavigationContainer>
            <BottomTabNavigator />
          </NavigationContainer>
        </OrderProvider>
      </SafeAreaProvider>
    </StripeProvider>
  );
}