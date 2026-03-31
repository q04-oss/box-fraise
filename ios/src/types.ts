import { NavigatorScreenParams } from '@react-navigation/native';

export type OrderStackParamList = {
  Step1Strawberry: undefined;
  Step2Chocolate: undefined;
  Step3Finish: undefined;
  Step4Quantity: undefined;
  Step5Where: undefined;
  Step6When: undefined;
  Step7Review: undefined;
};

export type MainTabParamList = {
  Board: undefined;
  Where: undefined;
};

export type RootStackParamList = {
  Main: undefined;
  Order: NavigatorScreenParams<OrderStackParamList> | undefined;
  OrderConfirm: {
    orderId: number;
    locationName: string;
    slotDate: string;
    slotTime: string;
    totalCents: number;
    varietyName: string;
    nfc_token?: string | null;
    chocolate: string;
    finish: string;
    quantity: number;
    variety_id: number;
    location_id: number;
    priceCents: number;
  };
  NFCVerify: undefined;
  Verified: undefined;
  Profile: undefined;
  StandingOrderSetup: {
    variety_id: number;
    chocolate: string;
    finish: string;
    quantity: number;
    location_id: number;
    priceCents: number;
    varietyName: string;
  };
};

// Keep for backward compat
export type RootTabParamList = MainTabParamList;
