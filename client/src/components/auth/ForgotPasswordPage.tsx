import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema } from '@pileo/shared';
import type { ForgotPasswordInput } from '@pileo/shared';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import * as authApi from '../../api/auth.api';
import { useAuthSubmit } from '../../hooks/useAuthSubmit';
import { AuthShell, AuthErrorBanner } from './AuthShell';
import styles from './forgot-password-page.module.css';

export function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const { serverError, submit } = useAuthSubmit<ForgotPasswordInput>(
    authApi.forgotPassword,
    () => setSubmitted(true),
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  if (submitted) {
    return (
      <AuthShell subtitle="Reset your password">
        <div className={styles.successMessage}>
          <p className={styles.successText}>
            If an account exists with that email, we&apos;ve sent password reset
            instructions. Please check your inbox.
          </p>
          <Link to="/login" className={styles.backLink}>Back to sign in</Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      subtitle="Reset your password"
      footer={<Link to="/login" className={styles.link}>Back to sign in</Link>}
    >
      <form className={styles.form} onSubmit={handleSubmit(submit)} noValidate>
        <AuthErrorBanner message={serverError} />
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
        <Button type="submit" loading={isSubmitting} size="lg">Send reset link</Button>
      </form>
    </AuthShell>
  );
}
