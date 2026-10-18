import { Platform, Text, type TextProps, TextInput, type TextInputProps } from 'react-native';
import { colors } from '../theme';

const fontFamily = Platform.OS === 'web' ? '"Microsoft JhengHei", "PingFang TC", "Noto Sans TC", sans-serif' : undefined;

export function T(props: TextProps) {
  const { style, ...rest } = props;
  return <Text {...rest} style={[fontFamily ? { fontFamily } : null, style]} />;
}

export function FieldInput(props: TextInputProps) {
  const { style, placeholderTextColor = '#A0A7B2', ...rest } = props;
  return (
    <TextInput
      {...rest}
      placeholderTextColor={placeholderTextColor}
      style={[
        {
          borderWidth: 0,
          borderRadius: 16,
          paddingHorizontal: 14,
          paddingVertical: 14,
          fontSize: 16,
          color: colors.text,
          backgroundColor: colors.chip,
        },
        fontFamily ? { fontFamily } : null,
        style,
      ]}
    />
  );
}
