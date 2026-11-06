import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import React, { useEffect, useRef } from 'react';
import { colors } from '../config/theme';

/** Branded indeterminate loader used while the saved session and app shell initialize. */
export function LogoLoader({ label = 'Getting things ready…' }: { label?: string }) {
  const rotation = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const progress = useRef(new Animated.Value(-36)).current;

  useEffect(() => {
    const spin = Animated.loop(Animated.timing(rotation, { toValue: 1, duration: 1300, easing: Easing.linear, useNativeDriver: true }));
    const breathe = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.07, duration: 720, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 720, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    const sweep = Animated.loop(Animated.timing(progress, { toValue: 88, duration: 1150, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }));
    spin.start();
    breathe.start();
    sweep.start();
    return () => { spin.stop(); breathe.stop(); sweep.stop(); };
  }, [progress, pulse, rotation]);

  const spin = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return <View style={styles.container} accessibilityRole="progressbar" accessibilityLabel={label}>
    <View style={styles.markWrap}>
      <Animated.View style={[styles.ring, { transform: [{ rotate: spin }] }]} />
      <Animated.View style={[styles.logoWrap, { transform: [{ scale: pulse }] }]}>
        <Image source={require('../../assets/logo-mark.png')} style={styles.logo} resizeMode="contain" />
      </Animated.View>
    </View>
    {!!label && <Text style={styles.label}>{label}</Text>}
    <View style={styles.progressTrack}><Animated.View style={[styles.progressFill, { transform: [{ translateX: progress }] }]} /></View>
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  markWrap: { width: 116, height: 116, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 108, height: 108, borderRadius: 54, borderWidth: 4, borderColor: colors.primarySoft, borderTopColor: colors.primary, borderRightColor: colors.accent },
  logoWrap: { width: 66, height: 66, borderRadius: 33, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, shadowColor: colors.primary, shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  logo: { width: 46, height: 46 },
  label: { color: colors.textMuted, fontSize: 13, fontWeight: '700', marginTop: 18, letterSpacing: 0.2 },
  progressTrack: { width: 88, height: 3, overflow: 'hidden', borderRadius: 2, backgroundColor: colors.primarySoft, marginTop: 11 },
  progressFill: { width: 34, height: 3, borderRadius: 2, backgroundColor: colors.primary },
});
