import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Session, Provider } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export type UserRole = 'host' | 'student' | null;

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, role: UserRole) => Promise<void>;
  loginWithGoogle: (role?: UserRole) => Promise<void>;
  logout: (redirectTo?: string) => Promise<void>;
  logoutWithRedirect: (navigate: (path: string) => void, redirectTo?: string) => Promise<void>;
  setUserRole: (role: UserRole) => void;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Ensure user profile exists in public.users table
const ensureUserProfile = async (session: Session, role?: UserRole) => {
  if (!session?.user) return;

  const supabaseUser = session.user;
  const metadata = supabaseUser.user_metadata || {};

  try {
    // Check if profile exists
    const { data: existing } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', supabaseUser.id)
      .maybeSingle();

    if (!existing) {
      // Create profile if it doesn't exist (new OAuth signup)
      // Use role from parameter (passed from OAuth signup page) or default to student
      const { error } = await supabase.from('users').insert({
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        full_name: metadata.full_name || supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'User',
        role: role || metadata.role || 'student',
      });
      
      if (error) {
        console.error('Error creating user profile:', error);
      }
    } else {
      // Profile exists - check if we need to update the role
      // This handles the case where the DB trigger created the profile with 'student' 
      // but the user actually signed up as 'host' (OAuth flow timing issue)
      const targetRole = role || metadata.role;
      
      if (targetRole && targetRole !== existing.role) {
        // Update the role if a different role was explicitly requested
        const { error } = await supabase
          .from('users')
          .update({ role: targetRole })
          .eq('id', supabaseUser.id);
        
        if (error) {
          console.error('Error updating user role:', error);
        }
      }
    }
  } catch (error) {
    console.error('Error ensuring user profile:', error);
  }
};

