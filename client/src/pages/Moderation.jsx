import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useFirestoreCollection, useFirestoreOperations } from "@/hooks/useFirestore";
import { useToast } from "@/hooks/use-toast";
import { orderBy } from "firebase/firestore";
import { AlertTriangle, Flag, MessageSquare, ShieldCheck, Eye, CheckCircle, XCircle, Clock } from "lucide-react";


export default function Moderation() {
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [actionNotes, setActionNotes] = useState("");
  const [actionType, setActionType] = useState("");
  
  // Action-specific settings
  const [suspensionDuration, setSuspensionDuration] = useState("7");
  const [warningLevel, setWarningLevel] = useState("minor");
  const [contentType, setContentType] = useState("profile");
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

  // Fetch data with proper ordering
  const { data: users } = useFirestoreCollection("users", [orderBy("createdAt", "desc")]);
  const { data: reviews } = useFirestoreCollection("reviews", [orderBy("createdAt", "desc")]);
  const { data: bookings } = useFirestoreCollection("bookings", [orderBy("createdAt", "desc")]);
  const { data: reports } = useFirestoreCollection("reports", [orderBy("createdAt", "desc")]);
  
  // Real moderation statistics based on data
  const flaggedReviews = reviews.filter(review => 
    review.rating <= 2 || 
    (review.comment && review.comment.length < 10) ||
    (review.comment && /spam|fake|bot|test/i.test(review.comment))
  );
  
  const suspiciousUsers = users.filter(user => 
    !user.email || 
    user.email.length < 5 || 
    !user.name || 
    user.name.length < 2 ||
    /test|fake|spam/i.test(user.name || '')
  );
  
  const problematicBookings = bookings.filter(booking => 
    !booking.price || 
    parseFloat(booking.price) === 0 ||
    booking.status === 'cancelled' ||
    !booking.pickupLocation ||
    !booking.dropoffLocation
  );
  
  // Generate comprehensive report queue from multiple sources
  const reportQueue = [
    // Direct reports from database
    ...reports.map(report => ({
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
    // First sort by status: pending reports come first
    const aStatus = a.status === 'pending' || !a.status ? 0 : 1;
    const bStatus = b.status === 'pending' || !b.status ? 0 : 1;
    
    if (aStatus !== bStatus) {
      return aStatus - bStatus;
    }
    
    // Within same status, sort by date (newest first)
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

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
      setContentType("profile");
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

  return (
    <Layout title="Content Moderation">
      <div className="space-y-6">
        {/* Hero Section */}
        <Card className="bg-green-600 text-white">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">Content Moderation</h1>
                <p className="text-green-100">Review reports, reviews, and manage platform content</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reports Queue */}
        <Card className="bg-white">
          <CardContent className="space-y-4">
            {reportQueue.length > 0 ? (
              reportQueue.map((report, index) => (
                <div key={report.id} className="bg-white rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        report.priority === 'High' ? 'bg-red-100' : 
                        report.priority === 'Medium' ? 'bg-orange-100' : 'bg-yellow-100'
                      }`}>
                        {report.category === 'Review' ? (
                          <MessageSquare className={`h-5 w-5 ${
                            report.priority === 'High' ? 'text-red-600' : 
                            report.priority === 'Medium' ? 'text-orange-600' : 'text-yellow-600'
                          }`} />
                        ) : (
                          <AlertTriangle className={`h-5 w-5 ${
                            report.priority === 'High' ? 'text-red-600' : 
                            report.priority === 'Medium' ? 'text-orange-600' : 'text-yellow-600'
                          }`} />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{report.type}</h3>
                        <p className="text-gray-600 text-sm">
                          Reported by {report.reportedBy} • {new Date(report.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                        <p className="text-sm text-gray-700 line-clamp-1">{report.description}</p>
                        <div className="flex items-center mt-1">
                          <Badge 
                            variant={report.status === 'pending' ? 'outline' : 'default'}
                            className="text-xs"
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
                  No Reports to Review
                </p>
                <p className="text-sm">
                  All content is clean and compliant
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
                    <div className="mt-1 p-3">
                      {selectedReport.type}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Category</label>
                    <div className="mt-1 p-3">
                      {selectedReport.category}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Reported By</label>
                    <div className="mt-1 p-3">
                      {selectedReport.reportedBy}
                    </div>
                  </div>
                  {selectedReport.reportedUser && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Reported User</label>
                      <div className="mt-1 p-3">
                        {selectedReport.reportedUser}
                      </div>
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Description</label>
                  <div className="mt-1 p-3">
                    {selectedReport.description}
                  </div>
                </div>

                {selectedReport.evidenceFiles && selectedReport.evidenceFiles.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Evidence Files</label>
                    <div className="mt-1 p-3 space-y-2">
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
                  <div className="mt-1 p-3">
                    {new Date(selectedReport.date).toLocaleString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
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