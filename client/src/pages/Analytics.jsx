import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useFirestoreCollection } from "@/hooks/useFirestore";
import { useToast } from "@/hooks/use-toast";
import { orderBy, doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, Users, Activity, ArrowUpIcon, Package, Recycle, Calendar, BarChart3, PieChart as PieChartIcon, TrendingDown, Star, X, Plus, Trash2, Pencil, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { analyticsService } from "@/services/analyticsService";

export default function Analytics() {
  const [dateRange, setDateRange] = useState("7days");
  const [timeView, setTimeView] = useState("monthly"); // daily, weekly, monthly, yearly
  const [selectedParticipationMunicipality, setSelectedParticipationMunicipality] = useState("all");
  const [isParticipationModalOpen, setIsParticipationModalOpen] = useState(false);
  const [selectedMaterialsMunicipality, setSelectedMaterialsMunicipality] = useState("");
  const [isMaterialsModalOpen, setIsMaterialsModalOpen] = useState(false);
  const [isMunicipalityModalOpen, setIsMunicipalityModalOpen] = useState(false);
  const [newMunicipality, setNewMunicipality] = useState("");
  const [municipalities, setMunicipalities] = useState([]);
  const [loadingMunicipalities, setLoadingMunicipalities] = useState(true);
  const [editingMunicipality, setEditingMunicipality] = useState(null);
  const [editedMunicipalityName, setEditedMunicipalityName] = useState("");
  const [selectedMunicipalityForBreakdown, setSelectedMunicipalityForBreakdown] = useState(null);
  const [isMunicipalityBreakdownModalOpen, setIsMunicipalityBreakdownModalOpen] = useState(false);
  const [selectedMaterialMunicipality, setSelectedMaterialMunicipality] = useState(null);
  const [isMaterialBreakdownModalOpen, setIsMaterialBreakdownModalOpen] = useState(false);
  const { toast } = useToast();
  
  // Analytics data state
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState([]);
  const [materialData, setMaterialData] = useState({});
  const [municipalityActivity, setMunicipalityActivity] = useState([]);
  const [popularMaterials, setPopularMaterials] = useState([]);
  const [totalStats, setTotalStats] = useState({
    totalUsers: 0,
    totalBookings: 0,
    completedBookings: 0,
    totalWeight: 0
  });
  
  // Batangas municipalities list (use state instead)
  const batangasMunicipalities = municipalities;

  // Load municipalities from Firestore on mount
  useEffect(() => {
    const municipalitiesDocRef = doc(db, "settings", "municipalities");
    
    // Set up real-time listener
    const unsubscribe = onSnapshot(municipalitiesDocRef, async (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        setMunicipalities(data.list || []);
      } else {
        // Initialize with default municipalities if document doesn't exist
        const defaultMunicipalities = [
          "Agoncillo", "Alitagtag", "Balayan", "Balete", "Batangas City", "Bauan", "Calaca", "Calatagan", 
          "Cuenca", "Ibaan", "Laurel", "Lemery", "Lian", "Lobo", "Mabini", "Malvar", 
          "Mataasnakahoy", "Nasugbu", "Padre Garcia", "Rosario", "San Jose", "San Juan", 
          "San Luis", "San Nicolas", "San Pascual", "Santa Teresita", "Taal", "Talisay", 
          "Taysan", "Tingloy", "Tuy"
        ];
        await setDoc(municipalitiesDocRef, { 
          list: defaultMunicipalities,
          updatedAt: new Date()
        });
        setMunicipalities(defaultMunicipalities);
      }
      setLoadingMunicipalities(false);
    }, (error) => {
      console.error("Error loading municipalities:", error);
      toast({
        title: "Error",
        description: "Failed to load municipalities",
        variant: "destructive",
      });
      setLoadingMunicipalities(false);
    });

    return () => unsubscribe();
  }, [toast]);
  
  // Fetch all analytics data
  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    console.log('🔄 Starting analytics data fetch...');
    try {
      const [monthly, materials, municipality, popular, stats] = await Promise.all([
        analyticsService.getMonthlyCollectionData(),
        analyticsService.getMaterialDistribution(),
        analyticsService.getMunicipalityActivity(),
        analyticsService.getPopularMaterialsByMunicipality(),
        analyticsService.getTotalStats()
      ]);

      console.log('✅ Analytics data fetched successfully:', {
        monthly,
        materials,
        municipality,
        popular,
        stats
      });

      setMonthlyData(monthly);
      setMaterialData(materials);
      setMunicipalityActivity(municipality);
      setPopularMaterials(popular);
      setTotalStats(stats);
      
      toast({
        title: "Success",
        description: "Analytics data loaded successfully",
      });
    } catch (error) {
      console.error('❌ Error fetching analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
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

  // Municipality management functions
  const handleAddMunicipality = async () => {
    if (!newMunicipality.trim()) {
      toast({
        title: "Error",
        description: "Please enter a municipality name",
        variant: "destructive",
      });
      return;
    }

    if (municipalities.includes(newMunicipality.trim())) {
      toast({
        title: "Error",
        description: "Municipality already exists",
        variant: "destructive",
      });
      return;
    }

    try {
      const updatedMunicipalities = [...municipalities, newMunicipality.trim()].sort();
      const municipalitiesDocRef = doc(db, "settings", "municipalities");
      
      await setDoc(municipalitiesDocRef, {
        list: updatedMunicipalities,
        updatedAt: new Date()
      });

      setNewMunicipality("");
      toast({
        title: "Success",
        description: `${newMunicipality.trim()} added successfully`,
      });
    } catch (error) {
      console.error("Error adding municipality:", error);
      toast({
        title: "Error",
        description: "Failed to add municipality",
        variant: "destructive",
      });
    }
  };

  const handleDeleteMunicipality = async (municipalityToDelete) => {
    try {
      const updatedMunicipalities = municipalities.filter(m => m !== municipalityToDelete);
      const municipalitiesDocRef = doc(db, "settings", "municipalities");
      
      await setDoc(municipalitiesDocRef, {
        list: updatedMunicipalities,
        updatedAt: new Date()
      });

      toast({
        title: "Success",
        description: `${municipalityToDelete} removed successfully`,
      });
    } catch (error) {
      console.error("Error deleting municipality:", error);
      toast({
        title: "Error",
        description: "Failed to delete municipality",
        variant: "destructive",
      });
    }
  };

  const handleEditMunicipality = (municipality) => {
    setEditingMunicipality(municipality);
    setEditedMunicipalityName(municipality);
  };

  const handleSaveEdit = async () => {
    if (!editedMunicipalityName.trim()) {
      toast({
        title: "Error",
        description: "Municipality name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    if (editedMunicipalityName.trim() === editingMunicipality) {
      setEditingMunicipality(null);
      setEditedMunicipalityName("");
      return;
    }

    if (municipalities.includes(editedMunicipalityName.trim())) {
      toast({
        title: "Error",
        description: "Municipality already exists",
        variant: "destructive",
      });
      return;
    }

    try {
      const updatedMunicipalities = municipalities.map(m => 
        m === editingMunicipality ? editedMunicipalityName.trim() : m
      ).sort();
      
      const municipalitiesDocRef = doc(db, "settings", "municipalities");
      
      await setDoc(municipalitiesDocRef, {
        list: updatedMunicipalities,
        updatedAt: new Date()
      });

      setEditingMunicipality(null);
      setEditedMunicipalityName("");
      
      toast({
        title: "Success",
        description: `Municipality updated successfully`,
      });
    } catch (error) {
      console.error("Error updating municipality:", error);
      toast({
        title: "Error",
        description: "Failed to update municipality",
        variant: "destructive",
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingMunicipality(null);
    setEditedMunicipalityName("");
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
  
  // Filter out admin users for statistics
  const nonAdminUsers = users.filter(u => u.role !== "admin" && u.role !== "main_admin");
  
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
    totalUsers: nonAdminUsers.length,
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
    nonAdminUsers.forEach(user => {
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

    console.log(`👥 Participation for ${targetMunicipality}:`, {
      totalUsers: municipalityUsers.length,
      users: municipalityUsers.map(u => ({ id: u.id, role: u.role, municipality: u.municipality }))
    });

    // Calculate participation by role for the selected municipality only - ensure all roles are included
    const roles = ['resident', 'collector', 'junkshop'];
    roles.forEach(role => {
      const roleUsers = municipalityUsers.filter(u => u.role === role);
      const activeRoleUsers = roleUsers.filter(user => {
        const userBookings = bookings.filter(b => b.customerId === user.id || b.userId === user.id);
        return userBookings.length > 0;
      });

      console.log(`  📊 ${role}:`, {
        totalUsers: roleUsers.length,
        activeUsers: activeRoleUsers.length,
        participationRate: roleUsers.length > 0 ? 
          Math.round((activeRoleUsers.length / roleUsers.length) * 100) : 0
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
        materialWeights: {}, // Stores weight by material type
        totalBookings: 0,
        topMaterial: null,
        topMaterialWeight: 0,
        topMaterialPercentage: 0
      };
    });

    console.log('🏘️ Processing bookings for municipalities:', {
      totalBookings: bookings.length,
      totalUsers: users.length
    });

    // Get bookings and extract municipality from booking or user
    bookings.forEach(booking => {
      // Try to get municipality from multiple sources
      let municipality = booking.municipality;
      
      // If not in booking, get from user
      if (!municipality) {
        const user = users.find(u => u.id === booking.customerId || u.id === booking.userId);
        municipality = user?.municipality;
      }
      
      // Skip if no municipality found
      if (!municipality || !municipalityMaterials[municipality]) {
        return;
      }
      
      // Get junk type from booking's junkType field
      const junkType = booking.junkType;
      
      if (!junkType) {
        return; // Skip if no junkType
      }

      // Get weight from booking
      const weight = parseFloat(booking.estimatedWeight) || 0;

      // Normalize the junk type to lowercase for consistent grouping
      const normalizedJunkType = junkType.toLowerCase().trim();
      
      // Map to main categories
      let categoryKey = null;
      if (normalizedJunkType.includes('paper') || normalizedJunkType.includes('cardboard')) {
        categoryKey = 'Paper';
      } else if (normalizedJunkType.includes('plastic') || normalizedJunkType.includes('bottle')) {
        categoryKey = 'Plastic';
      } else if (normalizedJunkType.includes('metal') || normalizedJunkType.includes('aluminum') || 
                 normalizedJunkType.includes('steel') || normalizedJunkType.includes('copper') || 
                 normalizedJunkType.includes('can')) {
        categoryKey = 'Metal';
      } else if (normalizedJunkType.includes('glass')) {
        categoryKey = 'Glass';
      } else if (normalizedJunkType.includes('electronic')) {
        categoryKey = 'Electronic';
      } else {
        // Everything else goes to "Other" category
        categoryKey = 'Other';
      }
      
      if (!municipalityMaterials[municipality].materialWeights[categoryKey]) {
        municipalityMaterials[municipality].materialWeights[categoryKey] = 0;
      }
      
      municipalityMaterials[municipality].materialWeights[categoryKey] += weight;
      municipalityMaterials[municipality].totalBookings++;
      
      console.log(`  📍 ${municipality}: ${categoryKey} +${weight}kg (Total: ${municipalityMaterials[municipality].materialWeights[categoryKey]}kg)`);
    });

    // Find top material by weight for each municipality
    Object.keys(municipalityMaterials).forEach(municipality => {
      const data = municipalityMaterials[municipality];
      
      if (data.totalBookings > 0) {
        const sortedMaterials = Object.entries(data.materialWeights)
          .sort(([,a], [,b]) => b - a);
        
        if (sortedMaterials.length > 0) {
          const [topMaterial, weight] = sortedMaterials[0];
          const totalWeight = Object.values(data.materialWeights).reduce((sum, w) => sum + w, 0);
          data.topMaterial = topMaterial;
          data.topMaterialWeight = weight;
          data.topMaterialPercentage = totalWeight > 0 ? Math.round((weight / totalWeight) * 100) : 0;
          
          console.log(`  ✅ ${municipality} top material: ${topMaterial} (${weight.toFixed(1)}kg, ${data.topMaterialPercentage}%)`);
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
        displayWeight: data.topMaterialWeight || 0,
        displayPercentage: data.topMaterialPercentage || 0
      }));
  };

  // Get detailed material breakdown for a specific municipality
  const getMaterialBreakdownForMunicipality = (municipalityName) => {
    // Define all possible material types - 6 main categories including Other
    const materialData = {
      'Paper': { count: 0, weight: 0 },
      'Plastic': { count: 0, weight: 0 },
      'Metal': { count: 0, weight: 0 },
      'Glass': { count: 0, weight: 0 },
      'Electronic': { count: 0, weight: 0 },
      'Other': { count: 0, weight: 0 }
    };

    let totalWeight = 0;

    console.log(`🔍 Material Breakdown for ${municipalityName}:`, {
      totalBookings: bookings.length,
      totalUsers: users.length
    });

    // Calculate weight for all materials for this municipality
    bookings.forEach(booking => {
      // Try to get municipality from booking first, then from user
      let municipality = booking.municipality;
      
      if (!municipality) {
        const user = users.find(u => u.id === booking.customerId || u.id === booking.userId);
        municipality = user?.municipality;
      }
      
      if (!municipality || municipality !== municipalityName) {
        return; // Skip if not from target municipality
      }
      
      // Get junk type from booking's junkType field
      const junkType = booking.junkType;
      
      if (!junkType) {
        return; // Skip if no junkType
      }

      const weight = parseFloat(booking.estimatedWeight) || 0;
      const normalizedJunkType = junkType.toLowerCase().trim();
      
      console.log(`  📦 Booking:`, {
        junkType,
        weight,
        municipality,
        estimatedWeight: booking.estimatedWeight
      });
      
      // Map to main categories
      let categoryKey = null;
      if (normalizedJunkType.includes('paper') || normalizedJunkType.includes('cardboard')) {
        categoryKey = 'Paper';
      } else if (normalizedJunkType.includes('plastic') || normalizedJunkType.includes('bottle')) {
        categoryKey = 'Plastic';
      } else if (normalizedJunkType.includes('metal') || normalizedJunkType.includes('aluminum') || normalizedJunkType.includes('steel') || normalizedJunkType.includes('iron')) {
        categoryKey = 'Metal';
      } else if (normalizedJunkType.includes('glass')) {
        categoryKey = 'Glass';
      } else if (normalizedJunkType.includes('electronic') || normalizedJunkType.includes('e-waste') || normalizedJunkType.includes('ewaste')) {
        categoryKey = 'Electronic';
      } else {
        categoryKey = 'Other';
      }
      
      if (categoryKey && materialData[categoryKey]) {
        materialData[categoryKey].count++;
        materialData[categoryKey].weight += weight;
        totalWeight += weight;
      }
    });

    console.log(`  ✅ Total weight calculated:`, totalWeight, 'kg');
    console.log(`  📊 Material data:`, materialData);

    // Convert to array with weights and percentages - keep all 6 categories
    return ['Paper', 'Plastic', 'Metal', 'Glass', 'Electronic', 'Other'].map(materialName => {
      const data = materialData[materialName];
      return {
        material: materialName,
        count: data.count,
        weight: data.weight,
        percentage: totalWeight > 0 ? Math.round((data.weight / totalWeight) * 100) : 0
      };
    });
  };

  // Get user breakdown for a specific municipality
  const getMunicipalityUserBreakdown = (municipalityName) => {
    const municipalityUsers = users.filter(u => u.municipality === municipalityName);
    
    const breakdown = {
      residents: municipalityUsers.filter(u => u.role === 'resident' || u.role === 'user' || !u.role).length,
      collectors: municipalityUsers.filter(u => u.role === 'collector').length,
      junkshops: municipalityUsers.filter(u => u.role === 'junk_shop_owner' || u.role === 'junkshop').length,
      total: municipalityUsers.length
    };

    return breakdown;
  };

  // Handle municipality click to show breakdown
  const handleMunicipalityClick = (municipalityName) => {
    setSelectedMunicipalityForBreakdown(municipalityName);
    setIsMunicipalityBreakdownModalOpen(true);
  };

  // Handle material municipality click to show material breakdown
  const handleMaterialMunicipalityClick = (municipalityName) => {
    setSelectedMaterialMunicipality(municipalityName);
    setIsMaterialBreakdownModalOpen(true);
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

  return (
    <Layout title="Platform Analytics">
      <div className="space-y-6">
        {/* Hero Section */}
        <Card className="bg-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">Platform Analytics</h1>
                <p className="text-green-100">Track and analyze waste management performance across all municipalities</p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setIsMunicipalityModalOpen(true)}
                  className="bg-white/20 text-white hover:bg-white/30"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Manage Municipalities/Cities
                </Button>
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
                <BarChart3 className="h-5 w-5 mr-2 text-green-600" />
                Monthly Collection Performance
              </CardTitle>
              <p className="text-sm text-gray-600">Total recyclables collected (kg) per month from bookings</p>
            </CardHeader>
            <CardContent>
              {(() => {
                // Calculate chart data from real analytics data
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const chartData = monthlyData.map((weight, index) => ({
                  month: monthNames[index],
                  weight: weight
                }));
                
                // Check if there's any data
                const hasData = monthlyData.some(w => w > 0);
                const totalCollected = monthlyData.reduce((sum, w) => sum + w, 0);
                
                return (
                  <>
                    {hasData && (
                      <div className="mb-3 text-sm text-gray-600">
                        <span className="font-semibold text-green-600">{totalCollected.toFixed(1)} kg</span> collected this year
                      </div>
                    )}
                    {!hasData ? (
                      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                        <Package className="w-16 h-16 mb-4 opacity-50" />
                        <p className="text-center font-medium">No collection data available yet</p>
                        <p className="text-sm text-center">Data will appear when bookings with estimated weight are recorded</p>
                      </div>
                    ) : (
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
                <PieChartIcon className="h-5 w-5 mr-2 text-green-600" />
                Material Distribution
              </CardTitle>
              <p className="text-sm text-gray-600">Breakdown by waste categories</p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col space-y-4">
                {Object.keys(materialData).length > 0 ? (
                  <>
                    {(() => {
                      // Define colors for each material type
                      const materialColors = {
                        'Paper': '#22c55e',
                        'Plastic': '#3b82f6',
                        'Metal': '#eab308',
                        'Glass': '#ef4444',
                        'Electronic': '#a855f7',
                        'Other': '#9ca3af'  // Gray color for Other
                      };
                      
                      // Ensure all 6 main material types are included
                      const allMaterials = {
                        'Paper': materialData['Paper'] || 0,
                        'Plastic': materialData['Plastic'] || 0,
                        'Metal': materialData['Metal'] || materialData['Metals'] || 0,
                        'Glass': materialData['Glass'] || 0,
                        'Electronic': materialData['Electronic'] || materialData['Electronics'] || 0,
                        'Other': materialData['Other'] || 0
                      };
                      
                      const total = Object.values(allMaterials).reduce((sum, val) => sum + val, 0);
                      const chartData = Object.entries(allMaterials)
                        .filter(([name, value]) => value > 0) // Only show materials with data in chart
                        .map(([name, value]) => ({
                          name,
                          value,
                          color: materialColors[name],
                          percentage: total > 0 ? Math.round((value / total) * 100) : 0
                        }));
                      
                      return (
                        <>
                          <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                              <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                                stroke="none"
                              >
                                {chartData.map((entry, index) => (
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
                                  `${value.toFixed(1)} kg (${props.payload.percentage}%)`, 
                                  props.payload.name
                                ]} 
                                labelStyle={{ display: 'none' }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="grid grid-cols-2 gap-2">
                            {chartData.map((item, index) => (
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
                      );
                    })()}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <Package className="h-16 w-16 mb-4 opacity-50" />
                    <p className="text-center font-medium">No Data Available</p>
                    <p className="text-sm text-center">Material distribution will appear with booking data</p>
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
              {/* Users Stats */}
              <div className="mb-6">
                <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-600">Users</p>
                        <p className="text-2xl font-bold text-green-900">{totalStats.totalUsers}</p>
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
                      {municipalityActivity.length > 0 ? (
                        municipalityActivity.map((municipality) => (
                          <div 
                            key={municipality.name} 
                            className="flex justify-between items-center p-3 rounded bg-gray-50 hover:bg-green-50 border border-gray-200 hover:border-green-300 cursor-pointer transition-all"
                            onClick={() => handleMunicipalityClick(municipality.name)}
                          >
                            <div className="flex-1">
                              <span className="text-sm font-medium text-gray-900">{municipality.name}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-bold text-green-600">{municipality.users} users</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-gray-400 py-4">No municipality data available</p>
                      )}
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
                        <p className="text-2xl font-bold text-green-900">{totalStats.totalWeight.toLocaleString()}</p>
                      </div>
                      <div className="w-10 h-10 bg-green-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                        <Recycle className="h-5 w-5 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="space-y-2 max-h-64 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                {popularMaterials.length > 0 ? (
                  popularMaterials.map((data) => (
                    <div 
                      key={data.municipality} 
                      className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border hover:bg-green-50 hover:border-green-300 transition-colors cursor-pointer"
                      onClick={() => handleMaterialMunicipalityClick(data.municipality)}
                    >
                      <div className="flex-1">
                        <span className="font-medium text-gray-900">{data.municipality}</span>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        data.weight > 0 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {data.weight > 0 
                          ? `${data.topMaterial} - ${data.weight.toFixed(1)} kg`
                          : data.topMaterial
                        }
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                    <Recycle className="w-12 h-12 mb-2 opacity-50" />
                    <p className="text-center text-sm">No data</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Municipality Management Dialog */}
      <Dialog open={isMunicipalityModalOpen} onOpenChange={setIsMunicipalityModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Package className="h-5 w-5 mr-2 text-green-600" />
              Manage Municipalities/Cities
            </DialogTitle>
          </DialogHeader>
          
          {/* Add Municipality Form */}
          <div className="space-y-4 border-b pb-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="newMunicipality">Add New Municipality/City</Label>
                <Input
                  id="newMunicipality"
                  value={newMunicipality}
                  onChange={(e) => setNewMunicipality(e.target.value)}
                  placeholder="Enter municipality/city name"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddMunicipality();
                    }
                  }}
                />
              </div>
              <Button 
                onClick={handleAddMunicipality}
                className="mt-6"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
          </div>

          {/* Municipality List */}
          <div className="space-y-2">
            <Label>Current Municipalities ({municipalities.length})</Label>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {municipalities.map((municipality) => (
                <div 
                  key={municipality}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {editingMunicipality === municipality ? (
                    <>
                      <Input
                        value={editedMunicipalityName}
                        onChange={(e) => setEditedMunicipalityName(e.target.value)}
                        className="flex-1 mr-2"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveEdit();
                          }
                        }}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSaveEdit}
                          className="bg-green-50 hover:bg-green-100 text-green-600 border-green-300"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCancelEdit}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="font-medium">{municipality}</span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditMunicipality(municipality)}
                          className="hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteMunicipality(municipality)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Municipality User Breakdown Dialog */}
      <Dialog open={isMunicipalityBreakdownModalOpen} onOpenChange={setIsMunicipalityBreakdownModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2 text-green-600" />
              {selectedMunicipalityForBreakdown} - User Breakdown
            </DialogTitle>
          </DialogHeader>
          
          {selectedMunicipalityForBreakdown && (() => {
            const breakdown = getMunicipalityUserBreakdown(selectedMunicipalityForBreakdown);
            return (
              <div className="space-y-4">
                {/* Total Users Summary */}
                <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-600">Total Users</p>
                        <p className="text-3xl font-bold text-green-900">{breakdown.total}</p>
                      </div>
                      <div className="w-12 h-12 bg-green-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                        <Users className="h-6 w-6 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* User Type Breakdown */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700">User Types</h3>
                  
                  {/* Residents */}
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                        <Users className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Residents</p>
                        <p className="text-xs text-gray-600">Regular platform users</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">{breakdown.residents}</p>
                    </div>
                  </div>

                  {/* Collectors */}
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                        <Package className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Collectors</p>
                        <p className="text-xs text-gray-600">Waste collection providers</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">{breakdown.collectors}</p>
                    </div>
                  </div>

                  {/* Junkshops */}
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                        <Recycle className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Junkshops</p>
                        <p className="text-xs text-gray-600">Recycling centers</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">{breakdown.junkshops}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Material Breakdown by Municipality Dialog */}
      <Dialog open={isMaterialBreakdownModalOpen} onOpenChange={setIsMaterialBreakdownModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Recycle className="h-5 w-5 mr-2 text-green-600" />
              {selectedMaterialMunicipality} - Material Breakdown
            </DialogTitle>
          </DialogHeader>
          
          {selectedMaterialMunicipality && (() => {
            const materialBreakdown = getMaterialBreakdownForMunicipality(selectedMaterialMunicipality);
            // Sort by weight (highest first)
            const sortedMaterials = materialBreakdown.sort((a, b) => b.weight - a.weight);
            const totalWeight = sortedMaterials.reduce((sum, item) => sum + item.weight, 0);
            
            return (
              <div className="space-y-4">
                {/* Total Weight Summary */}
                <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-600">Total Weight</p>
                        <p className="text-3xl font-bold text-green-900">{totalWeight.toFixed(1)} kg</p>
                      </div>
                      <div className="w-12 h-12 bg-green-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                        <Recycle className="h-6 w-6 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Material Breakdown */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700">Material Types</h3>
                  
                  {sortedMaterials.map((material, index) => (
                    <div 
                      key={material.material}
                      className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                          <Recycle className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{material.material}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-600">{material.weight.toFixed(1)} kg</p>
                      </div>
                    </div>
                  ))}

                  {totalWeight === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                      <Recycle className="w-12 h-12 mb-2 opacity-50" />
                      <p className="text-center text-sm">No material data available</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}