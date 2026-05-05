import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser 
} from "firebase/auth";
import { doc, getDocFromServer, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { User, UserRole } from "@/types";

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name: string, role: UserRole) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user profile from Firestore
  const fetchUserProfile = async (uid: string): Promise<User | null> => {
    try {
      const userDoc = await getDocFromServer(doc(db, "userWdboard", uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        return {
          id: uid,
          email: data.email,
          name: data.name,
          role: data.role as UserRole,
          lastLogin: data.lastLogin?.toDate() || new Date(),
          avatar: data.avatar,
        };
      }
      return null;
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return null;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      setFirebaseUser(fbUser);
      
      if (fbUser) {
        // Only fetch profile if we don't already have it (avoids duplicate fetch after login)
        setUser(currentUser => {
          if (currentUser && currentUser.id === fbUser.uid) {
            setIsLoading(false);
            return currentUser;
          }
          // Defer Firestore call to avoid deadlock
          setTimeout(async () => {
            const profile = await fetchUserProfile(fbUser.uid);
            setUser(profile);
            setIsLoading(false);
          }, 0);
          return currentUser;
        });
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      let profile = await fetchUserProfile(userCredential.user.uid);
      
      if (!profile) {
        // Auto-create userWdboard document if it doesn't exist
        const newProfile = {
          email: userCredential.user.email || email,
          name: userCredential.user.displayName || email.split("@")[0],
          role: "staff" as UserRole,
          avatarUrl: "",
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
        };
        await setDoc(doc(db, "userWdboard", userCredential.user.uid), newProfile);
        profile = {
          id: userCredential.user.uid,
          email: newProfile.email,
          name: newProfile.name,
          role: newProfile.role,
          lastLogin: new Date(),
        };
      } else {
        // Update last login in background
        setDoc(doc(db, "userWdboard", userCredential.user.uid), {
          lastLogin: serverTimestamp()
        }, { merge: true });
      }

      setUser(profile);
      return { success: true };
    } catch (error: any) {
      console.error("Login error:", error);
      let errorMessage = "Login failed. Please try again.";
      
      if (error.code === "auth/user-not-found") {
        errorMessage = "No account found with this email.";
      } else if (error.code === "auth/wrong-password") {
        errorMessage = "Incorrect password.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Invalid email address.";
      } else if (error.code === "auth/too-many-requests") {
        errorMessage = "Too many failed attempts. Please try again later.";
      } else if (error.code === "auth/invalid-credential") {
        errorMessage = "Invalid email or password.";
      }
      
      return { success: false, error: errorMessage };
    }
  };

  const register = async (
    email: string, 
    password: string, 
    name: string, 
    role: UserRole
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create user profile in Firestore
      await setDoc(doc(db, "userWdboard", userCredential.user.uid), {
        email,
        name,
        role,
        avatarUrl: "",
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
      });

      const profile: User = {
        id: userCredential.user.uid,
        email,
        name,
        role,
        lastLogin: new Date(),
      };

      setUser(profile);
      return { success: true };
    } catch (error: any) {
      console.error("Registration error:", error);
      let errorMessage = "Registration failed. Please try again.";
      
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "An account with this email already exists.";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password must be at least 6 characters.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Invalid email address.";
      }
      
      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        login,
        register,
        logout,
        isAuthenticated: !!user,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
