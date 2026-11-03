import React, { forwardRef, useCallback } from 'react';
import { FlatList, View, StyleSheet, type ListRenderItem } from 'react-native';
import { SurveyQuestionCard } from './SurveyQuestionCard';
import type { SurveyQuestionItem } from '../../types/api';

type SurveyPagerProps = {
  questions: SurveyQuestionItem[];
  pageWidth: number;
  pageHeight: number;
  answers: Record<string, string>;
  onAnswerChange: (questionId: string, value: string) => void;
  currentIndex: number;
  onIndexChange: (index: number) => void;
};

export const SurveyPager = forwardRef<FlatList<SurveyQuestionItem>, SurveyPagerProps>(
  function SurveyPager(
    { questions, pageWidth, pageHeight, answers, onAnswerChange, currentIndex, onIndexChange },
    ref,
  ) {
    const renderItem: ListRenderItem<SurveyQuestionItem> = useCallback(
      ({ item, index }) => (
        <View style={[styles.page, { width: pageWidth, height: pageHeight }]}>
          <SurveyQuestionCard
            question={item}
            value={answers[item.question_id] ?? ''}
            onChange={(v) => onAnswerChange(item.question_id, v)}
            showRequiredHint={currentIndex === index}
          />
        </View>
      ),
      [answers, currentIndex, onAnswerChange, pageHeight, pageWidth],
    );

    const keyExtractor = useCallback((item: SurveyQuestionItem) => item.question_id, []);

    const getItemLayout = useCallback(
      (_: ArrayLike<SurveyQuestionItem> | null | undefined, index: number) => ({
        length: pageWidth,
        offset: pageWidth * index,
        index,
      }),
      [pageWidth],
    );

    return (
      <FlatList
        ref={ref}
        data={questions}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        extraData={{ answers, currentIndex }}
        onScrollToIndexFailed={(info) => {
          const list = ref && 'current' in ref ? ref.current : null;
          setTimeout(() => {
            list?.scrollToIndex({ index: info.index, animated: true });
          }, 50);
        }}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
          if (index !== currentIndex && index >= 0 && index < questions.length) {
            onIndexChange(index);
          }
        }}
      />
    );
  },
);

const styles = StyleSheet.create({
  page: {
    overflow: 'hidden',
  },
});
