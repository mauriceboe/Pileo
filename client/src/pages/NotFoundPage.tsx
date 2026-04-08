import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import styles from './not-found-page.module.css';

export function NotFoundPage() {
  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <div className={styles.errorCode}>
          <span className={styles.digit}>4</span>
          <span className={styles.digitMiddle}>0</span>
          <span className={styles.digit}>4</span>
        </div>

        <h1 className={styles.title}>Page not found</h1>
        <p className={styles.message}>
          The page you're looking for doesn't exist or has been moved.
          Maybe the URL is misspelled, or the page drifted into the void.
        </p>

        <div className={styles.actions}>
          <Link to="/" className={styles.primaryLink}>
            <Home size={16} />
            Back to Dashboard
          </Link>
          <button
            type="button"
            className={styles.secondaryLink}
            onClick={() => window.history.back()}
          >
            <ArrowLeft size={16} />
            Go back
          </button>
        </div>
      </div>

      {/* Decorative background shapes */}
      <div className={styles.bgShape1} />
      <div className={styles.bgShape2} />
      <div className={styles.bgShape3} />
    </div>
  );
}
