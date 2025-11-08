import { createContext, useContext, useEffect, useState } from "react";
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { validatePassword } from "@/utils/passwordValidation";

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = { id: firebaseUser.uid, ...userDoc.data() };
            console.log("🔐 User logged in:", {
              email: userData.email,
              role: userData.role,
              isMainAdmin: userData.isMainAdmin,
              fullData: userData
            });
            setUser(userData);
          } else {
            // Create user document if it doesn't exist
            const newUser = {
              email: firebaseUser.email || "",
              name: firebaseUser.displayName || "User",
              role: "customer",
              profilePhoto: firebaseUser.photoURL || null,
              phone: firebaseUser.phoneNumber || null,
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            await setDoc(doc(db, "users", firebaseUser.uid), newUser);
            setUser({ id: firebaseUser.uid, ...newUser });
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        setUser(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    
    // Check if user exists in Firestore
    const userDoc = await getDoc(doc(db, "users", result.user.uid));
    if (!userDoc.exists()) {
      // Sign out the user immediately if they don't have an existing account
      await signOut(auth);
      throw new Error("No existing account found. Please contact an administrator to create an account.");
    }
    
    return result;
  };

  const logout = async () => {
    await signOut(auth);
  };

  const register = async (email, password, name, role) => {
    // Validate password strength
    const validation = validatePassword(password);
    if (!validation.isValid) {
      const errorMessage = validation.errors.join(". ");
      throw new Error(`Password does not meet requirements: ${errorMessage}`);
    }
    
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const newUser = {
      email,
      name,
      role,
      profilePhoto: null,
      phone: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await setDoc(doc(db, "users", userCredential.user.uid), newUser);
  };

  const switchRole = async (role) => {
    if (!firebaseUser) throw new Error("No user logged in");
    
    await setDoc(doc(db, "users", firebaseUser.uid), {
      role,
      updatedAt: new Date(),
    }, { merge: true });
    
    if (user) {
      setUser({ ...user, role });
    }
  };

  const value = {
    user,
    firebaseUser,
    loading,
    login,
    loginWithGoogle,
    logout,
    register,
    switchRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
