import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface ARVarietyData {
  variety_id: number;
  variety_name: string | null;
  farm: string | null;
  harvest_date: string | null;
  quantity: number;
  chocolate: string;
  finish: string;
  // Feature 1: HealthKit nutrition
  vitamin_c_today_mg?: number | null;
  calories_today_kcal?: number | null;
  // Feature 2: fraise.market vendor AR
  card_type?: 'variety' | 'market' | null;
  vendor_description?: string | null;
  vendor_instagram?: string | null;
  vendor_tags?: string[];
  // Feature 3: Collectif social layer
  collectif_pickups_today?: number | null;
  // Feature 4: Gift reveal
  is_gift?: boolean;
  gift_note?: string | null;
  // Feature 5: Variety streak
  order_count?: number | null;
  // Feature B: Variety comparison
  last_variety?: { id: number; name: string; farm: string; harvest_date: string } | null;
  // Feature C: Standing order preview
  next_standing_order_label?: string | null;
  // Feature D: Collectif member names
  collectif_member_names?: string[];
}

// Feature E: Staff AR
export interface ARStaffData {
  id: number;
  status: string;
  variety_name: string;
  customer_email: string;
  quantity: number;
  chocolate: string;
  finish: string;
  is_gift?: boolean;
  gift_note?: string | null;
  slot_time?: string | null;
  push_token?: string | null;
}

// Feature F: Market stall AR
export interface ARMarketStallListing {
  name: string;
  price_cents: number;
  unit_label: string;
  tags: string[];
  stock_quantity: number;
}

export interface ARMarketStallData {
  vendor_name: string;
  description?: string | null;
  instagram?: string | null;
  listings: ARMarketStallListing[];
}

export interface Spec extends TurboModule {
  presentAR(varietyData: ARVarietyData): Promise<void>;
  // Feature E
  presentStaffAR(staffData: ARStaffData): Promise<{ action: string; order_id: number } | null>;
  // Feature F
  presentMarketStallAR(stallData: ARMarketStallData): Promise<void>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('ARBoxModule');
