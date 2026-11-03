let handler: (() => void) | null = null;
let handling = false;

export function setUnauthorizedHandler(fn: () => void) {
  handler = fn;
}

export function handleUnauthorized() {
  if (handling || !handler) return;
  handling = true;
  try {
    handler();
  } finally {
    setTimeout(() => {
      handling = false;
    }, 1500);
  }
}
