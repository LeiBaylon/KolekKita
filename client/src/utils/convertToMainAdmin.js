import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";

/**
 * Convert an existing admin account to main admin
 * Use this if admin@kolekkita.com already exists but isn't the main admin
 */
export const convertToMainAdmin = async (email) => {
  try {
    // Find the user by email
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log("❌ No user found with email:", email);
      return {
        success: false,
        error: "User not found"
      };
    }
    
    // Get the first matching user
    const userDoc = querySnapshot.docs[0];
    const userId = userDoc.id;
    const userData = userDoc.data();
    
    console.log("Found user:", userId, userData);
    
    // Update to main admin
    await updateDoc(doc(db, "users", userId), {
      role: "main_admin",
      isMainAdmin: true,
      canBeDeleted: false,
      updatedAt: new Date()
    });
    
    console.log("✅ Successfully converted to main admin!");
    
    return {
      success: true,
      userId: userId,
      email: userData.email
    };
    
  } catch (error) {
    console.error("❌ Error converting to main admin:", error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Check if a user exists by email
 */
export const checkUserExists = async (email) => {
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return { exists: false };
    }
    
    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();
    
    return {
      exists: true,
      userId: userDoc.id,
      isMainAdmin: userData.isMainAdmin === true,
      role: userData.role,
      email: userData.email
    };
    
  } catch (error) {
    console.error("Error checking user:", error);
    return { exists: false, error: error.message };
  }
};
