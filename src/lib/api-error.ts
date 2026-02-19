export function getApiErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    if (error.message.includes('401')) {
      return 'Session expired. Please login again.';
    }
    if (error.message.includes('403')) {
      return 'You do not have permission for this vendor action.';
    }
    if (error.message.includes('404')) {
      return 'Vendor profile not found. Please complete onboarding first.';
    }
    if (error.message.includes('409')) {
      return 'Conflict detected. Refresh and try again.';
    }
    return error.message;
  }
  return fallback;
}
