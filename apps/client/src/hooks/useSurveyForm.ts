import { useCallback, useMemo, useState } from 'react';
import type { SubmitSurveyAnswer, SurveyQuestionItem } from '../types/api';

function parseMultiChoice(value: string): string[] {
  if (!value.trim()) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function isQuestionAnswered(question: SurveyQuestionItem, raw: string): boolean {
  const value = raw.trim();
  if (!question.required) return true;
  if (question.question_type === 'multi_choice') {
    return parseMultiChoice(value).length > 0;
  }
  return value !== '';
}

export function useSurveyForm(questions: SurveyQuestionItem[]) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);

  const total = questions.length;
  const currentQuestion = questions[currentIndex];
  const isFirst = currentIndex <= 0;
  const isLast = total > 0 && currentIndex >= total - 1;

  const canProceed = useMemo(() => {
    if (!currentQuestion) return false;
    return isQuestionAnswered(currentQuestion, answers[currentQuestion.question_id] ?? '');
  }, [answers, currentQuestion]);

  const setAnswer = useCallback((questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const buildSubmitAnswers = useCallback((): SubmitSurveyAnswer[] => {
    const out: SubmitSurveyAnswer[] = [];
    for (const q of questions) {
      const raw = (answers[q.question_id] ?? '').trim();
      if (!raw) continue;
      out.push({ question_id: q.question_id, answer: raw });
    }
    return out;
  }, [answers, questions]);

  return {
    answers,
    setAnswer,
    currentIndex,
    setCurrentIndex,
    currentQuestion,
    total,
    isFirst,
    isLast,
    canProceed,
    buildSubmitAnswers,
  };
}
