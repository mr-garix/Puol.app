import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, Animated, StyleProp, GestureResponderHandlers } from 'react-native';

interface TopFeedTabsProps {
  activeTab: 'pourToi' | 'explorer';
  onTabChange: (tab: 'pourToi' | 'explorer') => void;
  underlineTranslateX: Animated.AnimatedInterpolation<string | number>;
  underlineColor: string | Animated.AnimatedInterpolation<string | number>;
  explorerStyle: StyleProp<TextStyle>;
  pourToiStyle: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  inactiveTextStyle?: StyleProp<TextStyle>;
  activeTextStyles?: Partial<Record<'pourToi' | 'explorer', StyleProp<TextStyle>>>;
  underlineStyle?: StyleProp<ViewStyle>;
  panHandlers?: GestureResponderHandlers;
}

const TABS: ('explorer' | 'pourToi')[] = ['explorer', 'pourToi'];

export const TopFeedTabs: React.FC<TopFeedTabsProps> = ({
  activeTab,
  onTabChange,
  underlineTranslateX,
  underlineColor,
  explorerStyle,
  pourToiStyle,
  containerStyle,
  inactiveTextStyle,
  activeTextStyles,
  underlineStyle,
  panHandlers,
}) => {
  const rowProps = panHandlers ?? {};
  return (
    <View style={[styles.headerTabsWrapper, containerStyle]} pointerEvents="box-none">
      <View style={styles.headerTabsRow} {...rowProps}>
        <View style={styles.headerTabs}>
          {TABS.map((tab) => {
            const animatedStyle = tab === 'explorer' ? explorerStyle : pourToiStyle;
            const isActive = tab === activeTab;
            const activeStyle = activeTextStyles?.[tab] ?? styles.headerTabTextActive;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => onTabChange(tab)}
                style={styles.headerTabButton}
                activeOpacity={0.7}
              >
                <Animated.Text
                  style={[
                    styles.headerTabText,
                    isActive ? activeStyle : inactiveTextStyle ?? styles.headerTabTextInactive,
                    animatedStyle,
                  ]}
                >
                  {tab === 'pourToi' ? 'Pour toi' : 'Explorer'}
                </Animated.Text>
              </TouchableOpacity>
            );
          })}
          <Animated.View
            style={[
              styles.headerTabUnderline,
              underlineStyle,
              {
                transform: [{ translateX: underlineTranslateX }],
                backgroundColor: typeof underlineColor === 'string' 
                  ? underlineColor 
                  : 'transparent',
              },
              typeof underlineColor !== 'string' && {
                backgroundColor: underlineColor as unknown as string,
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerTabsWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTabs: {
    flexDirection: 'row',
    width: 180,
    justifyContent: 'space-between',
    position: 'relative',
  },
  headerTabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  headerTabText: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerTabTextActive: {
    color: '#FFFFFF',
  },
  headerTabTextInactive: {
    color: 'rgba(255,255,255,0.6)',
  },
  headerTabUnderline: {
    position: 'absolute',
    bottom: -8,
    height: 4,
    width: 60,
    borderRadius: 999,
  },
});

export default TopFeedTabs;
