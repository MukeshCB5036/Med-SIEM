import React, { useState } from 'react';
import {
  SafeAreaView, View, Text, TextInput, TouchableOpacity,
  StyleSheet, StatusBar, ActivityIndicator
} from 'react-native';
import { THEME } from '../../store/theme';
import { useAuthStore } from '../../store/authStore';
import { apiService, tokenStorage } from '../../services/api';

export const LoginScreen = () => {
  const { setAuth, setMfaRequired, clearMfa, mfaToken, mfaRequired, setEmailVerificationRequired, emailVerificationRequired } = useAuthStore();

  const [email, setEmail] = useState('admin@medsiem.org');
  const [password, setPassword] = useState('SuperAdmin123!');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please provide both work email and account password.');
      return;
    }
    setError('');
    setInfo('');
    setLoading(true);

    const res = await apiService.post('/auth/login', { email: email.trim(), password });
    setLoading(false);

    if (res.success && res.data) {
      if (res.data.mfa_required && res.data.mfa_token) {
        setMfaRequired(res.data.mfa_token);
        setInfo('MFA Required: Enter your 6-digit authentication passcode.');
      } else if (res.data.email_verification_required) {
        setEmailVerificationRequired(true);
        setError('Email address unverified. Please check your inbox or resend link.');
      } else if (res.data.tokens || res.data.access_token) {
        const token = res.data.access_token || res.data.tokens?.access_token;
        tokenStorage.setToken(token);
        // Fetch current profile
        const meRes = await apiService.get('/auth/me');
        if (meRes.success && meRes.data) {
          setAuth(token, meRes.data);
        } else {
          setError('Failed to load user profile after authentication.');
        }
      }
    } else {
      setError(res.error || 'Invalid work email or password.');
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim() || otp.trim().length !== 6) {
      setError('Please enter a valid 6-digit OTP passcode.');
      return;
    }
    setError('');
    setInfo('');
    setLoading(true);

    const res = await apiService.post('/auth/verify-otp', {
      mfa_token: mfaToken,
      otp: otp.trim()
    });
    setLoading(false);

    if (res.success && res.data) {
      const token = res.data.access_token || res.data.tokens?.access_token;
      tokenStorage.setToken(token);
      const meRes = await apiService.get('/auth/me');
      if (meRes.success && meRes.data) {
        setAuth(token, meRes.data);
      } else {
        setError('Failed to load user profile after MFA verification.');
      }
    } else {
      setError(res.error || 'Invalid or expired OTP passcode.');
    }
  };

  const handleResendVerification = async () => {
    setError('');
    setInfo('');
    setLoading(true);
    const res = await apiService.post('/auth/resend-verification', { email: email.trim() });
    setLoading(false);
    if (res.success) {
      setInfo('Verification email dispatched. Please check your inbox.');
    } else {
      setError(res.error || 'Failed to resend verification email.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.colors.bg} />
      <View style={styles.authBox}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoText}>M</Text>
        </View>
        <Text style={styles.title}>MedSIEM Mobile</Text>
        <Text style={styles.subtitle}>Healthcare SOC Operations Command</Text>

        {info ? (
          <View style={styles.infoBanner}>
            <Text style={styles.infoText}>{info}</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {mfaRequired ? (
          <View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>6-DIGIT MFA PASSCODE</Text>
              <TextInput
                style={[styles.input, styles.otpInput]}
                placeholder="123456"
                placeholderTextColor={THEME.colors.textMuted}
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>

            <TouchableOpacity style={[styles.button, { backgroundColor: '#059669' }]} onPress={handleVerifyOtp} disabled={loading}>
              {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Verify & Enter Mobile SOC</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={clearMfa}>
              <Text style={styles.cancelBtnText}>← Cancel MFA / Back to Password</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>WORK EMAIL</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. analyst@medsiem.org"
                placeholderTextColor={THEME.colors.textMuted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PASSWORD</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter account password"
                placeholderTextColor={THEME.colors.textMuted}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            {emailVerificationRequired && (
              <TouchableOpacity style={[styles.button, { backgroundColor: THEME.colors.surfaceElevated, marginBottom: 8 }]} onPress={handleResendVerification}>
                <Text style={styles.buttonText}>Resend Verification Link</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
              {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Sign In to Mobile SOC</Text>}
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.footerNotice}>
          Protected Health Information System • HIPAA Compliant • TLS 1.3
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.bg,
  },
  authBox: {
    padding: 24,
    flex: 1,
    justifyContent: 'center',
  },
  logoBadge: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  logoText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 26,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: THEME.colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: THEME.colors.primary,
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: THEME.colors.criticalBg,
    borderColor: 'rgba(244, 63, 94, 0.4)',
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: THEME.colors.critical,
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  infoBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoText: {
    color: '#34d399',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: THEME.colors.textMuted,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    color: THEME.colors.text,
    fontSize: 14,
  },
  otpInput: {
    textAlign: 'center',
    fontSize: 22,
    letterSpacing: 8,
    color: '#34d399',
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: THEME.colors.primary,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  cancelBtn: {
    marginTop: 16,
  },
  cancelBtnText: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
  footerNotice: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginTop: 28,
  }
});
