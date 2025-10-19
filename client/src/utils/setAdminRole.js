// Temporary script to set user role to admin for testing
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase.js';

export const setUserAsAdmin = async (userId, userEmail = null, userName = null) => {
  try {
    console.log('🔧 Setting admin role for user:', userId);
    
    const userRef = doc(db, 'users', userId);
    const userData = {
      role: 'admin',
      email: userEmail || 'admin@kolekkita.com',
      name: userName || 'Admin User',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    await setDoc(userRef, userData, { merge: true });
    
    console.log('✅ User role set to admin successfully');
    console.log('📄 User data:', userData);
    return true;
  } catch (error) {
    console.error('❌ Failed to set user role:', error);
    throw error;
  }
};