import { notifyWarning } from './notify';

type LoginRouter = {
  push: (href: any) => void;
};

export function requireLoginForAction(
  isLoggedIn: boolean,
  router: LoginRouter,
  message: string,
): boolean {
  if (isLoggedIn) return true;
  notifyWarning(message);
  router.push('/login');
  return false;
}
