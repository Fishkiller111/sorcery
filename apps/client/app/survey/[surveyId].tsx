import type { Lang } from '../../src/i18n/types';
import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { safeGoBack } from '../../src/utils/safeGoBack';
import { ShellLayout } from '../../src/components/shell/ShellLayout';
import { useI18n } from '../../src/i18n/I18nContext';
import { getSurvey, submitSurvey } from '../../src/api/surveys';
import { useSurveyForm } from '../../src/hooks/useSurveyForm';
import { SurveyPager } from '../../src/components/survey/SurveyPager';
import { SurveyProgressBar } from '../../src/components/survey/SurveyProgressBar';
import { SurveyNav } from '../../src/components/survey/SurveyNav';
import { COLORS } from '../../src/theme/colors';
import { Typo } from '../../src/theme/typography';
import type { SurveyItem, SurveyQuestionItem } from '../../src/types/api';
import { notifyError, notifySuccess } from '../../src/utils/notify';
import { formatApiError } from '../../src/utils/apiError';
import { Message } from '../../src/components/ui/Message';
import { useMobilePageContentPaddingStyle } from '../../src/hooks/useMobileSafeAreaPadding';

export default function SurveyScreen() {
  const { surveyId } = useLocalSearchParams<{ surveyId: string }>();
  const router = useRouter();
  const { t, lang } = useI18n();
  const styles = useMemo(() => createStyles(lang), [lang]);
  const pageContentPadding = useMobilePageContentPaddingStyle();
  const { height: windowHeight } = useWindowDimensions();

  const [survey, setSurvey] = useState<SurveyItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [pagerWidth, setPagerWidth] = useState(0);

  const pagerRef = useRef<FlatList<SurveyQuestionItem>>(null);
  const questions = survey?.questions ?? [];

  const {
    answers,
    setAnswer,
    currentIndex,
    setCurrentIndex,
    total,
    isFirst,
    isLast,
    canProceed,
    buildSubmitAnswers,
  } = useSurveyForm(questions);

  const id = typeof surveyId === 'string' ? surveyId : surveyId?.[0] ?? '';

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    let mounted = true;
    setLoading(true);
    getSurvey(id)
      .then((data) => {
        if (!mounted) return;
        setSurvey(data);
        if (data.submitted && !data.allow_resubmit) {
          setCompleted(true);
        }
      })
      .catch((err) => {
        if (!mounted) return;
        notifyError(t('system.error'), formatApiError(t, err));
        safeGoBack('/');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [id, router, t]);

  const scrollToIndex = useCallback(
    (index: number) => {
      if (pagerWidth <= 0) return;
      pagerRef.current?.scrollToIndex({ index, animated: true });
      setCurrentIndex(index);
    },
    [pagerWidth, setCurrentIndex],
  );

  const handleNext = useCallback(() => {
    if (!canProceed || isLast) return;
    scrollToIndex(currentIndex + 1);
  }, [canProceed, currentIndex, isLast, scrollToIndex]);

  const handleBack = useCallback(() => {
    if (isFirst) return;
    scrollToIndex(currentIndex - 1);
  }, [currentIndex, isFirst, scrollToIndex]);

  const handleSubmit = useCallback(async () => {
    if (!id || !canProceed || submitting) return;
    setSubmitting(true);
    try {
      await submitSurvey(id, { answers: buildSubmitAnswers() });
      notifySuccess(t('survey.submitSuccess'));
      setCompleted(true);
    } catch (err) {
      Message.error(formatApiError(t, err));
    } finally {
      setSubmitting(false);
    }
  }, [buildSubmitAnswers, canProceed, id, submitting, t]);

  const pagerHeight = Math.max(280, windowHeight - 340);

  const renderBody = () => {
    if (loading) {
      return <ActivityIndicator size="large" color={COLORS.accent.gold} style={styles.loader} />;
    }

    if (!survey) {
      return <Text style={Typo(styles.errorText, 'sans', lang)}>{t('survey.loadFailed')}</Text>;
    }

    if (completed) {
      return (
        <View style={styles.thankYou}>
          <Text style={styles.thankYouTitle}>{t('survey.thankYouTitle')}</Text>
          <Text style={styles.thankYouBody}>{t('survey.thankYouBody')}</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/profile')}>
            <Text style={styles.primaryBtnText}>{t('survey.backToProfile')}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (questions.length === 0) {
      return <Text style={Typo(styles.errorText, 'sans', lang)}>{t('survey.emptyQuestions')}</Text>;
    }

    return (
      <>
        {survey.description ? <Text style={styles.intro}>{survey.description}</Text> : null}
        <SurveyProgressBar current={currentIndex} total={total} />
        <View
          style={[styles.pagerWrap, { height: pagerHeight }]}
          onLayout={(e) => setPagerWidth(e.nativeEvent.layout.width)}
        >
          {pagerWidth > 0 ? (
            <SurveyPager
              ref={pagerRef}
              questions={questions}
              pageWidth={pagerWidth}
              pageHeight={pagerHeight}
              answers={answers}
              onAnswerChange={setAnswer}
              currentIndex={currentIndex}
              onIndexChange={setCurrentIndex}
            />
          ) : null}
        </View>
        <SurveyNav
          isFirst={isFirst}
          isLast={isLast}
          canProceed={canProceed}
          submitting={submitting}
          onBack={handleBack}
          onNext={handleNext}
          onSubmit={() => void handleSubmit()}
        />
      </>
    );
  };

  return (
    <ShellLayout scrollable={false} showLangToggle={false}>
      <View style={[styles.page, pageContentPadding]}>
        <TouchableOpacity onPress={() => safeGoBack('/')} style={styles.backRow} activeOpacity={0.7}>
          <Text style={Typo(styles.backText, 'sans', lang)}>‹ {t('referral.back')}</Text>
        </TouchableOpacity>

        <Text style={styles.eyebrow}>{t('survey.eyebrow')}</Text>
        <Text style={styles.title}>{survey?.title ?? t('survey.menuTitle')}</Text>

        {renderBody()}
      </View>
    </ShellLayout>
  );
}

function createStyles(lang: Lang) {
  return StyleSheet.create({
  page: {
    flex: 1,
    padding: 20,
    paddingBottom: 24,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
    gap: 16,
  },
  backRow: {
    marginBottom: 4,
  },
  backText: { color: COLORS.agents.paleGoldMuted, fontSize: 13 },
  eyebrow: Typo(
    {
      color: COLORS.agents.paleGoldMuted,
      fontSize: 11,
      letterSpacing: 2,
      textTransform: 'uppercase',
    },
    'mono', lang
  ),
  title: Typo(
    {
      color: COLORS.agents.paleGold,
      fontSize: 26,
      fontWeight: '700',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    'display', lang
  ),
  intro: Typo(
    {
      color: COLORS.agents.paleGoldMuted,
      fontSize: 14,
      lineHeight: 21,
    },
    'sans', lang
  ),
  pagerWrap: {
    width: '100%',
    flexGrow: 1,
  },
  loader: {
    marginVertical: 48,
  },
  thankYou: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingVertical: 40,
  },
  thankYouTitle: Typo(
    {
      color: COLORS.agents.paleGold,
      fontSize: 26,
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    'display', lang
  ),
  thankYouBody: Typo(
    {
      color: COLORS.agents.paleGoldMuted,
      fontSize: 15,
      lineHeight: 22,
      textAlign: 'center',
    },
    'sans', lang
  ),
  primaryBtn: {
    marginTop: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
    backgroundColor: '#7a1e1e',
    borderWidth: 1,
    borderColor: 'rgba(158, 27, 27, 0.6)',
    borderRadius: 4,
  },
  primaryBtnText: Typo(
    {
      color: COLORS.agents.paleGold,
      fontSize: 14,
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    'display', lang
  ),
  errorText: { color: COLORS.agents.paleGoldMuted, fontSize: 15, textAlign: 'center' },
});
};
