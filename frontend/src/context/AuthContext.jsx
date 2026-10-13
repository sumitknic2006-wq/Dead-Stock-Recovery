/**
 * StockSaathi AI — Merchant Authentication Context (Phase 11)
 *
 * Manages reactive merchant session state across the application,
 * supports session restoration on refresh, safe logout, and automatic
 * redirection when unauthenticated.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  loginMerchant,
  registerMerchant,
  logoutMerchant,
  getMerchantProfile,
} from '../services/authApi.js';
import {
  getAuthToken,
  setAuthToken,
  clearAuthToken,
  setOnUnauthorizedCallback,
} from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [merchant, setMerchant] = useState(null);
  const [token, setTokenState] = useState(() => getAuthToken());
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Restore authenticated session on initial mount
  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      const storedToken = getAuthToken();
      if (!storedToken) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        const res = await getMerchantProfile();
        if (isMounted && res?.success && res?.data) {
          setMerchant(res.data);
          setTokenState(storedToken);
        }
      } catch (err) {
        // Token expired or invalid
        if (isMounted) {
          clearAuthToken();
          setMerchant(null);
          setTokenState(null);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    restoreSession();

    // Hook 401 callback from apiRequest to cleanly handle session expiry
    setOnUnauthorizedCallback(() => {
      if (isMounted) {
        clearAuthToken();
        setMerchant(null);
        setTokenState(null);
        setAuthError('Your session has expired. Please log in again.');
      }
    });

    return () => {
      isMounted = false;
      setOnUnauthorizedCallback(null);
    };
  }, []);

  const login = useCallback(async ({ email, password }) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const res = await loginMerchant({ email, password });
      if (res?.success && res?.data) {
        setMerchant(res.data.merchant);
        setTokenState(res.data.token);
        return res.data;
      }
      throw new Error(res?.message || 'Login failed');
    } catch (err) {
      const msg = err.details?.error?.message || err.message || 'Login failed';
      setAuthError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async ({ email, password, name, businessName, storeCategory }) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const res = await registerMerchant({ email, password, name, businessName, storeCategory });
      if (res?.success && res?.data) {
        setMerchant(res.data.merchant);
        setTokenState(res.data.token);
        return res.data;
      }
      throw new Error(res?.message || 'Registration failed');
    } catch (err) {
      const msg = err.details?.error?.message || err.message || 'Registration failed';
      setAuthError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await logoutMerchant();
    } catch {
      // Ignore network errors on logout
    } finally {
      clearAuthToken();
      setMerchant(null);
      setTokenState(null);
      setAuthError(null);
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setAuthError(null);
  }, []);

  const value = {
    merchant,
    token,
    isAuthenticated: Boolean(merchant),
    isLoading,
    authError,
    login,
    register,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
