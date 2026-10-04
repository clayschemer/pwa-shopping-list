/**
 * Weights and formatting for the boot progress card.
 *
 * The bar is split between a pre-bootstrap segment, driven by the inline script in
 * `src/index.html`, and the milestones below, driven by store state once Angular is
 * running. The two halves share this scale so the hand-off does not jump.
 */

/**
 * Reserved for downloading and parsing the app itself. Complete by definition
 * once any of this code executes.
 */
export const PHASE_BASE = 35;

export type BootMilestone =
  | 'translations'
  | 'auth'
  | 'account'
  | 'list'
  | 'sessions';

/** Roughly proportional to how long each milestone takes on a cold start. */
export const MILESTONE_WEIGHT: Record<BootMilestone, number> = {
  translations: 10,
  auth: 15,
  account: 15,
  list: 20,
  sessions: 5,
};

/**
 * Separates the two halves of the diagnostics line. Deliberately not a translation
 * key: the whole line is language-neutral technical detail (see DESIGN.md).
 */
export const DETAIL_SEPARATOR = ' · ';

const FALLBACK_LOCALE = 'en';

function formatNumber(value: number, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value);
  } catch {
    // An unrecognised language tag must not take the boot screen down with it.
    return new Intl.NumberFormat(FALLBACK_LOCALE, {
      maximumFractionDigits: 1,
    }).format(value);
  }
}

/**
 * Renders the running resource tally, e.g. `41 · 1.6 MB`.
 *
 * Carries no words so it needs no translation, but the numbers still go through
 * `Intl` — a Swedish or German reader expects a decimal comma.
 */
export function formatBootCounter(
  files: number,
  bytes: number,
  locale: string,
): string {
  if (files === 0) {
    return '';
  }

  let size: string;
  if (bytes >= 1_000_000) {
    size = `${formatNumber(bytes / 1_000_000, locale)} MB`;
  } else if (bytes >= 1_000) {
    size = `${formatNumber(bytes / 1_000, locale)} kB`;
  } else {
    size = `${formatNumber(bytes, locale)} B`;
  }

  return `${formatNumber(files, locale)}${DETAIL_SEPARATOR}${size}`;
}
