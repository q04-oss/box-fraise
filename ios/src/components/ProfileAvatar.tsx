import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';

interface Props {
  verified: boolean;
  userId?: string;
}

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function ProfileAvatar({ verified, userId }: Props) {
  const navigation = useNavigation<Nav>();
  const initials = userId ? userId.substring(3, 5) : '—';

  return (
    <TouchableOpacity onPress={() => navigation.navigate('Profile')} activeOpacity={0.8}>
      <View style={[styles.avatar, verified && styles.avatarVerified]}>
        {verified ? (
          <Text style={styles.initials}>{initials}</Text>
        ) : (
          <View style={styles.hollow} />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarVerified: {
    backgroundColor: '#1C3A2A',
    borderColor: '#C4973A',
    borderWidth: 2,
  },
  initials: {
    color: '#C4973A',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  hollow: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
  },
});
