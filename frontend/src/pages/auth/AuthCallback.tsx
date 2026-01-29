import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, user, refreshSession } = useAuth();
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    // Prevent multiple redirects
    if (hasRedirected) return;

    // Check for error in URL params
    const error = searchParams.get('error');
    if (error) {
      console.error('OAuth error:', error);
      navigate('/login', { 
        replace: true, 
        state: { error: 'Authentication failed. Please try again.' } 
      });
      setHasRedirected(true);
      return;
    }

    // Check if we're already authenticated
    if (isAuthenticated && user) {
      // Refresh session to ensure we have latest role from DB
      refreshSession().then(() => {
        // Small delay to ensure role is updated from DB
        setTimeout(() => {
          const redirectPath = user.role === 'host' ? '/host' : '/student';
          navigate(redirectPath, { replace: true });
          setHasRedirected(true);
        }, 500);
      }).catch(() => {
        // If refresh fails, redirect anyway based on current user role
        const redirectPath = user.role === 'host' ? '/host' : '/student';
        navigate(redirectPath, { replace: true });
        setHasRedirected(true);
      });
      return;
    }

    // If not authenticated yet, wait a bit for auth state to update
    // The AuthContext will handle the session restoration
    const timeout = setTimeout(() => {
      if (!isAuthenticated && !hasRedirected) {
        // If still not authenticated after 3 seconds, redirect to login
        navigate('/login', { replace: true });
        setHasRedirected(true);
      }
    }, 3000);

    return () => clearTimeout(timeout);
  }, [isAuthenticated, user, navigate, searchParams, hasRedirected, refreshSession]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
        <h2 className="mt-4 text-xl font-semibold text-foreground">Completing authentication...</h2>
        <p className="mt-2 text-muted-foreground">Please wait while we set up your account</p>
      </div>
    </div>
  );
};

export default AuthCallback;