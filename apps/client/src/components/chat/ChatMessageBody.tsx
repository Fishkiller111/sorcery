import React, { useMemo } from 'react';
import { Text, View, StyleSheet, type TextStyle, type StyleProp } from 'react-native';
import { buildChatDisplayBlocks } from '../../utils/chatDisplayText';

type ChatMessageBodyProps = {
  text: string;
  dialogueStyle: StyleProp<TextStyle>;
  actionStyle?: StyleProp<TextStyle>;
};

export function ChatMessageBody({ text, dialogueStyle, actionStyle }: ChatMessageBodyProps) {
  const blocks = useMemo(() => buildChatDisplayBlocks(text), [text]);
  const action = actionStyle ?? styles.actionDefault;

  if (blocks.length === 0) return null;

  if (blocks.length === 1) {
    const only = blocks[0];
    return (
      <Text style={[dialogueStyle, only.kind === 'action' ? action : null]}>{only.text}</Text>
    );
  }

  return (
    <View style={styles.stack}>
      {blocks.map((block, index) => (
        <Text
          key={`${block.kind}-${index}`}
          style={[dialogueStyle, block.kind === 'action' ? action : null]}
        >
          {block.text}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 12,
  },
  actionDefault: {
    color: 'rgba(138, 130, 120, 0.92)',
    fontStyle: 'italic',
  },
});
