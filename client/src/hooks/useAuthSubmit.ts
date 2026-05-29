import { useCallback, useState } from 'react';
import { ApiRequestError } from '../api/client';

interface UseAuthSubmitResult<TInput> {
  serverError: string | null;
  submit: (input: TInput) => Promise<void>;
}

/**
 * Wraps an auth action with consistent error-to-string mapping for the form banner.
 * On success, calls `onSuccess`. On failure, sets a user-facing message.
 */
export function useAuthSubmit<TInput>(
  action: (input: TInput) => Promise<unknown>,
  onSuccess: () => void,
): UseAuthSubmitResult<TInput> {
  const [serverError, setServerError] = useState<string | null>(null);

  const submit = useCallback(async (input: TInput) => {
    setServerError(null);
    try {
      await action(input);
      onSuccess();
    } catch (error) {
      if (error instanceof ApiRequestError) {
        setServerError(error.message);
      } else {
        setServerError('An unexpected error occurred. Please try again.');
      }
    }
  }, [action, onSuccess]);

  return { serverError, submit };
}
