import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { BookOpen, ArrowLeft, Moon, Sun } from 'lucide-react';
import { ErrorBoundary, IconButton } from '../components/ui';
import { useDarkMode } from '../hooks';

/**
 * AuthLayout: Login/Register Layout
 * Responsive single column on mobile, two columns on desktop
 */
const AuthLayout = () => {
  const { isDark, toggleDarkMode } = useDarkMode();

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-paper dark:bg-paper flex flex-col md:flex-row">
        {/* Left Side: Brand (Desktop only) */}
        <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-primary-dark to-primary p-8 lg:p-12 text-surface flex-col justify-between relative overflow-hidden">
          {/* Background glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary-light/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/20 rounded-full blur-3xl pointer-events-none" />

          {/* Top Link */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-body-sm font-semibold text-primary-light hover:text-surface transition z-10"
          >
            <ArrowLeft size={16} />
            Back to home
          </Link>

          {/* Brand Content */}
          <div className="max-w-md space-y-4 z-10">
            <div className="w-14 h-14 rounded-card bg-surface/10 backdrop-blur-md flex items-center justify-center text-accent shadow-lg border border-surface/20">
              <BookOpen size={28} />
            </div>
            <h1 className="text-display-md font-bold tracking-tight text-surface">
              Phương Anh Bookstore
            </h1>
            <p className="text-primary-light text-body-md leading-relaxed">
              Discover knowledge with millions of curated books. Enjoy smart shopping experience with AI assistance!
            </p>
          </div>

          {/* Footer Note */}
          <div className="text-body-sm text-primary-light/80 z-10 flex items-center gap-2">
            <span>Perfect reading & shopping experience on every device.</span>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="flex-1 flex flex-col justify-center items-center p-4 sm:p-8 min-h-screen md:min-h-0 relative">
          {/* Dark Mode Toggle - Top Right */}
          <div className="absolute top-4 right-4">
            <IconButton
              icon={isDark ? Sun : Moon}
              onClick={toggleDarkMode}
              variant="ghost"
              aria-label={isDark ? 'Light mode' : 'Dark mode'}
            />
          </div>

          <div className="w-full max-w-md">
            {/* Mobile Header */}
            <div className="md:hidden mb-6 flex items-center justify-between">
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-primary hover:text-primary-dark"
              >
                <ArrowLeft size={16} />
                Home
              </Link>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-primary text-surface flex items-center justify-center text-label font-bold">
                  P
                </div>
                <span className="font-bold text-body-md text-ink dark:text-ink">Phương Anh</span>
              </div>
            </div>

            {/* Form Card */}
            <div className="bg-surface dark:bg-surface-muted rounded-card border border-border dark:border-border p-6 sm:p-8 shadow-md">
              <Outlet />
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default AuthLayout;
