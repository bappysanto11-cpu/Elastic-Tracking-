import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInAnonymously,
  signOut, 
  updateProfile,
  onAuthStateChanged,
  linkWithPopup,
  unlink,
  AuthProvider
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, githubProvider, db } from '../utils/firebase';

export interface UserProfileData {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  providerIds: string[];
  isAnonymous: boolean;
  createdAt?: any;
  lastLoginAt?: any;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfileData | null;
  loading: boolean;
  error: string | null;
  clearError: () => void;
  loginWithGoogle: () => Promise<User | null>;
  loginWithGithub: () => Promise<User | null>;
  loginWithEmail: (email: string, pass: string) => Promise<User | null>;
  signupWithEmail: (email: string, pass: string, name?: string) => Promise<User | null>;
  loginAsGuest: () => Promise<User | null>;
  connectProvider: (providerName: 'google' | 'github') => Promise<boolean>;
  disconnectProvider: (providerId: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProviderComponent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Sync user profile to Firestore
  const syncUserProfile = async (currentUser: User) => {
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const providerIds = currentUser.providerData.map(p => p.providerId);
      
      const profileData: UserProfileData = {
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName || (currentUser.isAnonymous ? 'Guest User' : 'Packing Specialist'),
        photoURL: currentUser.photoURL,
        providerIds,
        isAnonymous: currentUser.isAnonymous,
      };

      // Save/Update in Firestore
      await setDoc(userRef, {
        ...profileData,
        lastLoginAt: serverTimestamp(),
      }, { merge: true });

      setUserProfile(profileData);
    } catch (err: any) {
      console.warn('Could not sync user profile to Firestore (offline or rule check):', err?.message);
      // Fallback local profile
      setUserProfile({
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName || (currentUser.isAnonymous ? 'Guest User' : 'Packing Specialist'),
        photoURL: currentUser.photoURL,
        providerIds: currentUser.providerData.map(p => p.providerId),
        isAnonymous: currentUser.isAnonymous,
      });
    }
  };

  useEffect(() => {
    let isMounted = true;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!isMounted) return;

      if (!currentUser) {
        // Zero-Trust: Auto-authenticate session anonymously so all Firestore operations carry cryptographic auth tokens
        try {
          const guestResult = await signInAnonymously(auth);
          if (isMounted) {
            setUser(guestResult.user);
            await syncUserProfile(guestResult.user);
            setLoading(false);
          }
          return;
        } catch (anonErr: any) {
          console.warn('Anonymous zero-trust auth fallback notice:', anonErr?.message);
        }
      }

      setUser(currentUser);
      if (currentUser) {
        await syncUserProfile(currentUser);
      } else {
        setUserProfile(null);
      }
      if (isMounted) {
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const clearError = () => setError(null);

  const loginWithGoogle = async (): Promise<User | null> => {
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      setError(err.message || 'Google sign in failed');
      return null;
    }
  };

  const loginWithGithub = async (): Promise<User | null> => {
    setError(null);
    try {
      const result = await signInWithPopup(auth, githubProvider);
      return result.user;
    } catch (err: any) {
      console.error('GitHub Sign In Error:', err);
      setError(err.message || 'GitHub sign in failed');
      return null;
    }
  };

  const loginWithEmail = async (email: string, pass: string): Promise<User | null> => {
    setError(null);
    try {
      const result = await signInWithEmailAndPassword(auth, email, pass);
      return result.user;
    } catch (err: any) {
      console.error('Email Login Error:', err);
      setError(err.message || 'Invalid email or password');
      return null;
    }
  };

  const signupWithEmail = async (email: string, pass: string, name?: string): Promise<User | null> => {
    setError(null);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, pass);
      if (name && result.user) {
        await updateProfile(result.user, { displayName: name });
      }
      return result.user;
    } catch (err: any) {
      console.error('Email Signup Error:', err);
      setError(err.message || 'Account registration failed');
      return null;
    }
  };

  const loginAsGuest = async (): Promise<User | null> => {
    setError(null);
    try {
      const result = await signInAnonymously(auth);
      return result.user;
    } catch (err: any) {
      console.error('Guest Sign In Error:', err);
      setError(err.message || 'Guest sign in failed');
      return null;
    }
  };

  const connectProvider = async (providerName: 'google' | 'github'): Promise<boolean> => {
    if (!auth.currentUser) return false;
    setError(null);
    try {
      let provider: AuthProvider = providerName === 'google' ? googleProvider : githubProvider;
      await linkWithPopup(auth.currentUser, provider);
      await syncUserProfile(auth.currentUser);
      return true;
    } catch (err: any) {
      console.error(`Connect ${providerName} Error:`, err);
      setError(err.message || `Failed to connect ${providerName} account`);
      return false;
    }
  };

  const disconnectProvider = async (providerId: string): Promise<boolean> => {
    if (!auth.currentUser) return false;
    setError(null);
    try {
      await unlink(auth.currentUser, providerId);
      await syncUserProfile(auth.currentUser);
      return true;
    } catch (err: any) {
      console.error('Disconnect Provider Error:', err);
      setError(err.message || 'Failed to disconnect account provider');
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    setError(null);
    try {
      await signOut(auth);
    } catch (err: any) {
      console.error('Sign Out Error:', err);
      setError(err.message || 'Logout failed');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        error,
        clearError,
        loginWithGoogle,
        loginWithGithub,
        loginWithEmail,
        signupWithEmail,
        loginAsGuest,
        connectProvider,
        disconnectProvider,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
