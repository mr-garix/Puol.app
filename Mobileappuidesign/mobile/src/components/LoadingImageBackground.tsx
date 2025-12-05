import React, { memo, useState } from 'react';
import { ImageBackground, StyleSheet, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';

import { MediaLoadingOverlay } from './MediaLoadingOverlay';

type LoadingImageBackgroundProps = {
  uri: string;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  children?: React.ReactNode;
};

export const LoadingImageBackground = memo<LoadingImageBackgroundProps>(({ uri, style, imageStyle, children }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <ImageBackground
      source={{ uri }}
      style={style}
      imageStyle={imageStyle}
      onLoadEnd={() => setIsLoaded(true)}
    >
      {!isLoaded && <MediaLoadingOverlay />}
      {children}
    </ImageBackground>
  );
});

LoadingImageBackground.displayName = 'LoadingImageBackground';

const styles = StyleSheet.create({});
