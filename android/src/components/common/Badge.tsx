import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { THEME } from '../../store/theme';

interface BadgeProps {
  label: string;
  variant?: 'severity' | 'status' | 'default';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'default', size = 'sm' }) => {
  const norm = (label || '').toUpperCase();

  let bg = THEME.colors.surfaceElevated;
  let text = THEME.colors.textSecondary;

  if (norm === 'CRITICAL' || norm === 'MALWARE' || norm === 'MALICIOUS' || norm === 'OFFLINE' || norm === 'REVOKED') {
    bg = THEME.colors.criticalBg;
    text = THEME.colors.critical;
  } else if (norm === 'HIGH' || norm === 'SUSPICIOUS') {
    bg = THEME.colors.highBg;
    text = THEME.colors.high;
  } else if (norm === 'MEDIUM' || norm === 'INVESTIGATING' || norm === 'CONTAINED') {
    bg = THEME.colors.mediumBg;
    text = THEME.colors.medium;
  } else if (norm === 'LOW' || norm === 'ONLINE' || norm === 'RESOLVED' || norm === 'ACTIVE' || norm === 'COMPLETED' || norm === 'COMPLIANT') {
    bg = THEME.colors.lowBg;
    text = THEME.colors.low;
  } else if (norm === 'INFO' || norm === 'OPEN') {
    bg = THEME.colors.infoBg;
    text = THEME.colors.info;
  }

  return (
    <View style={[styles.badge, { backgroundColor: bg }, size === 'md' && styles.badgeMd]}>
      <Text style={[styles.text, { color: text }, size === 'md' && styles.textMd]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  badgeMd: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  text: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  textMd: {
    fontSize: 11,
  }
});
