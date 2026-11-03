import { apiFetch } from './client';
import type { SubmitSurveyReq, SubmitSurveyResp, SurveyItem, SurveyListResp } from '../types/api';

export async function listSurveys(): Promise<SurveyListResp> {
  return apiFetch<SurveyListResp>('/surveys');
}

export async function getSurvey(surveyId: string): Promise<SurveyItem> {
  return apiFetch<SurveyItem>(`/surveys/${encodeURIComponent(surveyId)}`);
}

export async function submitSurvey(surveyId: string, req: SubmitSurveyReq): Promise<SubmitSurveyResp> {
  return apiFetch<SubmitSurveyResp>(`/surveys/${encodeURIComponent(surveyId)}/submit`, {
    method: 'POST',
    body: JSON.stringify(req),
  });
}
