import { peekServer } from './config';
import { mockAdapter } from './mock/adapter';
import { restAdapter } from './rest/adapter';
import { ApiAdapter } from './types';

/**
 * The one place that decides which backend the app talks to: the shop's
 * server when the build names one, demo data when it does not.
 */
export const api: ApiAdapter = peekServer().useMock ? mockAdapter : restAdapter;

export function isMock(): boolean {
  return peekServer().useMock;
}
