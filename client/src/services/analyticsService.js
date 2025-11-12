import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const analyticsService = {
  // Get monthly collection performance
  async getMonthlyCollectionData(year = new Date().getFullYear()) {
    try {
      const bookingsRef = collection(db, 'bookings');
      const snapshot = await getDocs(bookingsRef);
      const monthlyData = Array(12).fill(0);

      console.log('📊 Fetching monthly data for', year, '- Total bookings:', snapshot.size);

      snapshot.forEach(bookingDoc => {
        const data = bookingDoc.data();
        
        // Use createdAt as primary date source
        let bookingDate = null;
        if (data.createdAt?.toDate) {
          bookingDate = data.createdAt.toDate();
        } else if (data.createdAt) {
          bookingDate = new Date(data.createdAt);
        } else if (data.collectedAt?.toDate) {
          bookingDate = data.collectedAt.toDate();
        } else if (data.collectedAt) {
          bookingDate = new Date(data.collectedAt);
        }
        
        if (bookingDate && !isNaN(bookingDate.getTime()) && bookingDate.getFullYear() === year) {
          const month = bookingDate.getMonth();
          const weight = parseFloat(data.estimatedWeight) || 0;
          if (weight > 0) {
            monthlyData[month] += weight;
            console.log(`  ✓ Added ${weight}kg to ${month + 1}/${year}`);
          }
        }
      });

      console.log('📈 Monthly totals:', monthlyData);
      return monthlyData;
    } catch (error) {
      console.error('Error fetching monthly collection data:', error);
      return Array(12).fill(0);
    }
  },

  // Get material distribution
  async getMaterialDistribution() {
    try {
      const bookingsRef = collection(db, 'bookings');
      const snapshot = await getDocs(bookingsRef);

      const materials = {};

      console.log('🔍 Analyzing material distribution - Total bookings:', snapshot.size);

      snapshot.forEach(bookingDoc => {
        const data = bookingDoc.data();
        
        // Check for junkType field (single material type)
        if (data.junkType) {
          const weight = parseFloat(data.estimatedWeight) || 0;
          if (weight > 0) {
            const category = data.junkType.charAt(0).toUpperCase() + data.junkType.slice(1);
            materials[category] = (materials[category] || 0) + weight;
            console.log(`  ✓ ${category}: +${weight}kg`);
          }
        }
        
        // Also check wasteTypes array for more detailed breakdown
        const wasteTypes = data.wasteTypes || [];
        wasteTypes.forEach(waste => {
          const category = waste.category || waste.type || 'Other';
          const weight = parseFloat(waste.estimatedWeight || waste.weight) || 0;
          if (weight > 0) {
            materials[category] = (materials[category] || 0) + weight;
            console.log(`  ✓ ${category}: +${weight}kg (from wasteTypes)`);
          }
        });
      });

      console.log('📦 Material breakdown:', materials);
      return materials;
    } catch (error) {
      console.error('Error fetching material distribution:', error);
      return {};
    }
  },

  // Get municipality activity analysis
  async getMunicipalityActivity() {
    try {
      // First, get the list of all municipalities from settings
      const settingsRef = doc(db, 'settings', 'municipalities');
      const settingsDoc = await getDoc(settingsRef);
      const allMunicipalities = settingsDoc.exists() ? settingsDoc.data().list || [] : [];

      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);

      const municipalityStats = {};

      // Initialize all municipalities with zero values
      allMunicipalities.forEach(municipality => {
        municipalityStats[municipality] = {
          users: 0,
          residents: 0,
          collectors: 0,
          junkshops: 0
        };
      });

      console.log('👥 Analyzing municipality activity - Total users:', snapshot.size);
      console.log('📍 Total municipalities to track:', allMunicipalities.length);

      snapshot.forEach(userDoc => {
        const data = userDoc.data();
        const municipality = data.municipality || data.city;
        const role = data.role;

        // Log user data for debugging
        console.log(`  User ${userDoc.id}:`, {
          municipality,
          role,
          hasMunicipality: !!municipality
        });

        if (municipality && role !== 'admin' && role !== 'main_admin') {
          // Initialize municipality if not in our list (edge case)
          if (!municipalityStats[municipality]) {
            municipalityStats[municipality] = {
              users: 0,
              residents: 0,
              collectors: 0,
              junkshops: 0
            };
          }
          
          municipalityStats[municipality].users += 1;
          
          if (role === 'resident' || role === 'customer') {
            municipalityStats[municipality].residents += 1;
          }
          if (role === 'collector') {
            municipalityStats[municipality].collectors += 1;
          }
          if (role === 'junkshop' || role === 'junk_shop_owner') {
            municipalityStats[municipality].junkshops += 1;
          }

          console.log(`    ✓ Added to ${municipality}: ${role}`);
        } else if (!municipality && role !== 'admin' && role !== 'main_admin') {
          console.log(`    ⚠️ User ${userDoc.id} has no municipality`);
        }
      });

      // Sort alphabetically by municipality name
      const result = Object.entries(municipalityStats)
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => a.name.localeCompare(b.name));

      console.log('📊 Municipality activity summary:', result);
      return result;
    } catch (error) {
      console.error('Error fetching municipality activity:', error);
      return [];
    }
  },

  // Get popular materials by municipality
  async getPopularMaterialsByMunicipality() {
    try {
      // First, get the list of all municipalities from settings
      const settingsRef = doc(db, 'settings', 'municipalities');
      const settingsDoc = await getDoc(settingsRef);
      const allMunicipalities = settingsDoc.exists() ? settingsDoc.data().list || [] : [];

      const bookingsRef = collection(db, 'bookings');
      const snapshot = await getDocs(bookingsRef);

      const municipalityMaterials = {};

      // Initialize all municipalities with empty data
      allMunicipalities.forEach(municipality => {
        municipalityMaterials[municipality] = {};
      });

      console.log('🏙️ Analyzing popular materials by municipality - Total bookings:', snapshot.size);
      console.log('📍 Total municipalities to track:', allMunicipalities.length);

      snapshot.forEach(bookingDoc => {
        const bookingData = bookingDoc.data();
        
        // Get municipality directly from booking document
        const municipality = bookingData.municipality || bookingData.city;

        if (!municipality) {
          console.log('  ⚠️ Skipping booking without municipality:', bookingDoc.id);
          return;
        }

        // Initialize municipality if not in our list (edge case)
        if (!municipalityMaterials[municipality]) {
          municipalityMaterials[municipality] = {};
        }

        // Check for junkType field
        if (bookingData.junkType) {
          const category = bookingData.junkType.charAt(0).toUpperCase() + bookingData.junkType.slice(1);
          const weight = parseFloat(bookingData.estimatedWeight) || 0;
          if (weight > 0) {
            municipalityMaterials[municipality][category] = 
              (municipalityMaterials[municipality][category] || 0) + weight;
            console.log(`  ✓ ${municipality}: ${category} +${weight}kg`);
          }
        }

        // Also check wasteTypes array
        const wasteTypes = bookingData.wasteTypes || [];
        wasteTypes.forEach(waste => {
          const category = waste.category || waste.type || 'Other';
          const weight = parseFloat(waste.estimatedWeight || waste.weight) || 0;
          if (weight > 0) {
            municipalityMaterials[municipality][category] = 
              (municipalityMaterials[municipality][category] || 0) + weight;
            console.log(`  ✓ ${municipality}: ${category} +${weight}kg (from wasteTypes)`);
          }
        });
      });

      // Find most popular material for each municipality
      const result = Object.entries(municipalityMaterials).map(([municipality, materials]) => {
        const sortedMaterials = Object.entries(materials)
          .sort((a, b) => b[1] - a[1]);
        
        const totalWeight = Object.values(materials).reduce((sum, w) => sum + w, 0);
        
        return {
          municipality,
          topMaterial: sortedMaterials[0]?.[0] || 'No data',
          weight: sortedMaterials[0]?.[1] || 0,
          totalWeight: totalWeight
        };
      });

      // Sort: municipalities with data first (by total weight), then empty ones alphabetically
      const sortedResult = result.sort((a, b) => {
        // If both have data, sort by total weight descending
        if (a.totalWeight > 0 && b.totalWeight > 0) return b.totalWeight - a.totalWeight;
        // If only one has data, put it first
        if (a.totalWeight > 0) return -1;
        if (b.totalWeight > 0) return 1;
        // If neither has data, sort alphabetically
        return a.municipality.localeCompare(b.municipality);
      });

      console.log('🏆 Popular materials by municipality:', sortedResult);
      return sortedResult;
    } catch (error) {
      console.error('Error fetching popular materials by municipality:', error);
      return [];
    }
  },

  // Get total stats
  async getTotalStats() {
    try {
      const [users, bookings] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'bookings'))
      ]);

      let totalWeight = 0;
      let completedCount = 0;
      
      bookings.forEach(bookingDoc => {
        const data = bookingDoc.data();
        const weight = parseFloat(data.estimatedWeight) || 0;
        totalWeight += weight;
        
        if (data.status === 'completed') {
          completedCount++;
        }
      });

      console.log('📊 Total stats:', {
        users: users.size,
        bookings: bookings.size,
        completed: completedCount,
        weight: totalWeight
      });

      return {
        totalUsers: users.size,
        totalBookings: bookings.size,
        completedBookings: completedCount,
        totalWeight: totalWeight.toFixed(2)
      };
    } catch (error) {
      console.error('Error fetching total stats:', error);
      return {
        totalUsers: 0,
        totalBookings: 0,
        completedBookings: 0,
        totalWeight: 0
      };
    }
  }
};

export default analyticsService;
