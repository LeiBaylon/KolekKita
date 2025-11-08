import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, fetchSignInMethodsForEmail } from "firebase/auth";
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Firebase config for secondary auth instance
const firebaseConfig = {
  apiKey: "AIzaSyDNpBEwRpJ4qHd-WuW8_4iA3vGgT2NEdjg",
  authDomain: "kolekkita.firebaseapp.com",
  projectId: "kolekkita",
  storageBucket: "kolekkita.firebasestorage.app",
  messagingSenderId: "606427939452",
  appId: "1:606427939452:web:25f650d0a2a86403367ff9",
  measurementId: "G-3EQML2DNQ5"
};

// Get or create secondary Firebase app instance
let secondaryApp;
try {
  // Check if secondary app already exists
  secondaryApp = getApps().find(app => app.name === "Secondary");
  if (!secondaryApp) {
    secondaryApp = initializeApp(firebaseConfig, "Secondary");
  }
} catch (error) {
  console.error("Error initializing secondary app:", error);
  secondaryApp = initializeApp(firebaseConfig, "Secondary");
}

const secondaryAuth = getAuth(secondaryApp);

/**
 * Check if an email already exists in Firebase Auth
 */
export async function checkEmailExists(email) {
  try {
    const methods = await fetchSignInMethodsForEmail(secondaryAuth, email);
    return methods.length > 0;
  } catch (error) {
    console.error("Error checking email:", error);
    return false;
  }
}

export async function createAdminWithoutSignIn(email, password, name, role = "admin") {
  try {
    console.log("🔄 Creating admin account:", { email, name, role });
    
    // Check if email already exists
    const emailExists = await checkEmailExists(email);
    if (emailExists) {
      const error = new Error("This email is already registered. Please use a different email address.");
      error.code = "auth/email-already-in-use";
      throw error;
    }
    
    const userCredential = await createUserWithEmailAndPassword(
      secondaryAuth,
      email,
      password
    );
    
    const userId = userCredential.user.uid;
    console.log("✅ User created in Auth:", userId);
    
    const userData = {
      id: userId,
      email,
      name,
      role,
      profilePhoto: null,
      phone: null,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    console.log("💾 Saving user to Firestore:", userData);
    await setDoc(doc(db, "users", userId), userData);
    console.log("✅ User saved to Firestore");
    
    await secondaryAuth.signOut();
    console.log("✅ Secondary auth signed out");
    
    return {
      success: true,
      userId,
      email,
      name,
      role
    };
  } catch (error) {
    console.error("❌ Error creating admin:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    try {
      await secondaryAuth.signOut();
    } catch (signOutError) {
      console.error("Error signing out:", signOutError);
    }
    throw error;
  }
}

export async function setupMainAdminWithoutSignIn() {
  const mainAdminEmail = "admin@kolekkita.com";
  const mainAdminPassword = "KolekKita2025!Admin";
  
  try {
    const userCredential = await createUserWithEmailAndPassword(
      secondaryAuth,
      mainAdminEmail,
      mainAdminPassword
    );
    
    const userId = userCredential.user.uid;
    
    await setDoc(doc(db, "users", userId), {
      email: mainAdminEmail,
      name: "Main Administrator",
      role: "main_admin",
      isMainAdmin: true,
      profilePhoto: null,
      phone: null,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      canBeDeleted: false,
    });
    
    await secondaryAuth.signOut();
    
    return {
      success: true,
      credentials: {
        email: mainAdminEmail,
        password: mainAdminPassword,
        uid: userId
      }
    };
  } catch (error) {
    if (error.code === "auth/email-already-in-use") {
      return {
        success: false,
        error: "Main admin already exists"
      };
    }
    
    try {
      await secondaryAuth.signOut();
    } catch (signOutError) {
      console.error("Error signing out:", signOutError);
    }
    
    return {
      success: false,
      error: error.message
    };
  }
}
