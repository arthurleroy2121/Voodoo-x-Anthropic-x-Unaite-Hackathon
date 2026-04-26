import 'server-only';

export type ApiErrorCode =
  | 'VALIDATION'
  | 'UPSTREAM'
  | 'TIMEOUT'
  | 'BAD_RESPONSE'
  | 'INTERNAL';

export type ApiErrorEnvelope = {
  ok: false;
  code: ApiErrorCode;
  message: string;
};

export function errorEnvelope(
  code: ApiErrorCode,
  detail: unknown,
): ApiErrorEnvelope {
  let message: string;
  if (typeof detail === 'string') {
    message = detail;
  } else if (detail instanceof Error) {
    message = detail.message;
  } else {
    try {
      message = JSON.stringify(detail);
    } catch {
      message = 'Request failed';
    }
  }
  return { ok: false, code, message };
}