// Refresh session helper
const refreshCurrentSession = async (): Promise<Session | null> => {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      console.error('Session refresh error:', error);
      return null;
    }
    return data.session;
  } catch (error) {
    console.error('Session refresh failed:', error);
    return null;
  }
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initTimeout, setInitTimeout] = useState<NodeJS.Timeout | null>(null);

  // Get user directly from session - no database calls, instant
  const getUserFromSession = (session: Session | null, overrideRole?: UserRole): User | null => {
    if (!session?.user) return null;
    
    const supabaseUser = session.user;
    const metadata = supabaseUser.user_metadata || {};
    
    return {
      id: supabaseUser.id,
      name: metadata.full_name || metadata.name || supabaseUser.email?.split('@')[0] || 'User',
      email: supabaseUser.email || '',
      role: overrideRole || (metadata.role as UserRole) || 'student',
    };
  };

  // Initialize auth state
  const clearAuthStorage = () => {
    if (typeof window !== 'undefined') {
      // Clear all Supabase-related entries from localStorage
      Object.keys(localStorage).forEach(key => {
        if (key.includes('sb-')) {
          localStorage.removeItem(key);
        }
      });
    }
  };

  useEffect(() => {
    let mounted = true;
    
    // Set timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (mounted && isLoading) {
        console.warn('Auth initialization timeout - forcing load completion');
        setIsLoading(false);
      }
    }, 10000); // 10 second timeout
    
    setInitTimeout(timeoutId);
    
    const initializeAuth = async () => {
      try {
        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (error) {
          console.error('Session retrieval error:', error);
          // Clear any potentially corrupted auth storage
          clearAuthStorage();
          if (mounted) setIsLoading(false);
          return;
        }
        
        if (mounted) {
          setSession(session);
          const userData = getUserFromSession(session);
          setUser(userData);
          // Set loading to false immediately after setting session
          setIsLoading(false);
        }
        
        // Ensure profile exists for authenticated users (non-blocking)
        if (session && mounted) {
          // Don't await this - let it run in background
          ensureUserProfile(session).catch(profileError => {
            console.error('Profile creation error:', profileError);
          });
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        // Clear any potentially corrupted auth storage
        clearAuthStorage();
      } finally {
        // Timeout will handle cleanup
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        setSession(session);
        setUser(getUserFromSession(session));
        
        // Ensure profile exists on sign in (non-blocking)
        if (event === 'SIGNED_IN' && session) {
          // Try to get role from localStorage first (set before OAuth redirect)
          // Then fall back to URL params
          const roleFromStorage = localStorage.getItem('oauth_signup_role') as UserRole | null;
          const urlParams = new URLSearchParams(window.location.search);
          const roleFromUrl = urlParams.get('role') as UserRole | null;
          const roleForProfile = roleFromStorage || roleFromUrl;
          
          // Clear the stored role after reading it
          if (roleFromStorage) {
            localStorage.removeItem('oauth_signup_role');
          }
          
          // Ensure profile exists with the role from storage/URL (for new OAuth signups)
          ensureUserProfile(session, roleForProfile || undefined).then(async () => {
            if (!mounted) return;
            
            // After ensuring profile, fetch the actual role from database
            if (session?.user) {
              try {
                const { data: profile } = await supabase
                  .from('users')
                  .select('role')
                  .eq('id', session.user.id)
                  .single();
                
                if (profile?.role && mounted) {
                  // Update user state with role from database
                  const updatedUser = getUserFromSession(session, profile.role as UserRole);
                  if (updatedUser) {
                    setUser(updatedUser);
                  }
                }
              } catch (error) {
                console.error('Error fetching user role from DB:', error);
              }
            }
          }).catch(error => {
            console.error('Profile creation error on sign in:', error);
          });
        }
        
        // Handle token refresh automatically
        if (event === 'TOKEN_REFRESHED' && session) {
          // Session refreshed
        }
        
        // Handle sign out
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setSession(null);
          // Also clear any cached auth data in localStorage
          if (typeof window !== 'undefined') {
            Object.keys(localStorage).forEach(key => {
              if (key.includes('sb-')) {
                localStorage.removeItem(key);
              }
            });
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
      // Clear timeout on unmount
      if (initTimeout) {
        clearTimeout(initTimeout);
        setInitTimeout(null);
      }
    };
  }, []);

  // Periodic session refresh (every 15 minutes)
  useEffect(() => {
    if (!session) return;
    
    const interval = setInterval(async () => {
      if (session.expires_at && Date.now() >= (session.expires_at * 1000 - 5 * 60 * 1000)) {
        // Refresh if token expires in less than 5 minutes
        const newSession = await refreshCurrentSession();
        if (newSession) {
          setSession(newSession);
          setUser(getUserFromSession(newSession));
        }
      }
    }, 15 * 60 * 1000); // Check every 15 minutes
    
    return () => clearInterval(interval);
  }, [session]);

  const setUserRole = useCallback(async (role: UserRole) => {
    if (user) {
      setUser({ ...user, role });
    }
    // Also update the database profile role
    if (session?.user) {
      try {
        const { error } = await supabase
          .from('users')
          .update({ role })
          .eq('id', session.user.id);
        
        if (error) {
          console.error('Role update error:', error);
        } else {
          // Role updated
        }
      } catch (error) {
        console.error('Role update error:', error);
      }
    }
  }, [user, session]);

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new Error(error.message);
      }

      // Ensure profile exists after login
      if (data.session) {
        await ensureUserProfile(data.session);
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const signup = async (name: string, email: string, password: string, role: UserRole) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            role: role || 'student',
          },
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      // Create profile after signup
      if (data.session) {
        await ensureUserProfile(data.session, role);
      }
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  const loginWithGoogle = async (role?: UserRole) => {
    try {
      // Store role in localStorage before OAuth redirect so we can retrieve it after callback
      // This is more reliable than URL params which may get stripped by Supabase
      if (role) {
        localStorage.setItem('oauth_signup_role', role);
      } else {
        localStorage.removeItem('oauth_signup_role');
      }
      
      // Include role in redirect URL as backup
      const redirectUrl = role 
        ? `${window.location.origin}/auth/callback?role=${role}`
        : `${window.location.origin}/auth/callback`;
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        throw new Error(error.message);
      }
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    }
  };

  const logout = async (redirectTo: string = '/') => {
    try {
      const { error } = await supabase.auth.signOut({
        scope: 'global' // This ensures all sessions are invalidated globally
      });
      if (error) {
        console.error('Sign out error:', error);
      }
      setUser(null);
      setSession(null);
      // Clear any cached data
      if (typeof window !== 'undefined') {
        // Clear localStorage items that might contain auth data
        Object.keys(localStorage).forEach(key => {
          if (key.includes('sb-')) {
            localStorage.removeItem(key);
          }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Clear state even if API call fails
      setUser(null);
      setSession(null);
      // Clear any cached data
      if (typeof window !== 'undefined') {
        // Clear localStorage items that might contain auth data
        Object.keys(localStorage).forEach(key => {
          if (key.includes('sb-')) {
            localStorage.removeItem(key);
          }
        });
      }
    }
  };

  const logoutWithRedirect = async (navigate: (path: string) => void, redirectTo: string = '/') => {
    try {
      const { error } = await supabase.auth.signOut({
        scope: 'global' // This ensures all sessions are invalidated globally
      });
      if (error) {
        console.error('Sign out error:', error);
      }
      setUser(null);
      setSession(null);
      // Clear any cached data
      if (typeof window !== 'undefined') {
        // Clear localStorage items that might contain auth data
        Object.keys(localStorage).forEach(key => {
          if (key.includes('sb-')) {
            localStorage.removeItem(key);
          }
        });
      }
      // Navigate to specified path after logout
      navigate(redirectTo);
    } catch (error) {
      console.error('Logout error:', error);
      // Clear state even if API call fails
      setUser(null);
      setSession(null);
      // Clear any cached data
      if (typeof window !== 'undefined') {
        // Clear localStorage items that might contain auth data
        Object.keys(localStorage).forEach(key => {
          if (key.includes('sb-')) {
            localStorage.removeItem(key);
          }
        });
      }
      // Navigate to specified path after logout
      navigate(redirectTo);
    }
  };

  const refreshSession = useCallback(async () => {
    if (!session) return;
    
    try {
      const newSession = await refreshCurrentSession();
      if (newSession) {
        setSession(newSession);
        setUser(getUserFromSession(newSession));
      }
    } catch (error) {
      console.error('Manual session refresh failed:', error);
    }
  }, [session]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAuthenticated: !!session,
        isLoading,
        login,
        signup,
        loginWithGoogle,
        logout,
        logoutWithRedirect,
        setUserRole,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
