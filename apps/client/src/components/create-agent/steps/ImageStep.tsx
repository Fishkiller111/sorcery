import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useI18n } from '../../../i18n/I18nContext';
import { COLORS } from '../../../theme/colors';
import { Typo } from '../../../theme/typography';
import { CreateAgentPreview } from '../CreateAgentPreview';

type ImageStepProps = {
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

export function ImageStep({
  name,
  personality,
  previewUri,
  uploading,
  generatingPreview,
  previewProgress,
  onPickFigure,
  onRegeneratePress,
  previewEnabled = false,
}: ImageStepProps) {
  const { t, lang } = useI18n();

  return (
    <View>
      <Text style={Typo(styles.hint, 'sans', lang)}>
        {t(previewEnabled ? 'createAgent.wizard.previewOrUpload' : 'createAgent.wizard.uploadOnly')}
      </Text>
      <CreateAgentPreview
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
  hint: { color: COLORS.text.muted, fontSize: 13, marginBottom: 16, textAlign: 'center' },
});
