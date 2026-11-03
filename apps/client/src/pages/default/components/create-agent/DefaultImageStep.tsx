import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useI18n } from '../../../../i18n/I18nContext';
import { Typo } from '../../../../theme/typography';
import { TOKENS } from '../../theme/tokens';
import { DefaultCreateAgentPreview } from './DefaultCreateAgentPreview';

type DefaultImageStepProps = {
  name: string;
  personality: string[];
  previewUri?: string;
  uploading: boolean;
  onPickFigure: () => void;
  generatingPreview?: boolean;
  previewProgress?: number;
  onRegeneratePress?: () => void;
  previewEnabled?: boolean;
};

export function DefaultImageStep({
  name,
  personality,
  previewUri,
  uploading,
  generatingPreview,
  previewProgress,
  onPickFigure,
  onRegeneratePress,
  previewEnabled = false,
}: DefaultImageStepProps) {
  const { t } = useI18n();

  return (
    <View>
      <Text style={styles.hint}>
        {t(previewEnabled ? 'createAgent.wizard.previewOrUpload' : 'createAgent.wizard.uploadOnly')}
      </Text>
      <DefaultCreateAgentPreview
        name={name}
        personality={personality}
        figureUri={previewUri}
        uploading={uploading}
        generatingPreview={previewEnabled ? generatingPreview : false}
        previewProgress={previewProgress}
        onPickFigure={onPickFigure}
        onRegeneratePress={previewEnabled ? onRegeneratePress : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hint: Typo(
    {
      color: TOKENS.colors.textSecondary,
      fontSize: 13,
      marginBottom: 16,
      textAlign: 'center',
      lineHeight: 20,
    },
    'sans',
  ),
});
