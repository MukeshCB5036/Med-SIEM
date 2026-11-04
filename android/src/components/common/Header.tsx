import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { THEME } from '../../store/theme';
import { useAuthStore } from '../../store/authStore';

interface HeaderProps {
  onOpenDrawer: () => void;
  activeScreenTitle: string;
}

export const Header: React.FC<HeaderProps> = ({ onOpenDrawer, activeScreenTitle }) => {
  const { user } = useAuthStore();

  return (
    <View style={styles.header}>
      <View style={styles.leftRow}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoText}>M</Text>
        </View>
        <View>
          <View style={styles.titleRow}>
            <Text style={styles.brandTitle}>MedSIEM</Text>
            <View style={styles.liveIndicator}>
              <View style={styles.greenDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>
          <Text style={styles.userSubtitle} numberOfLines={1}>
            {user?.full_name || 'SOC Operator'} ({user?.is_superuser ? 'Super Admin' : 'Analyst'})
          </Text>
        </View>
      </View>

      <View style={styles.rightRow}>
        <TouchableOpacity style={styles.menuBtn} onPress={onOpenDrawer} activeOpacity={0.7}>
          <Text style={styles.menuBtnIcon}>☰</Text>
          <Text style={styles.menuBtnText}>MENU</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: THEME.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: THEME.colors.text,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.online,
  },
  liveText: {
    color: THEME.colors.online,
    fontSize: 9,
    fontWeight: 'bold',
  },
  userSubtitle: {
    color: THEME.colors.textSecondary,
    fontSize: 11,
    maxWidth: 200,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  menuBtnIcon: {
    color: THEME.colors.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
  menuBtnText: {
    color: THEME.colors.text,
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  }
});
