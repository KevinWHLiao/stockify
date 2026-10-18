import { colors } from '../theme';
import { T } from './Text';

export function Logo() {
  return <T style={word}>我的持股</T>;
}

const word = { fontSize: 28, lineHeight: 36, fontWeight: '800' as const, color: colors.text };
