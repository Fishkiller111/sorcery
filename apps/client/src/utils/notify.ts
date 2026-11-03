import { Message, type MessageType } from '../components/ui/Message';

function joinTitleBody(title: string, body?: string): string {
  const trimmedTitle = title.trim();
  const trimmedBody = body?.trim();
  if (!trimmedBody) return trimmedTitle;
  if (!trimmedTitle) return trimmedBody;
  return `${trimmedTitle}：${trimmedBody}`;
}

export function notify(type: MessageType, title: string, body?: string) {
  Message[type](joinTitleBody(title, body));
}

export function notifySuccess(title: string, body?: string) {
  notify('success', title, body);
}

export function notifyError(title: string, body?: string) {
  notify('error', title, body);
}

export function notifyWarning(title: string, body?: string) {
  notify('warning', title, body);
}
