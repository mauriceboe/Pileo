import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema } from '@pileo/shared';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useAuthStore } from '../../stores/auth.store';
import { ApiRequestError } from '../../api/client';
import styles from './register-page.module.css';

const registerFormSchema = registerSchema
  .extend({
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormInput = z.infer<typeof registerFormSchema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const registerAction = useAuthStore((state) => state.register);
  const [serverError, setServerError] = useState<string | null>(null);
  const [registrationDisabled, setRegistrationDisabled] = useState(false);

  useEffect(() => {
    fetch('/api/v1/auth/registration-status')
      .then((r) => r.json())
      .then((body) => {
        if (!body.data?.enabled) setRegistrationDisabled(true);
      })
      .catch(() => {});
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormInput>({
    resolver: zodResolver(registerFormSchema),
  });

  const onSubmit = async (data: RegisterFormInput): Promise<void> => {
    setServerError(null);
    try {
      const { confirmPassword: _, ...registerData } = data;
      await registerAction(registerData);
      navigate('/', { replace: true });
    } catch (error) {
      if (error instanceof ApiRequestError) {
        setServerError(error.message);
      } else {
        setServerError('An unexpected error occurred. Please try again.');
      }
    }
  };

  if (registrationDisabled) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.header}>
            <h1 className={styles.title}>Pileo</h1>
            <p className={styles.subtitle}>Registration is currently disabled</p>
          </div>
          <div className={styles.footer}>
            <p className={styles.footerText}>
              Please contact an administrator or{' '}
              <Link to="/login" className={styles.link}>sign in</Link>
              {' '}if you already have an account.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Pileo</h1>
          <p className={styles.subtitle}>Create your account</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
          {serverError && (
            <div className={styles.serverError} role="alert">
              {serverError}
            </div>
          )}

          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label="Username"
            type="text"
            placeholder="your-username"
            autoComplete="username"
            error={errors.username?.message}
            {...register('username')}
          />

          <Input
            label="Display name"
            type="text"
            placeholder="Your Name"
            autoComplete="name"
            error={errors.displayName?.message}
            {...register('displayName')}
          />

          <Input
            label="Password"
            type="password"
            placeholder="At least 8 characters"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register('password')}
          />

          <Input
            label="Confirm password"
            type="password"
            placeholder="Repeat your password"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />

          <Button type="submit" loading={isSubmitting} size="lg">
            Create account
          </Button>
        </form>

        <div className={styles.footer}>
          <p className={styles.footerText}>
            Already have an account?{' '}
            <Link to="/login" className={styles.link}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
