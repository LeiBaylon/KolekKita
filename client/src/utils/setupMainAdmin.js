import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs, limit } from "firebase/firestore";

/**
 * Check if a user is the main administrator
 * @param {string} userId - The user ID to check
 * @returns {Promise<boolean>} - True if user is main admin
 */
export async function isMainAdmin(userId) {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) {
      return false;
    }
    const userData = userDoc.data();
    return userData.isMainAdmin === true || userData.role === "main_admin";
  } catch (error) {
    console.error("Error checking main admin status:", error);
    return false;
  }
}

/**
 * Check if a user can be deleted (not the main admin)
 * @param {string} userId - The user ID to check
 * @returns {Promise<boolean>} - True if user can be deleted
 */
export async function canDeleteUser(userId) {
  try {
    const isMain = await isMainAdmin(userId);
    return !isMain;
  } catch (error) {
    console.error("Error checking if user can be deleted:", error);
    return false;
  }
}

/**
 * Set a user as the main administrator
 * @param {string} userId - The user ID to set as main admin
 * @param {string} email - The user's email
 * @param {string} name - The user's name
 * @returns {Promise<void>}
 */
export async function setMainAdmin(userId, email, name) {
  try {
    const userRef = doc(db, "users", userId);
    await setDoc(userRef, {
      id: userId,
      email: email,
      name: name,
      role: "main_admin",
      isMainAdmin: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
    
    console.log("✅ Main administrator set successfully");
  } catch (error) {
    console.error("Error setting main admin:", error);
    throw error;
  }
}

/**
 * Get the main administrator user
 * @returns {Promise<Object|null>} - The main admin user data or null
 */
export async function getMainAdmin() {
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("isMainAdmin", "==", true), limit(1));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }
    
    return snapshot.docs[0].data();
  } catch (error) {
    console.error("Error getting main admin:", error);
    return null;
  }
}
