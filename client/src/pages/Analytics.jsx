import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useFirestoreCollection } from "@/hooks/useFirestore";
import { useToast } from "@/hooks/use-toast";
import { orderBy } from "firebase/firestore";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, Users, Activity, ArrowUpIcon, Package, Recycle, Calendar, BarChart3, PieChart as PieChartIcon, TrendingDown, Star, X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Analytics() {
  const [dateRange, setDateRange] = useState("7days");
  const [timeView, setTimeView] = useState("monthly"); // daily, weekly, monthly, yearly
  const [selectedParticipationMunicipality, setSelectedParticipationMunicipality] = useState("all");
  const [isParticipationModalOpen, setIsParticipationModalOpen] = useState(false);
  const [selectedMaterialsMunicipality, setSelectedMaterialsMunicipality] = useState("");
  const [isMaterialsModalOpen, setIsMaterialsModalOpen] = useState(false);
  const { toast } = useToast();
  
  // Batangas municipalities list
  const batangasMunicipalities = [
    "Agoncillo", "Alitagtag", "Balayan", "Balete", "Batangas City", "Bauan", "Calaca", "Calatagan", 
    "Cuenca", "Ibaan", "Laurel", "Lemery", "Lian", "Lobo", "Mabini", "Malvar", 
    "Mataasnakahoy", "Nasugbu", "Padre Garcia", "Rosario", "San Jose", "San Juan", 
    "San Luis", "San Nicolas", "San Pascual", "Santa Teresita", "Taal", "Talisay", 
    "Taysan", "Tingloy", "Tuy"
  ];
  
  // Helper function to safely convert timestamps to Date objects
  const getValidDate = (timestamp) => {
    if (!timestamp) return new Date();
    
    // Handle Firebase Timestamp objects
    if (timestamp && typeof timestamp === 'object') {
      if (timestamp.seconds) {
        return new Date(timestamp.seconds * 1000);
      }
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        return timestamp.toDate();
      }
    }
    
    // Handle string timestamps
    if (typeof timestamp === 'string') {
      const date = new Date(timestamp);
      return isNaN(date.getTime()) ? new Date() : date;
    }
    
    // Handle Date objects
    if (timestamp instanceof Date) {
      return isNaN(timestamp.getTime()) ? new Date() : timestamp;
    }
    
    // Fallback to current date
    return new Date();
  };
  
  const { data: users, loading: usersLoading, error: usersError } = useFirestoreCollection("users", [orderBy("createdAt", "desc")]);
    const { data: bookings, loading: bookingsLoading, error: bookingsError } = useFirestoreCollection("bookings", [orderBy("createdAt", "desc")]);
  const { data: reviews, loading: reviewsLoading, error: reviewsError } = useFirestoreCollection("reviews", [orderBy("createdAt", "desc")]);
  const { data: verifications, loading: verificationsLoading, error: verificationsError } = useFirestoreCollection("verifications", [orderBy("submissionTimestamp", "desc")]);

  // Debug: Log bookings data to console
  useEffect(() => {
    if (bookings.length > 0) {
      console.log('📊 Analytics Debug - Bookings Data:', {
        totalBookings: bookings.length,
        bookingsWithWeight: bookings.filter(b => b.estimatedWeight && parseFloat(b.estimatedWeight) > 0).length,
        sampleBookings: bookings.slice(0, 3).map(b => ({
          id: b.id,
          estimatedWeight: b.estimatedWeight,
          status: b.status,
          createdAt: b.createdAt,
          municipality: b.municipality || b.pickupLocation?.municipality || b.address?.municipality
        }))
      });
    }
  }, [bookings]);

  // Check for loading state
  const isLoading = usersLoading || bookingsLoading || reviewsLoading || verificationsLoading;
  const hasError = usersError || bookingsError || reviewsError || verificationsError;
  
  // Early return for loading state
  if (isLoading) {
    return (
      <Layout title="Analytics">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }
  
  // Early return for error state
  if (hasError) {
    return (
      <Layout title="Analytics">
        <div className="text-center py-8 text-red-600">
          <p className="font-semibold">Error loading analytics data</p>
          <p className="text-sm">{usersError || bookingsError || reviewsError || verificationsError}</p>
        </div>
      </Layout>
    );
  }

  // Real platform statistics based on all data
  const completedBookings = bookings.filter(b => b.status === "completed");
  const pendingBookings = bookings.filter(b => b.status === "pending");
  const junkShopOwners = users.filter(u => u.role === "junk_shop_owner" || u.role === "junkshop");
  const collectors = users.filter(u => u.role === "collector");
  
  // Calculate total weight from actual estimatedWeight field in all bookings
  const totalWeight = bookings.reduce((sum, booking) => {
    const weight = parseFloat(booking.estimatedWeight) || 0;
    return sum + weight;
  }, 0);
  
  // Calculate average weight per booking
  const averageWeightPerBooking = bookings.length > 0 
    ? Math.round(totalWeight / bookings.length) 
    : 0;

  const analyticsStats = {
    totalUsers: users.length,
    pickupsCompleted: completedBookings.length,
    totalWeight: Math.round(totalWeight),
    junkShops: junkShopOwners.length,
    collectors: collectors.length,
    pendingVerifications: verifications.filter(v => v.status === 'pending' || !v.status).length
  };

  // 1. Municipality Performance Analytics - Most Recycled & Most Active Users
  const getMunicipalityPerformance = () => {
    const municipalityStats = {};
    
    // Initialize all municipalities
    batangasMunicipalities.forEach(municipality => {
      municipalityStats[municipality] = {
        totalUsers: 0,
        activeUsers: 0,
        totalRecycled: 0,
        completedBookings: 0
      };
    });

    // Calculate user statistics by municipality
    users.forEach(user => {
      const municipality = user.municipality;
      if (municipality && municipalityStats[municipality]) {
        municipalityStats[municipality].totalUsers++;
        
        // Active user: has created at least one booking in the last 30 days
        const userBookings = bookings.filter(b => b.customerId === user.id || b.userId === user.id);
        const recentBookings = userBookings.filter(b => {
          const bookingDate = getValidDate(b.createdAt);
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          return bookingDate > thirtyDaysAgo;
        });
        
        if (recentBookings.length > 0) {
          municipalityStats[municipality].activeUsers++;
        }
      }
    });

    // Calculate recycling statistics by municipality
    bookings.forEach(booking => {
      const municipality = booking.municipality || booking.pickupLocation?.municipality;
      if (municipality && municipalityStats[municipality] && booking.status === 'completed') {
        municipalityStats[municipality].completedBookings++;
        municipalityStats[municipality].totalRecycled += parseFloat(booking.estimatedWeight) || 0;
      }
    });

    // Find top performers
    const sortedByRecycled = Object.entries(municipalityStats)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.totalRecycled - a.totalRecycled);

    const sortedByActiveUsers = Object.entries(municipalityStats)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.activeUsers - a.activeUsers);

    return {
      mostRecycled: sortedByRecycled[0],
      mostActiveUsers: sortedByActiveUsers[0],
      allMunicipalities: sortedByRecycled
    };
  };

  // 2. Monthly Recyclables Collection by Municipality (kg/month)
  const getMonthlyRecyclablesByMunicipality = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    
    const monthlyData = {};
    
    // Initialize data for current year months (Jan to Nov/Dec)
    for (let month = 0; month < 12; month++) {
      const monthDate = new Date(currentYear, month, 1);
      const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
      const monthName = monthDate.toLocaleDateString('en-US', { month: 'short' });
      
      monthlyData[monthKey] = {
        month: monthName,
        municipalities: {},
        sortOrder: month  // 0 = Jan, 1 = Feb, ..., 11 = Dec
      };
      
      // Initialize all municipalities for this month
      batangasMunicipalities.forEach(municipality => {
        monthlyData[monthKey].municipalities[municipality] = 0;
      });
    }

    // Aggregate data from all bookings with estimatedWeight
    // Note: We now include all bookings (not just completed) to capture more data
    bookings.forEach(booking => {
      // Only process bookings with valid estimated weight
      const weight = parseFloat(booking.estimatedWeight) || 0;
      if (weight > 0) {
        const bookingDate = getValidDate(booking.createdAt);
        const bookingYear = bookingDate.getFullYear();
        
        // Only include bookings from the current year
        if (bookingYear === currentYear) {
          const monthKey = `${bookingYear}-${String(bookingDate.getMonth() + 1).padStart(2, '0')}`;
          const municipality = booking.municipality || booking.pickupLocation?.municipality || booking.address?.municipality;
          
          if (monthlyData[monthKey]) {
            if (municipality && monthlyData[monthKey].municipalities[municipality] !== undefined) {
              monthlyData[monthKey].municipalities[municipality] += weight;
            } else {
              // If municipality not found in list, still add to the month's total
              if (!monthlyData[monthKey].municipalities['Other']) {
                monthlyData[monthKey].municipalities['Other'] = 0;
              }
              monthlyData[monthKey].municipalities['Other'] += weight;
            }
          }
        }
      }
    });

    // Sort months chronologically using the sortOrder
    return Object.entries(monthlyData)
      .sort(([, valueA], [, valueB]) => valueA.sortOrder - valueB.sortOrder)
      .map(([key, value]) => {
        // Remove sortOrder from the final result
        const { sortOrder, ...cleanValue } = value;
        return cleanValue;
      });
  };

  // 3. Participation Rate by Municipality and Demographics
  const getParticipationRates = () => {
    const totalPopulation = users.length; // Assuming all app users represent the addressable population
    const participationByMunicipality = {};
    const participationByRole = {};

    // Calculate participation by municipality
    batangasMunicipalities.forEach(municipality => {
      const municipalityUsers = users.filter(u => u.municipality === municipality);
      const activeUsers = municipalityUsers.filter(user => {
        const userBookings = bookings.filter(b => b.customerId === user.id || b.userId === user.id);
        return userBookings.length > 0; // Has participated in at least one booking
      });

      participationByMunicipality[municipality] = {
        totalUsers: municipalityUsers.length,
        activeUsers: activeUsers.length,
        participationRate: municipalityUsers.length > 0 ? 
          Math.round((activeUsers.length / municipalityUsers.length) * 100) : 0
      };
    });

    // Calculate participation by role/demographic
    const roles = ['resident', 'collector', 'junkshop'];
    roles.forEach(role => {
      const roleUsers = users.filter(u => u.role === role);
      const activeRoleUsers = roleUsers.filter(user => {
        const userBookings = bookings.filter(b => b.customerId === user.id || b.userId === user.id);
        return userBookings.length > 0;
      });

      participationByRole[role] = {
        totalUsers: roleUsers.length,
        activeUsers: activeRoleUsers.length,
        participationRate: roleUsers.length > 0 ? 
          Math.round((activeRoleUsers.length / roleUsers.length) * 100) : 0
      };
    });

    return {
      byMunicipality: participationByMunicipality,
      byRole: participationByRole,
      overall: {
        totalUsers: totalPopulation,
        activeUsers: users.filter(user => {
          const userBookings = bookings.filter(b => b.customerId === user.id || b.userId === user.id);
          return userBookings.length > 0;
        }).length,
        participationRate: totalPopulation > 0 ? 
          Math.round((users.filter(user => {
            const userBookings = bookings.filter(b => b.customerId === user.id || b.userId === user.id);
            return userBookings.length > 0;
          }).length / totalPopulation) * 100) : 0
      }
    };
  };

  // Get participation rates for a specific municipality
  const getParticipationRatesByMunicipality = (targetMunicipality) => {
    if (targetMunicipality === "all") {
      return getParticipationRates();
    }

    // Filter users to only those from the selected municipality
    const municipalityUsers = users.filter(u => u.municipality === targetMunicipality);
    const participationByRole = {};

    // Calculate participation by role for the selected municipality only - ensure all roles are included
    const roles = ['resident', 'collector', 'junkshop'];
    roles.forEach(role => {
      const roleUsers = municipalityUsers.filter(u => u.role === role);
      const activeRoleUsers = roleUsers.filter(user => {
        const userBookings = bookings.filter(b => b.customerId === user.id || b.userId === user.id);
        return userBookings.length > 0;
      });

      participationByRole[role] = {
        totalUsers: roleUsers.length,
        activeUsers: activeRoleUsers.length,
        participationRate: roleUsers.length > 0 ? 
          Math.round((activeRoleUsers.length / roleUsers.length) * 100) : 0
      };
    });

    return {
      byMunicipality: getParticipationRates().byMunicipality, // Keep all municipalities for the list
      byRole: participationByRole, // Filtered by selected municipality
      overall: {
        totalUsers: municipalityUsers.length,
        activeUsers: municipalityUsers.filter(user => {
          const userBookings = bookings.filter(b => b.customerId === user.id || b.userId === user.id);
          return userBookings.length > 0;
        }).length,
        participationRate: municipalityUsers.length > 0 ? 
          Math.round((municipalityUsers.filter(user => {
            const userBookings = bookings.filter(b => b.customerId === user.id || b.userId === user.id);
            return userBookings.length > 0;
          }).length / municipalityUsers.length) * 100) : 0
      }
    };
  };

  // 4. Most Popular Material/Junk Type by Municipality
  const getMostPopularMaterialByMunicipality = () => {
    const municipalityMaterials = {};

    // Initialize for all municipalities
    batangasMunicipalities.forEach(municipality => {
      municipalityMaterials[municipality] = {
        materialCounts: {},
        totalBookings: 0,
        topMaterial: null,
        topMaterialCount: 0,
        topMaterialPercentage: 0
      };
    });

    // Count junk types by municipality from all bookings
    bookings.forEach(booking => {
      const municipality = booking.municipality || booking.pickupLocation?.municipality;
      let junkType = null;
      
      // Check if junkType field exists
      if (booking.junkType) {
        junkType = booking.junkType.toLowerCase();
      } 
      // Extract material from notes field if junkType doesn't exist
      else if (booking.notes) {
        const materialMatch = booking.notes.match(/Material:\s*([^.]+)/i);
        if (materialMatch) {
          junkType = materialMatch[1].trim().toLowerCase();
        }
      }

      if (municipality && junkType && municipalityMaterials[municipality]) {
        // Clean up the junk type (remove words like "& ", "and", etc.)
        const normalizedJunkType = junkType.replace(/\s*&\s*/g, ' ').replace(/\s+and\s+/g, ' ').split(' ')[0];
        
        if (!municipalityMaterials[municipality].materialCounts[normalizedJunkType]) {
          municipalityMaterials[municipality].materialCounts[normalizedJunkType] = 0;
        }
        
        municipalityMaterials[municipality].materialCounts[normalizedJunkType]++;
        municipalityMaterials[municipality].totalBookings++;
      }
    });

    // Find top material for each municipality
    Object.keys(municipalityMaterials).forEach(municipality => {
      const data = municipalityMaterials[municipality];
      
      if (data.totalBookings > 0) {
        const sortedMaterials = Object.entries(data.materialCounts)
          .sort(([,a], [,b]) => b - a);
        
        if (sortedMaterials.length > 0) {
          const [topMaterial, count] = sortedMaterials[0];
          data.topMaterial = topMaterial.charAt(0).toUpperCase() + topMaterial.slice(1);
          data.topMaterialCount = count;
          data.topMaterialPercentage = Math.round((count / data.totalBookings) * 100);
        }
      }
    });

    // Return all municipalities, sorted by total bookings (most active first)
    return Object.entries(municipalityMaterials)
      .sort(([,a], [,b]) => b.totalBookings - a.totalBookings)
      .map(([municipality, data]) => ({
        municipality,
        ...data,
        // Add fallback display values for municipalities with no data
        displayMaterial: data.topMaterial || 'No data',
        displayCount: data.topMaterialCount || 0,
        displayPercentage: data.topMaterialPercentage || 0
      }));
  };

  // Get detailed material breakdown for a specific municipality
  const getMaterialBreakdownForMunicipality = (municipalityName) => {
    // Define all possible material types - simplified to 5 main categories
    const allMaterialTypes = {
      'paper': 'Paper',
      'plastic': 'Plastic',
      'plastics': 'Plastic',
      'metal': 'Metal',
      'metals': 'Metal',
      'glass': 'Glass',
      'electronic': 'Electronic',
      'electronics': 'Electronic'
    };

    const materialData = {};
    let totalWeight = 0;

    // Initialize only the 5 main material types with 0 weight
    const mainCategories = ['paper', 'plastic', 'metal', 'glass', 'electronic'];
    mainCategories.forEach(material => {
      materialData[material] = { count: 0, weight: 0 };
    });

    // Calculate weight for all materials for this municipality
    bookings.forEach(booking => {
      const municipality = booking.municipality || booking.pickupLocation?.municipality;
      let junkType = null;
      
      // Check if junkType field exists
      if (booking.junkType) {
        junkType = booking.junkType.toLowerCase();
      } 
      // Extract material from notes field if junkType doesn't exist
      else if (booking.notes) {
        const materialMatch = booking.notes.match(/Material:\s*([^.]+)/i);
        if (materialMatch) {
          junkType = materialMatch[1].trim().toLowerCase();
        }
      }

      if (municipality === municipalityName && junkType) {
        const weight = parseFloat(booking.estimatedWeight) || 0;
        
        // Clean up the junk type (remove words like "& ", "and", etc.)
        const normalizedJunkType = junkType.replace(/\s*&\s*/g, ' ').replace(/\s+and\s+/g, ' ').split(' ')[0];
        
        // Map to main categories only
        let categoryKey = null;
        if (normalizedJunkType.includes('paper') || normalizedJunkType.includes('cardboard')) {
          categoryKey = 'paper';
        } else if (normalizedJunkType.includes('plastic') || normalizedJunkType.includes('bottle')) {
          categoryKey = 'plastic';
        } else if (normalizedJunkType.includes('metal') || normalizedJunkType.includes('aluminum') || 
                   normalizedJunkType.includes('steel') || normalizedJunkType.includes('copper') || 
                   normalizedJunkType.includes('can')) {
          categoryKey = 'metal';
        } else if (normalizedJunkType.includes('glass')) {
          categoryKey = 'glass';
        } else if (normalizedJunkType.includes('electronic')) {
          categoryKey = 'electronic';
        }
        
        if (categoryKey && materialData[categoryKey]) {
          materialData[categoryKey].count++;
          materialData[categoryKey].weight += weight;
          totalWeight += weight;
        }
      }
    });

    // Combine similar materials - now just maps to display names
    const combinedData = {};
    const displayNames = {
      'paper': 'Paper',
      'plastic': 'Plastic',
      'metal': 'Metal',
      'glass': 'Glass',
      'electronic': 'Electronic'
    };
    
    Object.entries(materialData).forEach(([material, data]) => {
      const displayName = displayNames[material];
      if (displayName) {
        combinedData[displayName] = { count: data.count, weight: data.weight };
      }
    });

    // Convert to array with weights and percentages - keep all 5 categories
    return ['Paper', 'Plastic', 'Metal', 'Glass', 'Electronic'].map(materialName => {
      const data = combinedData[materialName] || { count: 0, weight: 0 };
      return {
        material: materialName,
        count: data.count,
        weight: data.weight,
        percentage: totalWeight > 0 ? Math.round((data.weight / totalWeight) * 100) : 0
      };
    });
  };

  // Generate analytics data
  const municipalityPerformance = getMunicipalityPerformance();
  const monthlyRecyclables = getMonthlyRecyclablesByMunicipality();
  const participationRates = getParticipationRatesByMunicipality(selectedParticipationMunicipality);
  const popularMaterialsByMunicipality = getMostPopularMaterialByMunicipality();

  // Calculate trends and growth rates
  const calculateTrends = () => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const sixtyDaysAgo = new Date(now.getTime() - (60 * 24 * 60 * 60 * 1000));

    const recentUsers = users.filter(u => getValidDate(u.createdAt) > thirtyDaysAgo).length;
    const previousUsers = users.filter(u => {
      const date = getValidDate(u.createdAt);
      return date > sixtyDaysAgo && date <= thirtyDaysAgo;
    }).length;

    const recentBookings = bookings.filter(b => getValidDate(b.createdAt) > thirtyDaysAgo).length;
    const previousBookings = bookings.filter(b => {
      const date = getValidDate(b.createdAt);
      return date > sixtyDaysAgo && date <= thirtyDaysAgo;
    }).length;

    const userTrend = previousUsers > 0 ? ((recentUsers - previousUsers) / previousUsers) * 100 : recentUsers > 0 ? 100 : 0;
    const bookingTrend = previousBookings > 0 ? ((recentBookings - previousBookings) / previousBookings) * 100 : recentBookings > 0 ? 100 : 0;

    return {
      userGrowth: userTrend,
      bookingGrowth: bookingTrend,
      recentUsers,
      recentBookings
    };
  };

  const trends = calculateTrends();

  // Generate time-based data based on selected view
  const generateTimeBasedData = () => {
    const now = new Date();
    let data = [];
    
    switch(timeView) {
      case 'daily':
        // Last 30 days
        for (let i = 29; i >= 0; i--) {
          const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
          const dateStr = date.toISOString().split('T')[0];
          
          const dayUsers = users.filter(u => {
            const userDate = getValidDate(u.createdAt);
            return userDate.toISOString().split('T')[0] === dateStr;
          }).length;
          
          const dayBookings = bookings.filter(b => {
            const bookingDate = getValidDate(b.createdAt);
            return bookingDate.toISOString().split('T')[0] === dateStr;
          }).length;
          
          data.push({
            period: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            users: dayUsers,
            bookings: dayBookings,
            date: dateStr
          });
        }
        break;
        
      case 'weekly':
        // Last 12 weeks
        for (let i = 11; i >= 0; i--) {
          const weekStart = new Date(now.getTime() - (i * 7 * 24 * 60 * 60 * 1000));
          const weekEnd = new Date(weekStart.getTime() + (6 * 24 * 60 * 60 * 1000));
          
          const weekUsers = users.filter(u => {
            const userDate = getValidDate(u.createdAt);
            return userDate >= weekStart && userDate <= weekEnd;
          }).length;
          
          const weekBookings = bookings.filter(b => {
            const bookingDate = getValidDate(b.createdAt);
            return bookingDate >= weekStart && bookingDate <= weekEnd;
          }).length;
          
          data.push({
            period: `W${12-i}`,
            users: weekUsers,
            bookings: weekBookings,
            weekStart: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          });
        }
        break;
        
      case 'yearly':
        // Last 5 years
        const currentYear = now.getFullYear();
        for (let i = 4; i >= 0; i--) {
          const year = currentYear - i;
          
          const yearUsers = users.filter(u => {
            const userDate = getValidDate(u.createdAt);
            return userDate.getFullYear() === year;
          }).length;
          
          const yearBookings = bookings.filter(b => {
            const bookingDate = getValidDate(b.createdAt);
            return bookingDate.getFullYear() === year;
          }).length;
          
          data.push({
            period: year.toString(),
            users: yearUsers,
            bookings: yearBookings
          });
        }
        break;
        
      default: // monthly
        // Last 12 months - always start from 1st of each month
        for (let i = 11; i >= 0; i--) {
          // Ensure we always start from the 1st day of each month
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          
          const monthUsers = users.filter(u => {
            const userDate = getValidDate(u.createdAt);
            return userDate.getFullYear() === date.getFullYear() && 
                   userDate.getMonth() === date.getMonth();
          }).length;
          
          const monthBookings = bookings.filter(b => {
            const bookingDate = getValidDate(b.createdAt);
            return bookingDate.getFullYear() === date.getFullYear() && 
                   bookingDate.getMonth() === date.getMonth();
          }).length;
          
          data.push({
            period: date.toLocaleDateString('en-US', { month: 'short' }),
            users: monthUsers,
            bookings: monthBookings,
            // Add month start date for consistency
            monthStart: date.toISOString().split('T')[0],
            // Add explicit month label
            monthLabel: date.toLocaleDateString('en-US', { month: 'short' })
          });
        }
    }
    
    return data;
  };

  const timeBasedData = generateTimeBasedData();

  // Generate user growth data from actual Firebase data with enhanced date handling
  const userGrowthData = (() => {
    if (users.length === 0) return [];
    
    const monthlyData = {};
    
    users.forEach(user => {
      if (user.createdAt) {
        const date = getValidDate(user.createdAt);
        
        // Only process valid dates
        if (!isNaN(date.getTime())) {
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          
          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { total: 0, collectors: 0, junkShops: 0 };
          }
          
          monthlyData[monthKey].total += 1;
          
          // Track user types for more detailed analytics
          if (user.role === 'collector') {
            monthlyData[monthKey].collectors += 1;
          } else if (user.role === 'junk_shop_owner' || user.role === 'junkshop') {
            monthlyData[monthKey].junkShops += 1;
          }
        }
      }
    });

    // Only return data if we have actual user registrations
    if (Object.keys(monthlyData).length === 0) return [];

    return Object.entries(monthlyData)
      .map(([monthKey, data]) => {
        const [year, month] = monthKey.split('-');
        // Always use 1st day of month for consistent display
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        return {
          month: `${date.toLocaleDateString('en-US', { month: 'short' })} 1`,
          users: data.total,
          collectors: data.collectors,
          junkShops: data.junkShops,
          sortKey: monthKey,
          // Add month start date for consistency
          monthStart: date.toISOString().split('T')[0]
        };
      })
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .slice(-6); // Show last 6 months
  })();

  // Material distribution - based on actual junk types from bookings
  const materialData = (() => {
    if (bookings.length === 0) return [];
    
    // Count actual junk types from all bookings (use all bookings, not just filtered)
    const junkTypeCounts = {};
    
    bookings.forEach(booking => {
      let junkType = null;
      
      // Check if junkType field exists
      if (booking.junkType) {
        junkType = booking.junkType.toLowerCase();
      } 
      // Extract material from notes field if junkType doesn't exist
      else if (booking.notes) {
        const materialMatch = booking.notes.match(/Material:\s*([^.]+)/i);
        if (materialMatch) {
          junkType = materialMatch[1].trim().toLowerCase();
        }
      }
      
      if (junkType) {
        // Clean up the junk type (remove words like "& ", "and", etc.)
        junkType = junkType.replace(/\s*&\s*/g, ' ').replace(/\s+and\s+/g, ' ').split(' ')[0];
        junkTypeCounts[junkType] = (junkTypeCounts[junkType] || 0) + 1;
      }
    });
    
    // Map junk types to 5 main categories with colors
    const mainCategories = {
      'Paper': { color: "#22c55e", count: 0 },
      'Plastic': { color: "#3b82f6", count: 0 },
      'Metal': { color: "#f59e0b", count: 0 },
      'Glass': { color: "#8b5cf6", count: 0 },
      'Electronic': { color: "#ef4444", count: 0 }
    };
    
    // Aggregate counts into main categories
    Object.entries(junkTypeCounts).forEach(([type, count]) => {
      if (type.includes('paper') || type.includes('cardboard')) {
        mainCategories['Paper'].count += count;
      } else if (type.includes('plastic') || type.includes('bottle')) {
        mainCategories['Plastic'].count += count;
      } else if (type.includes('metal') || type.includes('aluminum') || 
                 type.includes('steel') || type.includes('copper') || type.includes('can')) {
        mainCategories['Metal'].count += count;
      } else if (type.includes('glass')) {
        mainCategories['Glass'].count += count;
      } else if (type.includes('electronic')) {
        mainCategories['Electronic'].count += count;
      }
    });
    
    // Convert to array and calculate percentages
    const totalCount = Object.values(mainCategories).reduce((sum, cat) => sum + cat.count, 0);
    
    return Object.entries(mainCategories)
      .map(([name, data]) => ({
        name,
        value: data.count,
        color: data.color,
        percentage: totalCount > 0 ? Math.round((data.count / totalCount) * 100) : 0
      }))
      .sort((a, b) => b.value - a.value); // Sort by count descending
  })();

  return (
    <Layout title="Platform Analytics">
      <div className="space-y-6">
        {/* Hero Section */}
        <Card className="bg-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-1">Platform Analytics</h1>
                <p className="text-green-100">Comprehensive insights and performance metrics</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Stats Grid - Enhanced with trend indicators */}
        <div className="grid grid-cols-1 gap-4">


        </div>

        {/* New Analytics Features */}
        
        {/* Monthly Collection Performance and Material Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Collection Performance */}
          <Card className="bg-white border border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
                Monthly Collection Performance
              </CardTitle>
              <p className="text-sm text-gray-600">Total recyclables collected (kg) per month from bookings</p>
            </CardHeader>
            <CardContent>
              {(() => {
                // Calculate chart data
                const chartData = monthlyRecyclables.map(month => {
                  const totalWeight = Object.values(month.municipalities).reduce((sum, weight) => sum + weight, 0);
                  return {
                    month: month.month,
                    weight: totalWeight
                  };
                });
                
                // Check if there's any data
                const hasData = chartData.some(d => d.weight > 0);
                const totalCollected = chartData.reduce((sum, d) => sum + d.weight, 0);
                
                return (
                  <>
                    {hasData && (
                      <div className="mb-3 text-sm text-gray-600">
                        <span className="font-semibold text-green-600">{totalCollected.toFixed(1)} kg</span> collected this year from {bookings.length} bookings
                      </div>
                    )}
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis 
                          dataKey="month" 
                          tick={{ fontSize: 12 }}
                          angle={0}
                          textAnchor="middle"
                          height={60}
                        />
                        <YAxis 
                          tick={{ fontSize: 12 }}
                          label={{ value: 'Weight (kg)', angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px'
                          }}
                          formatter={(value) => [`${value.toFixed(1)} kg`, 'Weight Collected']}
                        />
                        <Bar 
                          dataKey="weight" 
                          fill="#22c55e" 
                          radius={[4, 4, 0, 0]}
                          name="Total Collection"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                    {!hasData && (
                      <div className="text-center py-8 text-gray-500">
                        <Recycle className="h-12 w-12 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No collection data available yet</p>
                        <p className="text-xs mt-1">Data will appear when bookings with estimated weight are recorded</p>
                      </div>
                    )}
                  </>
                );
              })()}
            </CardContent>
          </Card>

          {/* Material Distribution */}
          <Card className="bg-white border border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center">
                <PieChartIcon className="h-5 w-5 mr-2" />
                Material Distribution
              </CardTitle>
              <p className="text-sm text-gray-600">Breakdown by waste categories</p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col space-y-4">
                {materialData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={materialData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          stroke="none"
                        >
                          {materialData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px'
                          }}
                          formatter={(value, name, props) => [
                            `${value} items (${props.payload.percentage}%)`, 
                            props.payload.name
                          ]} 
                          labelStyle={{ display: 'none' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-2 gap-2">
                      {materialData.map((item, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-xs text-gray-600">{item.name}</span>
                          <span className="text-xs font-medium ml-auto">{item.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-600">
                    <Package className="h-12 w-12 mb-4 opacity-50" />
                    <p className="text-lg font-medium">No Data Available</p>
                    <p className="text-sm">Material distribution will appear with booking data</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 3. Participation and Material Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Participation Rates Analysis */}
          <Card className="bg-white border border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center">
                <Users className="h-5 w-5 mr-2 text-green-600" />
                Municipality Activity Analysis
              </CardTitle>
              <p className="text-sm text-gray-600">Municipalities ranked by user activity and engagement</p>
            </CardHeader>
            <CardContent>
              {/* Active Users Stats */}
              <div className="mb-6">
                <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-600">Active Users</p>
                        <p className="text-2xl font-bold text-green-900">{analyticsStats.totalUsers}</p>
                      </div>
                      <div className="w-10 h-10 bg-green-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                        <Users className="h-5 w-5 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="space-y-6">
                  {/* Most Active Municipality */}
                  <div>
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                      {Object.entries(participationRates.byMunicipality)
                        .sort(([,a], [,b]) => b.activeUsers - a.activeUsers)
                        .map(([municipality, data]) => (
                          <div 
                            key={municipality} 
                            className="flex justify-between items-center p-2 rounded cursor-pointer transition-colors bg-gray-50 hover:bg-gray-100"
                            onClick={() => {
                              setSelectedParticipationMunicipality(municipality);
                              setIsParticipationModalOpen(true);
                            }}
                          >
                            <span className="text-sm font-medium">{municipality}</span>
                            <div className="text-right">
                              <span className="text-sm font-bold text-green-600">{data.activeUsers} active</span>
                              <div className="text-xs text-gray-500">{data.totalUsers} total users</div>
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                </div>
              </CardContent>
          </Card>

          {/* Popular Materials by Municipality */}
          <Card className="bg-white border border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center">
                <Package className="h-5 w-5 mr-2 text-green-600" />
                Popular Materials by Municipality
              </CardTitle>
              <p className="text-sm text-gray-600">Most recycled material type in each municipality</p>
            </CardHeader>
            <CardContent>
              {/* Total Weight Stats */}
              <div className="mb-6">
                <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-600">Total Weight (kg)</p>
                        <p className="text-2xl font-bold text-green-900">{analyticsStats.totalWeight.toLocaleString()}</p>
                      </div>
                      <div className="w-10 h-10 bg-green-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                        <Recycle className="h-5 w-5 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="space-y-2 max-h-64 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                {popularMaterialsByMunicipality.map((data, index) => (
                  <div 
                    key={data.municipality} 
                    className="flex justify-between items-center p-2 bg-gray-50 rounded-lg border cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => {
                      setSelectedMaterialsMunicipality(data.municipality);
                      setIsMaterialsModalOpen(true);
                    }}
                  >
                    <span className="font-medium text-gray-800">{data.municipality}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      data.totalBookings > 0 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {data.displayMaterial}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Participation by User Type Modal */}
      <Dialog open={isParticipationModalOpen} onOpenChange={setIsParticipationModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2 text-green-600" />
              Participation by User Type
              <span className="text-sm font-normal text-green-600 ml-2">
                ({selectedParticipationMunicipality})
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {Object.entries(participationRates.byRole)
              .sort(([,a], [,b]) => b.participationRate - a.participationRate)
              .map(([role, data]) => (
                <div key={role} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium capitalize">{role.replace('_', ' ')}</span>
                    <span className="text-sm font-bold">{data.participationRate}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${data.participationRate}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {data.activeUsers} active of {data.totalUsers} total users
                  </div>
                </div>
              ))
            }
          </div>
        </DialogContent>
      </Dialog>

      {/* Materials Breakdown Modal */}
      <Dialog open={isMaterialsModalOpen} onOpenChange={setIsMaterialsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Package className="h-5 w-5 mr-2 text-green-600" />
              Material Breakdown
              <span className="text-sm font-normal text-green-600 ml-2">
                ({selectedMaterialsMunicipality})
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {selectedMaterialsMunicipality && getMaterialBreakdownForMunicipality(selectedMaterialsMunicipality).map((material, index) => (
              <div key={material.material} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{material.material}</span>
                  <div className="text-right">
                    <div className={`text-sm font-bold ${material.weight > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                      {material.weight.toFixed(1)} kg
                    </div>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      material.weight > 0 ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gray-300'
                    }`} 
                    style={{ width: `${material.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}