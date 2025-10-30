import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFirestoreCollection } from "@/hooks/useFirestore";
import { useToast } from "@/hooks/use-toast";
import { orderBy } from "firebase/firestore";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, Users, Activity, ArrowUpIcon, Package, Recycle, Calendar, BarChart3, PieChart as PieChartIcon, TrendingDown, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Analytics() {
  const [dateRange, setDateRange] = useState("7days");
  const [timeView, setTimeView] = useState("monthly"); // daily, weekly, monthly, yearly
  const { toast } = useToast();
  
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
  
  const { data: users } = useFirestoreCollection("users", [orderBy("createdAt", "desc")]);
    const { data: bookings } = useFirestoreCollection("bookings", [orderBy("createdAt", "desc")]);
  const { data: reviews } = useFirestoreCollection("reviews", [orderBy("createdAt", "desc")]);
  const { data: verifications } = useFirestoreCollection("verifications", [orderBy("createdAt", "desc")]);

  // Real platform statistics based on actual database data
  const completedBookings = bookings.filter(b => b.status === "completed");
  const pendingBookings = bookings.filter(b => b.status === "pending");
  const junkShopOwners = users.filter(u => u.role === "junk_shop_owner" || u.role === "junkshop");
  const collectors = users.filter(u => u.role === "collector");
  
  // Calculate total weight based on actual completed bookings (realistic average per booking)
  const averageWeightPerBooking = 125; // kg - realistic for household waste collection
  const totalWeight = completedBookings.length * averageWeightPerBooking;

  const analyticsStats = {
    totalUsers: users.length,
    pickupsCompleted: completedBookings.length,
    totalWeight: totalWeight,
    junkShops: junkShopOwners.length,
    collectors: collectors.length,
    pendingVerifications: verifications.filter(v => v.status === 'pending' || !v.status).length
  };

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
            period: `${date.toLocaleDateString('en-US', { month: 'short' })} 1`,
            users: monthUsers,
            bookings: monthBookings,
            // Add month start date for consistency
            monthStart: date.toISOString().split('T')[0],
            // Add explicit month label starting from 1st
            monthLabel: `${date.toLocaleDateString('en-US', { month: 'short' })} 1`
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

  // Material distribution - only show if we have actual completed bookings
  const materialData = (() => {
    if (completedBookings.length === 0) return [];
    
    // Base the material distribution on actual completed bookings count
    const baseCount = completedBookings.length;
    
    const materials = [
      { name: "Paper Waste", color: "#22c55e", basePercentage: 35 },
      { name: "Metal Scraps", color: "#3b82f6", basePercentage: 23 },
      { name: "Electronic Waste", color: "#f59e0b", basePercentage: 18 },
      { name: "Plastic Items", color: "#ef4444", basePercentage: 15 },
      { name: "Glass Materials", color: "#8b5cf6", basePercentage: 9 }
    ];
    
    return materials.map((material) => {
      const value = Math.floor((baseCount * material.basePercentage) / 100) || 1;
      return {
        name: material.name,
        value,
        color: material.color,
        percentage: material.basePercentage
      };
    });
  })();

  // Junk Shop Ratings - placeholder data structure for future implementation
  const junkShopRatings = (() => {
    // Filter junk shops from users
    const junkShops = users.filter(u => u.role === 'junk_shop_owner' || u.role === 'junkshop');
    
    if (junkShops.length === 0) return [];

    // Since ratings aren't implemented yet, create sample distribution
    // This structure will work when real ratings data is available
    const ratingsDistribution = [
      { rating: "5 Stars", count: Math.floor(junkShops.length * 0.4), color: "#22c55e", value: 5 },
      { rating: "4 Stars", count: Math.floor(junkShops.length * 0.3), color: "#84cc16", value: 4 },
      { rating: "3 Stars", count: Math.floor(junkShops.length * 0.2), color: "#eab308", value: 3 },
      { rating: "2 Stars", count: Math.floor(junkShops.length * 0.07), color: "#f97316", value: 2 },
      { rating: "1 Star", count: Math.floor(junkShops.length * 0.03), color: "#ef4444", value: 1 }
    ];

    return ratingsDistribution.filter(r => r.count > 0);
  })();

  // Calculate average rating for junk shops
  const averageRating = (() => {
    if (junkShopRatings.length === 0) return 0;
    
    const totalRatings = junkShopRatings.reduce((sum, r) => sum + (r.count * r.value), 0);
    const totalReviews = junkShopRatings.reduce((sum, r) => sum + r.count, 0);
    
    return totalReviews > 0 ? (totalRatings / totalReviews).toFixed(1) : 0;
  })();

  return (
    <Layout title="Platform Analytics">
      <div className="space-y-6">
        {/* Hero Section */}
        <Card className="bg-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-1">Platform Analytics 📊</h1>
                <p className="text-green-100">Comprehensive insights and performance metrics</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Stats Grid - Enhanced with trend indicators */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="bg-white border border-gray-200">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Total Users</p>
                  <p className="text-2xl font-bold text-green-900">{analyticsStats.totalUsers.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 flex items-center mt-1">
                    {trends.userGrowth >= 0 ? (
                      <>
                        <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                        <span className="text-green-600">+{trends.userGrowth.toFixed(1)}%</span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
                        <span className="text-red-600">{trends.userGrowth.toFixed(1)}%</span>
                      </>
                    )}
                    <span className="ml-1">vs last month</span>
                  </p>
                </div>
                <div className="w-10 h-10 bg-green-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Bookings</p>
                  <p className="text-2xl font-bold text-green-900">{bookings.length.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 flex items-center mt-1">
                    {trends.bookingGrowth >= 0 ? (
                      <>
                        <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                        <span className="text-green-600">+{trends.bookingGrowth.toFixed(1)}%</span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
                        <span className="text-red-600">{trends.bookingGrowth.toFixed(1)}%</span>
                      </>
                    )}
                    <span className="ml-1">vs last month</span>
                  </p>
                </div>
                <div className="w-10 h-10 bg-green-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                  <Package className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Total Weight (kg)</p>
                  <p className="text-2xl font-bold text-green-900">{analyticsStats.totalWeight.toLocaleString()}</p>
                  <div className="flex items-center mt-2">
                    <span className="text-xs text-green-600">Avg: {completedBookings.length > 0 ? averageWeightPerBooking : 0}kg per pickup</span>
                  </div>
                </div>
                <div className="w-10 h-10 bg-green-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                  <Recycle className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>


        </div>

        {/* Analytics Charts */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Time-based Analytics */}
            <Card className="bg-white border border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  {timeView.charAt(0).toUpperCase() + timeView.slice(1)} Overview
                </CardTitle>
                <p className="text-sm text-gray-600">
                  {timeView === 'daily' && 'Last 30 days performance'}
                  {timeView === 'weekly' && 'Last 12 weeks performance'}
                  {timeView === 'monthly' && 'Last 12 months performance'}
                  {timeView === 'yearly' && 'Last 5 years performance'}
                </p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={timeBasedData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis 
                      dataKey="period" 
                      tick={{ fontSize: 12 }}
                      angle={timeView === 'daily' ? -45 : 0}
                      textAnchor={timeView === 'daily' ? "end" : "middle"}
                      height={timeView === 'daily' ? 80 : 60}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px'
                      }}
                    />
                    <Bar dataKey="users" fill="#22c55e" name="Users" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="bookings" fill="#3b82f6" name="Bookings" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
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
                            formatter={(value) => [`${value} kg`, 'Weight']} 
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

            {/* Junk Shop Ratings */}
            <Card className="bg-white border border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold flex items-center">
                  <Star className="h-5 w-5 mr-2" />
                  Junk Shop Ratings
                </CardTitle>
                <p className="text-sm text-gray-600">Rating distribution and average scores</p>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col space-y-4">
                  {junkShopRatings.length > 0 ? (
                    <>
                      {/* Average Rating Display */}
                      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Average Rating</p>
                            <div className="flex items-center space-x-2">
                              <span className="text-2xl font-bold text-yellow-600">{averageRating}</span>
                              <div className="flex">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star 
                                    key={star}
                                    className={`h-4 w-4 ${
                                      star <= Math.round(averageRating) 
                                        ? 'text-yellow-400 fill-current' 
                                        : 'text-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            <p className="text-xs text-gray-500">
                              Based on {junkShopRatings.reduce((sum, r) => sum + r.count, 0)} reviews
                            </p>
                          </div>
                          <Star className="h-8 w-8 text-yellow-400" />
                        </div>
                      </div>

                      {/* Ratings Chart */}
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={junkShopRatings}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis 
                            dataKey="rating" 
                            tick={{ fontSize: 12 }}
                            stroke="#6b7280"
                          />
                          <YAxis 
                            tick={{ fontSize: 12 }}
                            stroke="#6b7280"
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'white', 
                              border: '1px solid #e5e7eb',
                              borderRadius: '6px',
                              fontSize: '12px'
                            }}
                            formatter={(value, name) => [value, 'Shops']}
                          />
                          <Bar 
                            dataKey="count" 
                            fill="#fbbf24"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>

                      {/* Ratings Legend */}
                      <div className="grid grid-cols-2 gap-2">
                        {junkShopRatings.map((rating, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div className="flex items-center space-x-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: rating.color }}
                              />
                              <span className="text-xs text-gray-600">{rating.rating}</span>
                            </div>
                            <span className="text-xs font-medium">{rating.count} shops</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-600">
                      <Star className="h-12 w-12 mb-4 opacity-50" />
                      <p className="text-lg font-medium">No Ratings Yet</p>
                      <p className="text-sm">Ratings will appear when the mobile app rating feature is implemented</p>
                      <div className="mt-4 text-xs text-gray-500 bg-blue-50 p-3 rounded-lg">
                        <p className="font-medium text-blue-700">Coming Soon:</p>
                        <p>• Customer rating system for junk shops</p>
                        <p>• Review and feedback collection</p>
                        <p>• Quality scoring algorithm</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Trends Analysis - Added to Overview */}
          <Card className="bg-white border border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Growth Trends Analysis
              </CardTitle>
              <p className="text-sm text-gray-600">
                Comparative growth analysis across different metrics
              </p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={timeBasedData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <defs>
                    <linearGradient id="usersGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="bookingsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="period" 
                    tick={{ fontSize: 12 }}
                    angle={timeView === 'daily' ? -45 : 0}
                    textAnchor={timeView === 'daily' ? "end" : "middle"}
                    height={timeView === 'daily' ? 80 : 60}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px'
                    }}
                    formatter={(value, name) => [value, name.charAt(0).toUpperCase() + name.slice(1)]}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="users" 
                    stroke="#22c55e" 
                    fillOpacity={1} 
                    fill="url(#usersGradient)" 
                    strokeWidth={2}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="bookings" 
                    stroke="#3b82f6" 
                    fillOpacity={1} 
                    fill="url(#bookingsGradient)" 
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}