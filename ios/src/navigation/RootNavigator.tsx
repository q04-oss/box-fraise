import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import BottomTabNavigator from './BottomTabNavigator';
import OrderNavigator from './OrderNavigator';
import OrderConfirmScreen from '../screens/OrderConfirmScreen';
import NFCVerifyScreen from '../screens/NFCVerifyScreen';
import VerifiedScreen from '../screens/VerifiedScreen';
import ProfileScreen from '../screens/ProfileScreen';
import StandingOrderSetupScreen from '../screens/StandingOrderSetupScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={BottomTabNavigator} />
      <Stack.Screen name="Order" component={OrderNavigator} />
      <Stack.Screen name="OrderConfirm" component={OrderConfirmScreen} />
      <Stack.Screen name="NFCVerify" component={NFCVerifyScreen} />
      <Stack.Screen name="Verified" component={VerifiedScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="StandingOrderSetup" component={StandingOrderSetupScreen} />
    </Stack.Navigator>
  );
}
