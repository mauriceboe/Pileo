import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema } from '@pileo/shared';
import type { ForgotPasswordInput } from '@pileo/shared';
import { Link } from 'react-router-dom';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import * as authApi from '../../api/auth.api';
import { ApiRequestError } from '../../api/client';
import styles from './forgot-password-page.module.css';

export function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordInput): Promise<void> => {
    setServerError(null);
    try {
      await authApi.forgotPassword(data);
      setSubmitted(true);
    } catch (error) {
      if (error instanceof ApiRequestError) {
        setServerError(error.message);
      } else {
        setServerError('An unexpected error occurred. Please try again.');
      }
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Pileo</h1>
          <p className={styles.subtitle}>Reset your password</p>
        </div>

        {submitted ? (
          <div className={styles.successMessage}>
            <p className={styles.successText}>
              If an account exists with that email, we&apos;ve sent password reset
              instructions. Please check your inbox.
            </p>
            <Link to="/login" className={styles.backLink}>
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
              {serverError && (
                <div className={styles.serverError} role="alert">
                  {serverError}
                </div>
              )}

              <p className={styles.description}>
                Enter the email address associated with your account and we&apos;ll send
                you a link to reset your password.
              </p>

              <Input
                label="Email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                error={errors.email?.message}
                {...register('email')}
              />

              <Button type="submit" loading={isSubmitting} size="lg">
                Send reset link
              </Button>
            </form>

            <div className={styles.footer}>
              <Link to="/login" className={styles.link}>
                Back to sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
