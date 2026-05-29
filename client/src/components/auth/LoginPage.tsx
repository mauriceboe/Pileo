import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@pileo/shared';
import type { LoginInput } from '@pileo/shared';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useAuthStore } from '../../stores/auth.store';
import { useAuthSubmit } from '../../hooks/useAuthSubmit';
import { AuthShell, AuthErrorBanner } from './AuthShell';
import styles from './login-page.module.css';

export function LoginPage() {
  const navigate = useNavigate();
  const loginAction = useAuthStore((s) => s.login);
  const { serverError, submit } = useAuthSubmit<LoginInput>(
    loginAction,
    () => navigate('/', { replace: true }),
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  return (
    <AuthShell
      subtitle="Sign in to your account"
      footer={
        <>
          <Link to="/forgot-password" className={styles.link}>Forgot your password?</Link>
          <p className={styles.footerText}>
            Don&apos;t have an account?{' '}
            <Link to="/register" className={styles.link}>Sign up</Link>
          </p>
        </>
      }
    >
      <form className={styles.form} onSubmit={handleSubmit(submit)} noValidate>
        <AuthErrorBanner message={serverError} />
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Password"
          type="password"
          placeholder="Enter your password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <Button type="submit" loading={isSubmitting} size="lg">Log in</Button>
      </form>
    </AuthShell>
  );
}
