export const HEADER_COUNTS_REFRESH_EVENT = 'eco:header-counts-refresh';

export function notifyHeaderCountsRefresh() {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(new Event(HEADER_COUNTS_REFRESH_EVENT));
}
