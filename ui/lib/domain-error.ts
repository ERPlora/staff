// The module's own translation of the domain codes its handler answers with (staff#1, ADR-0055).
//
// A guard failure travels as `ErploraError { code: 'staff.<snake>', message: <English> }`. The code
// is the module's public ABI, so its translation lives with the module (`locales/<lang>.json` →
// `errors`), English source + Spanish; the runtime's English text is only the last resort, for a
// code this module does not know (a shell code such as `hub.elevation.*`).
//
// A translation may carry `{placeholders}` (staff#55: `{name}` of the record that already holds a
// Hub user). The error itself carries only a code and a sentence, so the screen that knows the value
// passes it in `vars`; without it, the runtime's own sentence is shown — never a raw `{name}`.
import esLocale from '../../locales/es.json';
import enLocale from '../../locales/en.json';

const ERRORS: Record<string, Record<string, string>> = {
  es: (esLocale as { errors?: Record<string, string> }).errors ?? {},
  en: (enLocale as { errors?: Record<string, string> }).errors ?? {},
};

const PLACEHOLDER = /\{(\w+)\}/g;

/** The message to show for `e`, in `lang`; `fallback` when `e` is not an Error at all. */
export function domainMessage(
  e: unknown,
  lang: string,
  fallback: string,
  vars: Record<string, string> = {},
): string {
  if (!(e instanceof Error)) return fallback;
  const code = (e as { code?: unknown }).code;
  if (typeof code === 'string') {
    const translated = ERRORS[lang]?.[code] ?? ERRORS.en[code];
    const missing = translated ? [...translated.matchAll(PLACEHOLDER)].some(([, k]) => !vars[k]) : true;
    if (translated && !missing) return translated.replace(PLACEHOLDER, (_, k: string) => vars[k]);
  }
  return e.message || fallback;
}
