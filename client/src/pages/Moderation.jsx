import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useFirestoreCollection, useFirestoreOperations } from "@/hooks/useFirestore";
import { useToast } from "@/hooks/use-toast";
import { orderBy } from "firebase/firestore";
import { AlertTriangle, Flag, MessageSquare, ShieldCheck, Eye, CheckCircle, XCircle, Clock, Download, Calendar, Filter, ChevronDown, Search } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";


export default function Moderation() {
  const [filterType, setFilterType] = useState("all"); // New unified filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [timePeriod, setTimePeriod] = useState("monthly"); // New time period state
  const [statusFilter, setStatusFilter] = useState("pending"); // New status filter
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [actionNotes, setActionNotes] = useState("");
  const [actionType, setActionType] = useState("");
  
  // Action-specific settings
  const [suspensionDuration, setSuspensionDuration] = useState("7");
  const [warningLevel, setWarningLevel] = useState("minor");
  const [contentType, setContentType] = useState("post");
  const [banReason, setBanReason] = useState("violation");
  
  const { toast } = useToast();
  const { addDocument, updateDocument } = useFirestoreOperations("reports");
  
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

  // Helper function to filter data by time period
  const filterByTimePeriod = (data) => {
    const now = new Date();
    const filtered = data.filter(item => {
      const itemDate = getValidDate(item.createdAt);
      
      switch(timePeriod) {
        case 'daily':
          // Last 30 days
          const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
          return itemDate >= thirtyDaysAgo;
        case 'weekly': 
          // Last 12 weeks (84 days)
          const twelveWeeksAgo = new Date(now.getTime() - (84 * 24 * 60 * 60 * 1000));
          return itemDate >= twelveWeeksAgo;
        case 'monthly':
          // Last 12 months (365 days)
          const twelveMonthsAgo = new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000));
          return itemDate >= twelveMonthsAgo;
        case 'yearly':
          // Last 5 years
          const fiveYearsAgo = new Date(now.getTime() - (5 * 365 * 24 * 60 * 60 * 1000));
          return itemDate >= fiveYearsAgo;
        default:
          return true;
      }
    });
    
    return filtered;
  };
  
  // Fetch data with proper ordering
  const { data: users } = useFirestoreCollection("users", [orderBy("createdAt", "desc")]);
  const { data: reviews } = useFirestoreCollection("reviews", [orderBy("createdAt", "desc")]);
  const { data: bookings } = useFirestoreCollection("bookings", [orderBy("createdAt", "desc")]);
  const { data: reports } = useFirestoreCollection("reports", [orderBy("createdAt", "desc")]);
  
  // Apply time period filtering to all data
  const filteredUsers = filterByTimePeriod(users);
  const filteredReviews = filterByTimePeriod(reviews);
  const filteredBookings = filterByTimePeriod(bookings);
  const filteredReports = filterByTimePeriod(reports);
  
  // Real moderation statistics based on filtered data
  const flaggedReviews = filteredReviews.filter(review => 
    review.rating <= 2 || 
    (review.comment && review.comment.length < 10) ||
    (review.comment && /spam|fake|bot|test/i.test(review.comment))
  );
  
  const suspiciousUsers = filteredUsers.filter(user => 
    !user.email || 
    user.email.length < 5 || 
    !user.name || 
    user.name.length < 2 ||
    /test|fake|spam/i.test(user.name || '')
  );
  
  const problematicBookings = filteredBookings.filter(booking => 
    !booking.price || 
    parseFloat(booking.price) === 0 ||
    booking.status === 'cancelled' ||
    !booking.pickupLocation ||
    !booking.dropoffLocation
  );
  
  // Generate comprehensive report queue from multiple sources with time filtering
  const reportQueue = [
    // Direct reports from database
    ...filteredReports.map(report => ({
      id: report.id,
      type: report.reportType || report.type || 'Content Violation',
      category: report.category || 'General',
      description: report.reportReason || report.description || 'No description provided',
      reportedBy: report.reporterName || report.reportedBy || 'System',
      reportedUser: report.reportedUserName || null,
      reportedUserId: report.reportedUserId || null,
      reporterId: report.reporterId || null,
      evidenceFiles: report.evidenceFiles || [],
      priority: report.priority || 'Medium',
      date: getValidDate(report.createdAt || report.timestamp).toISOString(),
      status: report.status || 'pending',
      originalReport: report // Keep reference to original data
    })),
    // Flagged reviews
    ...flaggedReviews.map(review => ({
      id: `review-${review.id}`,
      type: 'Inappropriate Content',
      category: 'Review',
      description: `${review.rating <= 1 ? 'Very low rating' : 'Low rating'} review (${review.rating}/5 stars)${review.comment ? ': "' + review.comment.substring(0, 50) + '..."' : ''}`,
      reportedBy: 'System Detection',
      priority: review.rating <= 1 ? 'High' : 'Medium',
      date: getValidDate(review.createdAt).toISOString(),
      status: 'pending'
    })),
    // Suspicious users
    ...suspiciousUsers.slice(0, 5).map(user => ({
      id: `user-${user.id}`,
      type: 'Suspicious Account',
      category: 'User',
      description: `Account with incomplete or suspicious profile: ${user.name || 'No name'} (${user.email || 'No email'})`,
      reportedBy: 'System Validation',
      priority: 'Medium',
      date: getValidDate(user.createdAt).toISOString(),
      status: 'pending'
    })),
    // Problematic bookings
    ...problematicBookings.slice(0, 3).map(booking => ({
      id: `booking-${booking.id}`,
      type: 'Booking Issue',
      category: 'Transaction',
      description: `${booking.status === 'cancelled' ? 'Cancelled booking' : 'Incomplete booking data'} - ${booking.pickupLocation || 'Unknown pickup'} to ${booking.dropoffLocation || 'Unknown dropoff'}`,
      reportedBy: 'System Monitor',
      priority: booking.status === 'cancelled' ? 'Low' : 'Medium',
      date: getValidDate(booking.createdAt).toISOString(),
      status: 'pending'
    }))
  ].sort((a, b) => {
    // Sort by priority (High, Medium, Low) then by date
    const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
    const aPriority = priorityOrder[a.priority] || 0;
    const bPriority = priorityOrder[b.priority] || 0;
    
    if (aPriority !== bPriority) {
      return bPriority - aPriority;
    }
    
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  // Function to get time period display text
  const getTimePeriodText = () => {
    switch(timePeriod) {
      case 'daily': return 'Daily';
      case 'weekly': return 'Weekly'; 
      case 'monthly': return 'Monthly';
      case 'yearly': return 'Yearly';
      default: return 'Monthly';
    }
  };

  // Function to get time period description
  const getTimePeriodDescription = () => {
    switch(timePeriod) {
      case 'daily': return 'Last 30 days';
      case 'weekly': return 'Last 12 weeks';
      case 'monthly': return 'Last 12 months';
      case 'yearly': return 'Last 5 years';
      default: return 'Last 12 months';
    }
  };

  // Handle time period change
  const handleTimePeriodChange = (newPeriod) => {
    setTimePeriod(newPeriod);
    toast({
      title: `Time Period: ${newPeriod.charAt(0).toUpperCase() + newPeriod.slice(1)}`,
      description: `Showing moderation data for ${getTimePeriodDescription()}`,
    });
  };

  // Export Reports functionality
  const handleExportReports = () => {
    try {
      const reportsToExport = getDisplayedReports();

      // Prepare CSV data
      const csvHeaders = [
        'Report ID',
        'Type',
        'Category', 
        'Description',
        'Reported By',
        'Status',
        'Date Reported',
        'Action Taken'
      ];
      
      const csvData = reportsToExport.map(report => [
        report.id,
        report.type,
        report.category,
        report.description,
        report.reportedBy,
        report.status,
        new Date(report.date).toLocaleDateString('en-US'),
        'Pending' // Action status will be updated when actions are taken
      ]);

      // Create CSV content
      const csvContent = [
        csvHeaders.join(','),
        ...csvData.map(row => row.map(field => `"${field}"`).join(','))
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      
      const getFilterPrefix = () => {
        switch(filterType) {
          case 'pending': return 'pending-reports';
          case 'resolved': return 'resolved-reports';
          case 'priority': return 'priority-reports';
          default: return 'moderation-reports';
        }
      };
      
      link.setAttribute('download', `${getFilterPrefix()}-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export successful",
        description: `Exported ${reportsToExport.length} report records to CSV file`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export moderation data",
        variant: "destructive",
      });
    }
  };

  // Handle review action
  const handleReviewReport = (report) => {
    setSelectedReport(report);
    setShowReviewDialog(true);
  };

  // Handle take action
  const handleTakeAction = (report) => {
    setSelectedReport(report);
    setActionNotes("");
    setActionType("");
    setShowActionDialog(true);
  };

  // Execute moderation action
  const executeAction = async () => {
    if (!selectedReport || !actionType) return;
    
    try {
      console.log('Executing action:', { 
        reportId: selectedReport.id, 
        actionType, 
        actionNotes,
        settings: {
          suspensionDuration,
          warningLevel,
          contentType,
          banReason
        }
      });
      
      // Prepare action data with settings
      const actionData = {
        status: 'resolved',
        actionTaken: actionType,
        actionNotes: actionNotes,
        resolvedBy: 'admin',
        resolvedAt: new Date(),
        actionSettings: {
          suspensionDuration: actionType === 'user_suspended' ? suspensionDuration : null,
          warningLevel: actionType === 'warning_issued' ? warningLevel : null,
          contentType: actionType === 'content_removed' ? contentType : null,
          banReason: actionType === 'account_banned' ? banReason : null
        }
      };
      
      // Update the report status
      if (selectedReport.id.startsWith('review-') || selectedReport.id.startsWith('user-') || selectedReport.id.startsWith('booking-')) {
        // For system-generated reports, create a new record or update existing
        console.log('Creating new resolved report record for system-generated report');
        await addDocument({
          originalId: selectedReport.id,
          type: selectedReport.type,
          category: selectedReport.category,
          description: selectedReport.description,
          reportedBy: selectedReport.reportedBy,
          priority: selectedReport.priority,
          ...actionData,
          createdAt: new Date(selectedReport.date)
        });
      } else {
        // For direct reports from database, update the existing document
        console.log('Updating existing report in database:', selectedReport.id);
        await updateDocument(selectedReport.id, actionData);
      }

      toast({
        title: "Action completed",
        description: `Report has been resolved with action: ${actionType}`,
      });

      // Reset form and close dialogs
      setShowActionDialog(false);
      setShowReviewDialog(false);
      setSelectedReport(null);
      setActionType("");
      setActionNotes("");
      setSuspensionDuration("7");
      setWarningLevel("minor");
      setContentType("post");
      setBanReason("violation");
      
      // Force refresh of reports data
      console.log('Action completed successfully, data should refresh automatically via Firestore listener');
      
    } catch (error) {
      console.error('Action failed:', error);
      toast({
        title: "Action failed",
        description: `Failed to complete moderation action: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  // Filter reports based on current view and search term
  const getDisplayedReports = () => {
    let baseReports;
    
    // First filter by status
    if (statusFilter === 'pending') {
      baseReports = reportQueue.filter(r => r.status === 'pending' || !r.status);
    } else if (statusFilter === 'resolved') {
      baseReports = reportQueue.filter(r => r.status === 'resolved');
    } else {
      baseReports = reportQueue; // all statuses
    }
    
    // Then filter by type
    switch(filterType) {
      case 'pending':
        baseReports = baseReports.filter(r => r.status === 'pending' || !r.status);
        break;
      case 'resolved':
        baseReports = baseReports.filter(r => r.status === 'resolved');
        break;
      default:
        // baseReports already filtered by status above
        break;
    }

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return baseReports.filter(report => 
        report.title?.toLowerCase().includes(searchLower) ||
        report.description?.toLowerCase().includes(searchLower) ||
        report.reportType?.toLowerCase().includes(searchLower) ||
        report.reportedBy?.toLowerCase().includes(searchLower) ||
        report.targetId?.toLowerCase().includes(searchLower) ||
        report.category?.toLowerCase().includes(searchLower) ||
        report.notes?.toLowerCase().includes(searchLower)
      );
    }

    return baseReports;
  };

  const displayedReports = getDisplayedReports();

  // Get filter display info
  const getFilterInfo = () => {
    switch(filterType) {
      case 'pending': return { title: 'Pending Reports', description: 'Reports waiting for admin review and action' };
      case 'resolved': return { title: 'Resolved Reports', description: 'Reports that have been resolved' };
      case 'priority': return { title: 'Priority Reports', description: 'High and medium priority reports' };
      default: return { title: 'All Reports Queue', description: 'Review and moderate flagged content' };
    }
  };

  const filterInfo = getFilterInfo();

  return (
    <Layout title="Content Moderation">
      <div className="space-y-8">
        {/* Hero Section */}
        <Card className="bg-gradient-to-r from-green-500 via-green-600 to-green-700 text-white">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">Content Moderation 🛡️</h1>
                <p className="text-green-100">Review reports, reviews, and manage platform content</p>
              </div>
              <div className="flex items-center space-x-4">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="bg-white/20 text-white hover:bg-white/30"
                  onClick={handleExportReports}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Reports
                </Button>

                {/* Time Period Selector */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="secondary"
                      size="sm"
                      className="bg-white/20 text-white hover:bg-white/30"
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      {getTimePeriodText()}
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem 
                      onClick={() => handleTimePeriodChange('daily')}
                      className={timePeriod === 'daily' ? 'bg-gray-50' : ''}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Daily (Last 30 days)
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleTimePeriodChange('weekly')}
                      className={timePeriod === 'weekly' ? 'bg-gray-50' : ''}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Weekly (Last 12 weeks)
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleTimePeriodChange('monthly')}
                      className={timePeriod === 'monthly' ? 'bg-gray-50' : ''}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Monthly (Last 12 months)
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleTimePeriodChange('yearly')}
                      className={timePeriod === 'yearly' ? 'bg-gray-50' : ''}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Yearly (Last 5 years)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="secondary"
                      size="sm"
                      className="bg-white/20 text-white hover:bg-white/30"
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      {filterType === 'all' ? 'All Reports' : 
                       filterType === 'pending' ? 'View Pending' :
                       filterType === 'resolved' ? 'View Resolved' : 'All Reports'}
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem 
                      onClick={() => {
                        setFilterType('all');
                        toast({
                          title: "All Reports",
                          description: `Showing all ${reportQueue.length} reports for ${getTimePeriodDescription()}`
                        });
                      }}
                      className={filterType === 'all' ? 'bg-gray-50' : ''}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      All Reports
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => {
                        setFilterType('pending');
                        const pendingCount = reportQueue.filter(r => r.status === 'pending' || !r.status).length;
                        toast({
                          title: "Pending Reports",
                          description: `Showing ${pendingCount} pending reports for ${getTimePeriodDescription()}`
                        });
                      }}
                      className={filterType === 'pending' ? 'bg-gray-50' : ''}
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      View Pending
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => {
                        setFilterType('resolved');
                        const resolvedCount = reportQueue.filter(r => r.status === 'resolved').length;
                        toast({
                          title: "Resolved Reports",
                          description: `Showing ${resolvedCount} resolved reports for ${getTimePeriodDescription()}`
                        });
                      }}
                      className={filterType === 'resolved' ? 'bg-gray-50' : ''}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      View Resolved
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search and Filters */}
        <Card className="bg-white border border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Flag className="h-5 w-5 mr-2" />
                Moderation Directory
              </div>
              <div className="text-sm text-gray-600">
                {getTimePeriodDescription()}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by title, description, reporter, category, type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Type Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="pending">Pending Only</SelectItem>
                  <SelectItem value="resolved">Resolved Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
              <div className="text-center p-3 bg-white rounded-lg border-green-200 border">
                <div className="text-lg font-bold text-green-600">
                  {reportQueue.filter(r => r.status === 'pending' || !r.status).length}
                </div>
                <div className="text-xs text-green-600">Pending</div>
              </div>
              <div className="text-center p-3 bg-white rounded-lg border-green-200 border">
                <div className="text-lg font-bold text-green-600">
                  {reportQueue.filter(r => r.status === 'resolved').length}
                </div>
                <div className="text-xs text-green-600">Resolved</div>
              </div>
              <div className="text-center p-3 bg-white rounded-lg border-green-200 border">
                <div className="text-lg font-bold text-green-600">
                  {displayedReports.length}
                </div>
                <div className="text-xs text-green-600">Filtered Results</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reports Queue */}
        <Card className="bg-white border border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{filterInfo.title}</span>
              <Badge variant="outline">
                {displayedReports.length} {displayedReports.length === 1 ? 'Report' : 'Reports'}
              </Badge>
            </CardTitle>
            <p className="text-sm text-gray-600">
              {filterInfo.description}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {displayedReports.length > 0 ? (
              displayedReports.map((report, index) => (
                <div key={report.id} className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        report.priority === 'High' ? 'bg-red-100' : 
                        report.priority === 'Medium' ? 'bg-orange-100' : 'bg-yellow-100'
                      }`}>
                        {report.category === 'Review' ? (
                          <MessageSquare className={`h-6 w-6 ${
                            report.priority === 'High' ? 'text-red-600' : 
                            report.priority === 'Medium' ? 'text-orange-600' : 'text-yellow-600'
                          }`} />
                        ) : (
                          <AlertTriangle className={`h-6 w-6 ${
                            report.priority === 'High' ? 'text-red-600' : 
                            report.priority === 'Medium' ? 'text-orange-600' : 'text-yellow-600'
                          }`} />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{report.type}</h3>
                        <p className="text-gray-600 text-sm mt-1">
                          Reported by {report.reportedBy} • {new Date(report.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                        <p className="text-sm mt-2 text-gray-900">{report.description}</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge variant="outline" className="mt-2">
                            {report.category}
                          </Badge>
                          <Badge 
                            variant={report.status === 'pending' ? 'outline' : 'default'}
                            className="mt-2"
                          >
                            {report.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleReviewReport(report)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Review
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleTakeAction(report)}
                      >
                        <ShieldCheck className="h-4 w-4 mr-1" />
                        Take Action
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-gray-600">
                <ShieldCheck className="h-16 w-16 mx-auto mb-4" />
                <p className="text-lg font-medium">
                  {filterType === 'pending' && "No Pending Reports"}
                  {filterType === 'resolved' && "No Resolved Reports"}
                  {filterType === 'all' && "No Reports to Review"}
                </p>
                <p className="text-sm">
                  {filterType === 'pending' && "All reports have been reviewed"}
                  {filterType === 'resolved' && "No reports have been resolved yet"}
                  {filterType === 'all' && "All content is clean and compliant"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Review Dialog */}
        <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Review Report Details</DialogTitle>
            </DialogHeader>
            {selectedReport && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Report Type</label>
                    <div className="mt-1 p-3 bg-gray-50 rounded-md">
                      {selectedReport.type}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Category</label>
                    <div className="mt-1 p-3 bg-gray-50 rounded-md">
                      {selectedReport.category}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Reported By</label>
                    <div className="mt-1 p-3 bg-gray-50 rounded-md">
                      {selectedReport.reportedBy}
                    </div>
                  </div>
                  {selectedReport.reportedUser && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Reported User</label>
                      <div className="mt-1 p-3 bg-gray-50 rounded-md">
                        {selectedReport.reportedUser}
                      </div>
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Description</label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-md">
                    {selectedReport.description}
                  </div>
                </div>

                {selectedReport.evidenceFiles && selectedReport.evidenceFiles.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Evidence Files</label>
                    <div className="mt-1 p-3 bg-gray-50 rounded-md space-y-2">
                      {selectedReport.evidenceFiles.map((file, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <span className="text-sm text-blue-600 underline">{file}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Report Date</label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-md">
                    {new Date(selectedReport.date).toLocaleString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
                    Close
                  </Button>
                  <Button onClick={() => {
                    setShowReviewDialog(false);
                    handleTakeAction(selectedReport);
                  }}>
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    Take Action
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Take Action Dialog */}
        <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Take Moderation Action</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Action Type</label>
                <Select value={actionType} onValueChange={setActionType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select action to take" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="warning_issued">Issue Warning</SelectItem>
                    <SelectItem value="content_removed">Remove Content</SelectItem>
                    <SelectItem value="user_suspended">Suspend User</SelectItem>
                    <SelectItem value="account_banned">Ban Account</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Action-specific settings */}
              {actionType === 'warning_issued' && (
                <div>
                  <label className="text-sm font-medium">Warning Level</label>
                  <Select value={warningLevel} onValueChange={setWarningLevel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minor">Minor Warning</SelectItem>
                      <SelectItem value="major">Major Warning</SelectItem>
                      <SelectItem value="final">Final Warning</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {actionType === 'content_removed' && (
                <div>
                  <label className="text-sm font-medium">Content Type</label>
                  <Select value={contentType} onValueChange={setContentType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="post">Post/Comment</SelectItem>
                      <SelectItem value="profile">Profile Information</SelectItem>
                      <SelectItem value="media">Media/Images</SelectItem>
                      <SelectItem value="review">User Review</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {actionType === 'user_suspended' && (
                <div>
                  <label className="text-sm font-medium">Suspension Duration</label>
                  <Select value={suspensionDuration} onValueChange={setSuspensionDuration}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Day</SelectItem>
                      <SelectItem value="3">3 Days</SelectItem>
                      <SelectItem value="7">1 Week</SelectItem>
                      <SelectItem value="14">2 Weeks</SelectItem>
                      <SelectItem value="30">1 Month</SelectItem>
                      <SelectItem value="90">3 Months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {actionType === 'account_banned' && (
                <div>
                  <label className="text-sm font-medium">Ban Reason</label>
                  <Select value={banReason} onValueChange={setBanReason}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="violation">Terms of Service Violation</SelectItem>
                      <SelectItem value="harassment">Harassment/Abuse</SelectItem>
                      <SelectItem value="spam">Spam/Malicious Activity</SelectItem>
                      <SelectItem value="fraud">Fraud/Scam Activity</SelectItem>
                      <SelectItem value="repeated">Repeated Violations</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div>
                <label className="text-sm font-medium">Action Notes</label>
                <Textarea
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder="Add detailed notes about the action taken and reasoning..."
                  className="min-h-[100px]"
                />
              </div>
              
              <div className="flex space-x-2 pt-4">
                <Button 
                  onClick={executeAction} 
                  className="flex-1"
                  disabled={!actionType}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Execute Action
                </Button>
                <Button variant="outline" onClick={() => setShowActionDialog(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}