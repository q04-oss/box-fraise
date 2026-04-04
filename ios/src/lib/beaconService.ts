import { Platform, NativeEventEmitter, NativeModules } from 'react-native';
import Beacons from 'react-native-beacons-manager';
import * as Notifications from 'expo-notifications';
import { fetchBeacons, fetchBeaconShopUser, fetchNearbyJobs, JobPosting } from './api';

export interface BeaconRegion {
  uuid: string;
  major: number;
  minor: number;
  business_id: number;
  business_name: string;
}

let knownBeacons: BeaconRegion[] = [];
let monitoring = false;
let onNearbyShop: ((shopUserId: number, shopName: string, businessId: number) => void) | null = null;
let onNearbyJob: ((job: JobPosting, businessName: string) => void) | null = null;

export function setOnNearbyShop(cb: typeof onNearbyShop) {
  onNearbyShop = cb;
}

export function setOnNearbyJob(cb: typeof onNearbyJob) {
  onNearbyJob = cb;
}

export async function loadAndMonitorBeacons() {
  if (Platform.OS !== 'ios') return;
  if (monitoring) return;

  try {
    knownBeacons = await fetchBeacons();
    if (knownBeacons.length === 0) return;

    await Beacons.requestAlwaysAuthorization();

    // Register a region per unique UUID
    const uuids = [...new Set(knownBeacons.map(b => b.uuid))];
    for (const uuid of uuids) {
      Beacons.startMonitoringForRegion({ identifier: uuid, uuid });
      Beacons.startRangingBeaconsInRegion({ identifier: uuid, uuid });
    }

    // Region entry — user walked into range
    const BeaconsEventEmitter = new NativeEventEmitter(NativeModules.RNiBeacon);
    BeaconsEventEmitter.addListener('regionDidEnter', async (region: any) => {
      const match = knownBeacons.find(b => b.uuid.toLowerCase() === region.uuid?.toLowerCase());
      if (!match) return;

      // Shop offer nudge
      const shopUser = await fetchBeaconShopUser(match.business_id).catch(() => null);
      if (shopUser) {
        if (onNearbyShop) {
          onNearbyShop(shopUser.id, match.business_name, match.business_id);
        } else {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: match.business_name,
              body: 'Strawberries available nearby — tap to see today\'s offer.',
              data: { screen: 'messages', user_id: shopUser.id },
            },
            trigger: null,
          });
        }
      }

      // Job nudge — check for active job postings at this business
      const jobs = await fetchNearbyJobs(match.business_id).catch(() => [] as JobPosting[]);
      if (jobs.length > 0) {
        if (onNearbyJob) {
          onNearbyJob(jobs[0], match.business_name);
        } else {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `${match.business_name} is hiring`,
              body: `${jobs[0].title} — ${jobs[0].pay_type === 'hourly' ? `$${(jobs[0].pay_cents / 100).toFixed(0)}/hr` : `$${(jobs[0].pay_cents / 100).toLocaleString()}/yr`}`,
              data: { screen: 'jobDetail', job_id: jobs[0].id, business_id: match.business_id },
            },
            trigger: null,
          });
        }
      }
    });

    monitoring = true;
  } catch (err) {
    // Silently fail — BLE is a nice-to-have, not core
  }
}

export function stopMonitoring() {
  if (!monitoring) return;
  for (const beacon of knownBeacons) {
    Beacons.stopMonitoringForRegion({ identifier: beacon.uuid, uuid: beacon.uuid });
    Beacons.stopRangingBeaconsInRegion({ identifier: beacon.uuid, uuid: beacon.uuid });
  }
  monitoring = false;
}
