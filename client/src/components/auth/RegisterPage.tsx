import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema } from '@pileo/shared';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useAuthStore } from '../../stores/auth.store';
import { useAuthSubmit } from '../../hooks/useAuthSubmit';
import { useRegistrationOpen } from '../../hooks/useRegistrationOpen';
import { AuthShell, AuthErrorBanner } from './AuthShell';
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
  const registerAction = useAuthStore((s) => s.register);
  const isOpen = useRegistrationOpen();

  const submitRegister = async (data: RegisterFormInput) => {
    const { confirmPassword: _, ...registerData } = data;
    await registerAction(registerData);
  };

  const { serverError, submit } = useAuthSubmit<RegisterFormInput>(
    submitRegister,
    () => navigate('/', { replace: true }),
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormInput>({ resolver: zodResolver(registerFormSchema) });

  if (!isOpen) {
    return (
      <AuthShell
        subtitle="Registration is currently disabled"
        footer={
          <p className={styles.footerText}>
            Please contact an administrator or{' '}
            <Link to="/login" className={styles.link}>sign in</Link>
            {' '}if you already have an account.
          </p>
        }
      />
    );
  }

  return (
    <AuthShell
      subtitle="Create your account"
      footer={
        <p className={styles.footerText}>
          Already have an account?{' '}
          <Link to="/login" className={styles.link}>Sign in</Link>
        </p>
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
        <Button type="submit" loading={isSubmitting} size="lg">Create account</Button>
      </form>
    </AuthShell>
  );
}
