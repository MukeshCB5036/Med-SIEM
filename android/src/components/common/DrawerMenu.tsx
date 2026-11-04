import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet, Platform, StatusBar } from 'react-native';
import { THEME } from '../../store/theme';
import { useAuthStore } from '../../store/authStore';

export type ScreenKey = 
  | 'DASHBOARD' 
  | 'ALERTS' 
  | 'INCIDENTS' 
  | 'EVENTS' 
  | 'ASSETS' 
  | 'RULES' 
  | 'THREAT_INTEL' 
  | 'REPORTS' 
  | 'ADMIN' 
  | 'SETTINGS';

interface DrawerMenuProps {
  visible: boolean;
  activeScreen: ScreenKey;
  onSelectScreen: (screen: ScreenKey) => void;
  onClose: () => void;
}

export const DrawerMenu: React.FC<DrawerMenuProps> = ({
  visible,
  activeScreen,
  onSelectScreen,
  onClose,
}) => {
  const { user, logout, isSuperAdmin, hasPermission } = useAuthStore();

  const handleSelect = (key: ScreenKey) => {
    onSelectScreen(key);
    onClose();
  };

  const navItems: Array<{ key: ScreenKey; label: string; icon: string; category: string; requiresAdmin?: boolean }> = [
    // Core SOC Operations
    { key: 'DASHBOARD', label: 'SOC Dashboard', icon: '📊', category: 'Core Operations' },
    { key: 'ALERTS', label: 'Security Alerts', icon: '🚨', category: 'Core Operations' },
    { key: 'INCIDENTS', label: 'Incident Response', icon: '🛡️', category: 'Core Operations' },
    { key: 'EVENTS', label: 'Live Events & Logs', icon: '📜', category: 'Core Operations' },
    { key: 'ASSETS', label: 'Assets & Agents', icon: '🖥️', category: 'Core Operations' },

    // Detection & Intelligence
    { key: 'RULES', label: 'Detection Rules', icon: '⚡', category: 'Intelligence & Compliance' },
    { key: 'THREAT_INTEL', label: 'Threat Intelligence', icon: '🌐', category: 'Intelligence & Compliance' },
    { key: 'REPORTS', label: 'Reports & Compliance', icon: '📋', category: 'Intelligence & Compliance' },

    // Governance & Security
    { key: 'ADMIN', label: 'Administration & RBAC', icon: '👥', category: 'System Governance', requiresAdmin: true },
    { key: 'SETTINGS', label: 'Security Settings', icon: '⚙️', category: 'System Governance' },
  ];

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        
        <View style={styles.drawerContainer}>
          {/* Drawer Header */}
          <View style={styles.drawerHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.drawerLogo}>
                <Text style={styles.drawerLogoText}>M</Text>
              </View>
              <View>
                <Text style={styles.drawerTitle}>MedSIEM Command</Text>
                <Text style={styles.drawerSubtitle}>{user?.email}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Navigation Items List */}
          <ScrollView style={styles.menuScroll} contentContainerStyle={styles.menuContent}>
            {['Core Operations', 'Intelligence & Compliance', 'System Governance'].map((cat) => {
              const items = navItems.filter(i => i.category === cat);
              return (
                <View key={cat} style={styles.sectionGroup}>
                  <Text style={styles.sectionLabel}>{cat}</Text>
                  {items.map((item) => {
                    const isActive = activeScreen === item.key;
                    return (
                      <TouchableOpacity
                        key={item.key}
                        style={[styles.menuItem, isActive && styles.menuItemActive]}
                        onPress={() => handleSelect(item.key)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.menuItemIcon}>{item.icon}</Text>
                        <Text style={[styles.menuItemText, isActive && styles.menuItemTextActive]}>
                          {item.label}
                        </Text>
                        {isActive && <View style={styles.activePill} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              );
            })}
          </ScrollView>

          {/* Drawer Footer */}
          <View style={styles.drawerFooter}>
            <TouchableOpacity
              style={styles.signOutBtn}
              onPress={() => {
                onClose();
                logout();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.signOutText}>⎋ Sign Out of SOC</Text>
            </TouchableOpacity>
            <Text style={styles.versionNotice}>MedSIEM v1.0.0 • HIPAA Compliant</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  backdrop: {
    flex: 1,
  },
  drawerContainer: {
    width: 290,
    backgroundColor: THEME.colors.surface,
    borderLeftWidth: 1,
    borderLeftColor: THEME.colors.border,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0,
  },
  drawerHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0a101f',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  drawerLogo: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerLogoText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 20,
  },
  drawerTitle: {
    color: THEME.colors.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
  drawerSubtitle: {
    color: THEME.colors.textMuted,
    fontSize: 10,
    maxWidth: 160,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: THEME.colors.surfaceElevated,
  },
  closeBtnText: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  menuScroll: {
    flex: 1,
  },
  menuContent: {
    paddingVertical: 12,
  },
  sectionGroup: {
    marginBottom: 16,
  },
  sectionLabel: {
    color: THEME.colors.textMuted,
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 12,
  },
  menuItemActive: {
    backgroundColor: 'rgba(225, 29, 72, 0.12)',
    borderLeftWidth: 3,
    borderLeftColor: THEME.colors.primary,
  },
  menuItemIcon: {
    fontSize: 15,
  },
  menuItemText: {
    color: THEME.colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  menuItemTextActive: {
    color: '#fb7185',
    fontWeight: 'bold',
  },
  activePill: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.primary,
  },
  drawerFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    backgroundColor: '#0a101f',
  },
  signOutBtn: {
    backgroundColor: THEME.colors.surfaceElevated,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  signOutText: {
    color: THEME.colors.critical,
    fontSize: 12,
    fontWeight: 'bold',
  },
  versionNotice: {
    color: THEME.colors.textMuted,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 10,
  }
});
