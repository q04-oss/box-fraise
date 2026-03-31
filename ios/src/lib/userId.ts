import AsyncStorage from '@react-native-async-storage/async-storage';

function randomSegment(): string {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

export async function getUserId(): Promise<string> {
  let id = await AsyncStorage.getItem('user_id');
  if (!id) {
    id = `MF-${randomSegment()}-${randomSegment()}`;
    await AsyncStorage.setItem('user_id', id);
  }
  return id;
}

export async function isVerified(): Promise<boolean> {
  const v = await AsyncStorage.getItem('verified');
  return v === 'true';
}

export async function setVerified(): Promise<void> {
  await AsyncStorage.setItem('verified', 'true');
}
