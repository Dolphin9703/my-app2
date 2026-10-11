import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/lib/theme';

export default function AdBanner() {
  return (
    <View style={styles.container}>
      <View style={styles.banner}>
        <Text style={styles.text}>광고 영역 (AdMob Banner Placeholder)</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 50,
    backgroundColor: Colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[200],
  },
  banner: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 12,
    color: Colors.neutral[400],
    fontWeight: '500',
    letterSpacing: 0.5,
  },
});
