/**
 * Firebase Database Cleanup Script
 * 
 * This script helps identify and potentially clean unused collections.
 * 
 * UNUSED COLLECTIONS IDENTIFIED:
 * - announcements (replaced by notification_campaigns with type "announcement")
 * - app_config (no configuration system implemented)
 * - chats (app uses "chatMessages" instead)
 * - messages (app uses "chatMessages" instead) 
 * - waste_bookings (app uses "bookings" instead)
 * 
 * MANUAL CLEANUP REQUIRED:
 * These collections need to be deleted manually through Firebase Console
 * because they are not referenced in the codebase.
 */

import { db } from './client/src/lib/firebase.js';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

const UNUSED_COLLECTIONS = [
  'announcements',
  'app_config', 
  'chats',
  'messages',
  'waste_bookings'
];

async function checkUnusedCollections() {
  console.log('🔍 Checking unused collections...\n');
  
  for (const collectionName of UNUSED_COLLECTIONS) {
    try {
      const snapshot = await getDocs(collection(db, collectionName));
      const docCount = snapshot.size;
      
      console.log(`📊 Collection: ${collectionName}`);
      console.log(`   Documents: ${docCount}`);
      
      if (docCount === 0) {
        console.log(`   ✅ Empty - Safe to ignore`);
      } else {
        console.log(`   ⚠️  Contains ${docCount} documents - Manual review recommended`);
      }
      console.log('');
      
    } catch (error) {
      console.log(`📊 Collection: ${collectionName}`);
      console.log(`   ❌ Does not exist or access denied`);
      console.log('');
    }
  }
}

async function deleteUnusedCollections() {
  console.log('🗑️  Starting cleanup of unused collections...\n');
  
  for (const collectionName of UNUSED_COLLECTIONS) {
    try {
      const snapshot = await getDocs(collection(db, collectionName));
      
      if (snapshot.empty) {
        console.log(`✅ ${collectionName}: Already empty`);
        continue;
      }
      
      console.log(`🗑️  Deleting ${snapshot.size} documents from ${collectionName}...`);
      
      // Delete all documents in the collection
      const batch = [];
      snapshot.forEach((docSnapshot) => {
        batch.push(deleteDoc(doc(db, collectionName, docSnapshot.id)));
      });
      
      await Promise.all(batch);
      console.log(`✅ ${collectionName}: Deleted ${snapshot.size} documents`);
      
    } catch (error) {
      console.error(`❌ Error cleaning ${collectionName}:`, error.message);
    }
  }
  
  console.log('\n🎉 Cleanup completed!');
  console.log('\n📝 Note: Empty collections will still appear in Firebase Console');
  console.log('   but they won\'t affect your app performance or billing.');
}

// Export functions for use
export { checkUnusedCollections, deleteUnusedCollections };

// If running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🧹 KolekKita Database Cleanup Utility\n');
  console.log('Choose an option:');
  console.log('1. Check unused collections (safe)');
  console.log('2. Delete unused collections (destructive)\n');
  
  const option = process.argv[2];
  
  if (option === 'check' || option === '1') {
    checkUnusedCollections();
  } else if (option === 'delete' || option === '2') {
    console.log('⚠️  WARNING: This will permanently delete data!');
    console.log('   Make sure you have backups if needed.\n');
    deleteUnusedCollections();
  } else {
    console.log('Usage:');
    console.log('  node cleanup-unused-collections.js check');
    console.log('  node cleanup-unused-collections.js delete');
  }
}