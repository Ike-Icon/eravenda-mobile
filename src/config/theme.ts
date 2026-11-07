import { DynamicColorIOS, Platform, PlatformColor } from 'react-native';

/** Use native dynamic colors so static StyleSheet tokens react to Appearance changes on every screen. */
function adaptive(light: string, dark: string, androidAttribute: string): string {
  if (Platform.OS === 'ios') return DynamicColorIOS({ light, dark }) as unknown as string;
  if (Platform.OS === 'android') return PlatformColor(`?android:attr/${androidAttribute}`) as unknown as string;
  return light;
}

/** Design tokens. Colours follow the web app: deep emerald primary with a gold accent. */
export const colors = {
  primary: adaptive('#0F5C3F', '#56C99B', 'colorAccent'),
  primaryButton: Platform.OS === 'android' ? '#287A58' : adaptive('#0F5C3F', '#287A58', 'colorAccent'),
  primaryDark: adaptive('#0A4430', '#0B3D2D', 'colorAccent'),
  primarySoft: adaptive('#E7F2EC', '#254E3A', 'colorControlHighlight'),
  accent: '#F59E0B',
  text: adaptive('#14201B', '#F0F5F2', 'textColorPrimary'),
  textMuted: adaptive('#5B6762', '#B0BDB6', 'textColorSecondary'),
  background: adaptive('#F6F7F5', '#101714', 'colorBackground'),
  surface: adaptive('#FFFFFF', '#17221D', 'colorBackgroundFloating'),
  border: adaptive('#E3E1D8', '#34463B', 'colorControlNormal'),
  danger: adaptive('#C1443A', '#FF7770', 'colorError'),
  dangerSoft: adaptive('#FFF2F2', '#422624', 'colorBackgroundFloating'),
  warningSurface: adaptive('#FEF3C7', '#3D321C', 'colorBackgroundFloating'),
  warningText: adaptive('#92400E', '#F5D68A', 'textColorPrimary'),
  infoSurface: adaptive('#EAF1FC', '#22344D', 'colorBackgroundFloating'),
  infoText: adaptive('#2254A0', '#A9C8FF', 'textColorPrimary'),
  success: adaptive('#1C6B4F', '#62D2A6', 'colorAccent'),
  skeleton: adaptive('#E6E9E7', '#26352E', 'colorBackground'),
  white: '#FFFFFF',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };
export const font = { sm: 13, md: 15, lg: 17, xl: 22, xxl: 28 };

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
};
