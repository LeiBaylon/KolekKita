import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, setDoc } from "firebase/firestore";

/**
 * Migrate existing admin users from 'users' collection to 'adminUsers' collection
 * Run this once to migrate existing data
 */
export async function migrateAdminsToCollection() {
  try {
    console.log("🔄 Starting migration of admin users...");
    
    // Query all users with admin or main_admin role
    const usersRef = collection(db, "users");
    const adminQuery = query(
      usersRef,
      where("role", "in", ["admin", "main_admin"])
    );
    
    const snapshot = await getDocs(adminQuery);
    console.log(`📊 Found ${snapshot.docs.length} admin users to migrate`);
    
    let migratedCount = 0;
    const errors = [];
    
    // Copy each admin user to adminUsers collection
    for (const userDoc of snapshot.docs) {
      try {
        const userData = userDoc.data();
        const userId = userDoc.id;
        
        // Copy to adminUsers collection
        await setDoc(doc(db, "adminUsers", userId), {
          ...userData,
          migratedAt: new Date(),
        });
        
        console.log(`✅ Migrated: ${userData.name} (${userData.email})`);
        migratedCount++;
      } catch (error) {
        console.error(`❌ Failed to migrate user ${userDoc.id}:`, error);
        errors.push({ userId: userDoc.id, error: error.message });
      }
    }
    
    console.log(`\n✅ Migration complete!`);
    console.log(`   Successfully migrated: ${migratedCount} admin users`);
    
    if (errors.length > 0) {
      console.log(`   Errors: ${errors.length}`);
      console.log("   Error details:", errors);
    }
    
    return {
      success: true,
      migratedCount,
      totalFound: snapshot.docs.length,
      errors
    };
    
  } catch (error) {
    console.error("❌ Migration failed:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Verify that all admin users are in the adminUsers collection
 */
export async function verifyAdminMigration() {
  try {
    console.log("🔍 Verifying admin migration...");
    
    // Get all users with admin role
    const usersSnapshot = await getDocs(
      query(collection(db, "users"), where("role", "in", ["admin", "main_admin"]))
    );
    
    // Get all from adminUsers collection
    const adminUsersSnapshot = await getDocs(collection(db, "adminUsers"));
    
    console.log(`📊 Users collection: ${usersSnapshot.docs.length} admins`);
    console.log(`📊 AdminUsers collection: ${adminUsersSnapshot.docs.length} admins`);
    
    const missingInAdminUsers = [];
    
    usersSnapshot.docs.forEach(userDoc => {
      const userData = userDoc.data();
      const existsInAdminUsers = adminUsersSnapshot.docs.some(
        adminDoc => adminDoc.id === userDoc.id
      );
      
      if (!existsInAdminUsers) {
        missingInAdminUsers.push({
          id: userDoc.id,
          name: userData.name,
          email: userData.email
        });
      }
    });
    
    if (missingInAdminUsers.length === 0) {
      console.log("✅ All admin users are in the adminUsers collection!");
      return { success: true, allMigrated: true };
    } else {
      console.log(`⚠️ ${missingInAdminUsers.length} admin users missing from adminUsers collection:`);
      console.log(missingInAdminUsers);
      return { 
        success: true, 
        allMigrated: false, 
        missing: missingInAdminUsers 
      };
    }
    
  } catch (error) {
    console.error("❌ Verification failed:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Make available in window for console access
if (typeof window !== 'undefined') {
  window.migrateAdmins = migrateAdminsToCollection;
  window.verifyAdminMigration = verifyAdminMigration;
  console.log("💡 Migration utilities loaded:");
  console.log("   - window.migrateAdmins() - Migrate admin users to adminUsers collection");
  console.log("   - window.verifyAdminMigration() - Verify migration completed");
}
