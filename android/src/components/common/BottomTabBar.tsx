import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { THEME } from '../../store/theme';
import { ScreenKey } from './DrawerMenu';

interface BottomTabBarProps {
  activeScreen: ScreenKey;
  onSelectScreen: (screen: ScreenKey) => void;
  activeAlertsCount?: number;
  activeIncidentsCount?: number;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  activeScreen,
  onSelectScreen,
  activeAlertsCount = 0,
  activeIncidentsCount = 0,
}) => {
  const tabs: Array<{ key: ScreenKey; label: string; icon: string; count?: number }> = [
    { key: 'DASHBOARD', label: 'Dashboard', icon: '📊' },
    { key: 'ALERTS', label: 'Alerts', icon: '🚨', count: activeAlertsCount },
    { key: 'INCIDENTS', label: 'Incidents', icon: '🛡️', count: activeIncidentsCount },
    { key: 'EVENTS', label: 'Events', icon: '📜' },
    { key: 'ASSETS', label: 'Assets', icon: '🖥️' },
  ];

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = activeScreen === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabItem}
            onPress={() => onSelectScreen(tab.key)}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>{tab.icon}</Text>
              {(tab.count !== undefined && tab.count > 0) && (
                <View style={styles.badgeCount}>
                  <Text style={styles.badgeText}>{tab.count > 99 ? '99+' : tab.count}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {tab.label}
            </Text>
            {isActive && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.surface,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    paddingVertical: 6,
    paddingBottom: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    position: 'relative',
  },
  iconContainer: {
    position: 'relative',
  },
  icon: {
    fontSize: 16,
    marginBottom: 2,
  },
  badgeCount: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: THEME.colors.primary,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  label: {
    color: THEME.colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
  labelActive: {
    color: '#fb7185',
    fontWeight: 'bold',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -8,
    width: 20,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: THEME.colors.primary,
  }
});
