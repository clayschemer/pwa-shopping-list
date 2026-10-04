import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Returns the Firestore instance, initialising the Admin SDK on first call.
 * Uses GOOGLE_APPLICATION_CREDENTIALS env var (standard ADC / service account path).
 */
export function getDb() {
  if (getApps().length === 0) {
    const cred = process.env['GOOGLE_APPLICATION_CREDENTIALS'];
    if (!cred) {
      throw new Error(
        'GOOGLE_APPLICATION_CREDENTIALS is not set.\n' +
        'Download a service account key from Firebase Console → Project Settings → Service Accounts\n' +
        'and save it as price-pipeline/service-account.json, then use the scheduler compose override.',
      );
    }
    initializeApp(); // ADC picks up GOOGLE_APPLICATION_CREDENTIALS automatically
  }
  return getFirestore();
}
