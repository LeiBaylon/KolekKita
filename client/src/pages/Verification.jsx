import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFirestoreCollection, useFirestoreOperations } from "@/hooks/useFirestore";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { orderBy } from "firebase/firestore";
import VerificationService, { useVerifications } from "@/services/verificationService";
import NotificationService from "@/services/notificationService";
import { VerificationStatuses, DocumentTypes } from "@shared/schema";
import { CheckCircle, XCircle, Clock, ShieldCheck, Phone, Mail, Calendar, Building2, MapPin, FileText, Filter, Download, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";





export default function Verification() {
  const [selectedVerification, setSelectedVerification] = useState(null);
  const [verificationNotes, setVerificationNotes] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isDenyDialogOpen, setIsDenyDialogOpen] = useState(false);
  const [denialReason, setDenialReason] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();

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

  // Fetch verifications with proper ordering using enhanced hook
  const { data: allVerifications = [], loading, error } = useFirestoreCollection("verifications", [orderBy("createdAt", "desc")]);
  
  // Map mobile app fields to admin web app expected fields
  const mappedVerifications = allVerifications.map(verification => ({
    ...verification,
    // Map submittedBy to userId for consistency with admin interface
    userId: verification.userId || verification.submittedBy,
    // Map submissionTimestamp to createdAt if createdAt is missing
    createdAt: verification.createdAt || verification.submissionTimestamp,
    // Ensure metadata structure
    metadata: {
      submissionTimestamp: verification.submissionTimestamp || verification.metadata?.submissionTimestamp,
      ...verification.metadata
    }
  }));

  // Filter verifications by status and role - properly sync with database
  const junkshopVerifications = mappedVerifications;
  

  
  const pendingJunkshops = junkshopVerifications.filter(item => item.status === 'pending' || !item.status);
  const approvedJunkshops = junkshopVerifications.filter(item => item.status === 'approved');
  const rejectedJunkshops = junkshopVerifications.filter(item => item.status === 'rejected');
  const underReviewJunkshops = junkshopVerifications.filter(item => item.status === 'under_review');

  // Firestore operations for direct updates
  const { updateDocument } = useFirestoreOperations('verifications');

  // Update verification status function - using enhanced verification service
  const handleVerification = async (verification, status) => {
    try {
      console.log('🔄 Starting verification status update:', {
        verificationId: verification.id,
        currentStatus: verification.status,
        newStatus: status,
        userId: verification.userId,
        documentType: verification.documentType
      });

      const options = {
        adminNotes: verificationNotes || `Verification ${status} by admin`
      };

      // Add rejection reason if rejecting
      if (status === VerificationStatuses.REJECTED) {
        options.rejectionReason = denialReason || verificationNotes || 'Rejected by admin';
      }

      // Update using the verification service
      await VerificationService.updateVerificationStatus(
        verification.id, 
        status, 
        user?.uid || 'admin', // Use actual admin UID
        options
      );
      
      // Send notification based on status
      if (status === VerificationStatuses.APPROVED) {
        console.log('📤 Sending approval notification to user:', verification.userId);
        await NotificationService.sendVerificationApprovedNotification(
          verification.userId,
          verification.id,
          verification.shopName || null
        );
        console.log('✅ Approval notification sent successfully');
      } else if (status === VerificationStatuses.REJECTED) {
        console.log('📤 Sending rejection notification to user:', verification.userId);
        await NotificationService.sendVerificationDeniedNotification(
          verification.userId,
          verification.id,
          options.rejectionReason,
          verification.shopName || null
        );
        console.log('✅ Rejection notification sent successfully');
      }
      
      console.log('🎉 Verification process completed successfully!');
      
      setSelectedVerification(null);
      setVerificationNotes("");
      setDenialReason("");
      setIsApproveDialogOpen(false);
      setIsDenyDialogOpen(false);
      
      // Show success toast
      toast({
        title: "✅ Verification Updated",
        description: `Verification successfully ${status === VerificationStatuses.APPROVED ? 'approved' : 'rejected'}! User has been notified.`,
        variant: status === VerificationStatuses.APPROVED ? "default" : "destructive",
      });
    } catch (error) {
      console.error('Error updating verification:', error);
      toast({
        title: "Update Failed",
        description: `Failed to ${status} verification. Please try again.`,
        variant: "destructive",
      });
    }
  };

  // Export Reports functionality
  const handleExportReports = () => {
    try {
      // Get filtered verifications based on current status filter
      let verificationsToExport = junkshopVerifications;
      
      if (statusFilter === 'pending') {
        verificationsToExport = pendingJunkshops;
      } else if (statusFilter === 'approved') {
        verificationsToExport = approvedJunkshops;
      } else if (statusFilter === 'rejected') {
        verificationsToExport = rejectedJunkshops;
      }

      // Prepare CSV data
      const csvHeaders = [
        'Verification ID', 
        'User ID', 
        'Document Type', 
        'Status', 
        'User Role',
        'Submission Date', 
        'Reviewed By', 
        'Review Date',
        'Rejection Reason',
        'Admin Notes'
      ];
      
      const csvData = verificationsToExport.map(verification => [
        verification.id || 'N/A',
        verification.userId || 'N/A',
        verification.documentType || 'N/A',
        verification.status || 'pending',
        verification.userRole || 'N/A',
        verification.metadata?.submissionTimestamp 
          ? getValidDate(verification.metadata.submissionTimestamp).toLocaleDateString('en-US')
          : verification.createdAt 
            ? getValidDate(verification.createdAt).toLocaleDateString('en-US')
            : 'N/A',
        verification.reviewedBy || 'N/A',
        verification.reviewedAt ? getValidDate(verification.reviewedAt).toLocaleDateString('en-US') : 'N/A',
        verification.rejectionReason || 'N/A',
        verification.adminNotes || 'N/A'
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
      
      const filterSuffix = statusFilter === 'all' ? 'all' : statusFilter;
      link.setAttribute('download', `junkshop-verifications-${filterSuffix}-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export successful",
        description: `Exported ${verificationsToExport.length} verification records to CSV file`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export verification data",
        variant: "destructive",
      });
    }
  };

  // Get filtered verifications based on status filter and search term
  const getFilteredVerifications = () => {
    let baseVerifications;
    switch (statusFilter) {
      case 'pending':
        baseVerifications = pendingJunkshops;
        break;
      case 'approved':
        baseVerifications = approvedJunkshops;
        break;
      case 'rejected':
        baseVerifications = rejectedJunkshops;
        break;
      case 'all':
      default:
        baseVerifications = junkshopVerifications;
        break;
    }

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return baseVerifications.filter(verification => 
        verification.shopName?.toLowerCase().includes(searchLower) ||
        verification.businessLicense?.toLowerCase().includes(searchLower) ||
        verification.address?.toLowerCase().includes(searchLower) ||
        verification.phoneNumber?.toLowerCase().includes(searchLower) ||
        verification.userRole?.toLowerCase().includes(searchLower) ||
        verification.documentType?.toLowerCase().includes(searchLower) ||
        verification.userId?.toLowerCase().includes(searchLower) ||
        verification.rejectionReason?.toLowerCase().includes(searchLower)
      );
    }

    return baseVerifications;
  };

  const filteredVerifications = getFilteredVerifications();



  return (
    <Layout title="Junk Shop Verification">
      <div className="space-y-8">
        {/* Hero Section */}
        <Card className="bg-gradient-to-r from-green-500 via-green-600 to-green-700 text-white">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">
                  Junk Shop Verification 🏪
                </h1>
                <p className="text-green-100">
                  Review and verify junk shop document submissions
                </p>
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
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48 bg-white/20 text-white border-white/30">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Verifications ({allVerifications.length})</SelectItem>
                    <SelectItem value="pending">Pending ({pendingJunkshops.length})</SelectItem>
                    <SelectItem value="approved">Approved ({approvedJunkshops.length})</SelectItem>
                    <SelectItem value="rejected">Rejected ({rejectedJunkshops.length})</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search and Filters */}
        <Card className="bg-white border border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center">
              <ShieldCheck className="h-5 w-5 mr-2" />
              Verification Directory
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by shop name, license, address, phone, user ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Verifications</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Verification Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
              <div className="text-center p-4 bg-white rounded-lg border-green-200 border">
                <div className="text-2xl font-bold text-green-600">
                  {allVerifications.length}
                </div>
                <div className="text-sm text-green-600">Total</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg border-yellow-200 border">
                <div className="text-2xl font-bold text-yellow-600">
                  {pendingJunkshops.length}
                </div>
                <div className="text-sm text-yellow-600">Pending</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg border-green-200 border">
                <div className="text-2xl font-bold text-green-600">
                  {approvedJunkshops.length}
                </div>
                <div className="text-sm text-green-600">Approved</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg border-red-200 border">
                <div className="text-2xl font-bold text-red-600">
                  {rejectedJunkshops.length}
                </div>
                <div className="text-sm text-red-600">Rejected</div>
              </div>
            </div>
          </CardContent>
        </Card>




        {/* Verification Results */}
        <Card className="bg-white border border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {statusFilter === 'pending' && <Clock className="h-5 w-5 text-yellow-600" />}
              {statusFilter === 'approved' && <CheckCircle className="h-5 w-5 text-green-600" />}
              {statusFilter === 'rejected' && <XCircle className="h-5 w-5 text-red-600" />}
              {statusFilter === 'all' && <Filter className="h-5 w-5 text-blue-600" />}
              <span>
                {statusFilter === 'all' && `All Verifications (${allVerifications.length}/${filteredVerifications.length})`}
                {statusFilter === 'pending' && `Pending Verifications (${filteredVerifications.length})`}
                {statusFilter === 'approved' && `Approved Verifications (${filteredVerifications.length})`}
                {statusFilter === 'rejected' && `Rejected Verifications (${filteredVerifications.length})`}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredVerifications.length > 0 ? (
                filteredVerifications.map((verification) => (
                  <div 
                    key={verification.id} 
                    className={`rounded-lg p-6 ${
                      verification.status === 'approved' ? 'bg-green-50 border border-green-200' :
                      verification.status === 'rejected' ? 'bg-red-50 border border-red-200' :
                      'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          verification.status === 'approved' ? 'bg-green-100' :
                          verification.status === 'rejected' ? 'bg-red-100' :
                          'bg-blue-100'
                        }`}>
                          {verification.status === 'approved' ? (
                            <CheckCircle className="h-6 w-6 text-green-600" />
                          ) : verification.status === 'rejected' ? (
                            <XCircle className="h-6 w-6 text-red-600" />
                          ) : (
                            <FileText className="h-6 w-6 text-blue-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold">Junk Shop Verification</h3>
                          <p className="text-sm text-gray-600">Document: {verification.documentType || 'Unknown Document'}</p>
                          <div className="flex items-center space-x-4 text-gray-600 text-sm mt-2">
                            <span className="flex items-center space-x-1">
                              <Building2 className="h-4 w-4" />
                              <span>User ID: {verification.userId}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Calendar className="h-4 w-4" />
                              <span>Submitted: {verification.metadata?.submissionTimestamp 
                                ? getValidDate(verification.metadata.submissionTimestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                : verification.createdAt 
                                  ? getValidDate(verification.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                  : 'Recently'}</span>
                            </span>
                          </div>
                          <div className="flex items-center space-x-4 text-gray-600 text-sm mt-1">
                            <span className="flex items-center space-x-1">
                              <FileText className="h-4 w-4" />
                              <span>Type: {verification.documentType}</span>
                            </span>
                            {verification.documentURL && (
                              <span className="flex items-center space-x-1">
                                <FileText className="h-4 w-4" />
                                <span>Document Available</span>
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 mt-3">
                            <Badge variant="secondary">Junk Shop</Badge>
                            <Badge variant="outline" className={
                              verification.status === 'approved' ? 'bg-green-100 text-green-800' :
                              verification.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }>
                              {verification.status === 'pending' || !verification.status ? 'Pending Review' : 
                               verification.status === 'under_review' ? 'Under Review' : 
                               verification.status.charAt(0).toUpperCase() + verification.status.slice(1)}
                            </Badge>
                            {verification.documentType && (
                              <Badge variant="outline">{verification.documentType.replace('_', ' ')}</Badge>
                            )}
                          </div>
                          {verification.rejectionReason && (
                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                              <strong>Rejection Reason:</strong> {verification.rejectionReason}
                            </div>
                          )}
                          {verification.adminNotes && verification.adminNotes !== verification.rejectionReason && (
                            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
                              <strong>Admin Notes:</strong> {verification.adminNotes}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        {(verification.status === 'pending' || !verification.status) && (
                          <>
                            <Button 
                              size="sm" 
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => {
                                setSelectedVerification(verification);
                                setIsApproveDialogOpen(true);
                              }}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => {
                                setSelectedVerification(verification);
                                setIsDenyDialogOpen(true);
                              }}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Deny
                            </Button>
                          </>
                        )}
                        {verification.status === 'approved' && (
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => {
                              setSelectedVerification(verification);
                              setIsDenyDialogOpen(true);
                            }}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Revoke Approval
                          </Button>
                        )}
                        {verification.status === 'rejected' && (
                          <Button 
                            size="sm" 
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => {
                              setSelectedVerification(verification);
                              setIsApproveDialogOpen(true);
                            }}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve Now
                          </Button>
                        )}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setSelectedVerification(verification)}>
                              <ShieldCheck className="h-4 w-4 mr-1" />
                              Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Verification Details</DialogTitle>
                            </DialogHeader>
                            {selectedVerification && (
                              <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="text-sm font-medium text-gray-600">Document Type</label>
                                    <div className="mt-1 p-3 bg-gray-50 rounded-md">
                                      {selectedVerification.documentType || 'Unknown Document'}
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-gray-600">User ID</label>
                                    <div className="mt-1 p-3 bg-gray-50 rounded-md">
                                      {selectedVerification.userId || 'Unknown User'}
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-gray-600">Status</label>
                                    <div className="mt-1 p-3 bg-gray-50 rounded-md">
                                      {selectedVerification.status || 'Pending'}
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-gray-600">User Role</label>
                                    <div className="mt-1 p-3 bg-gray-50 rounded-md">
                                      {selectedVerification.userRole || 'Unknown'}
                                    </div>
                                  </div>
                                </div>
                                {selectedVerification.documentURL && (
                                  <div>
                                    <label className="text-sm font-medium text-gray-600">Document</label>
                                    <div className="mt-1 p-3 bg-gray-50 rounded-md">
                                      <a href={selectedVerification.documentURL} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                        View Document
                                      </a>
                                    </div>
                                  </div>
                                )}
                                <div>
                                  <label className="text-sm font-medium text-gray-600 mb-2 block">Verification Notes</label>
                                  <Textarea
                                    placeholder="Add notes about this verification..."
                                    value={verificationNotes}
                                    onChange={(e) => setVerificationNotes(e.target.value)}
                                    className="min-h-[100px]"
                                  />
                                </div>
                                <div className="flex space-x-2 justify-end">
                                  {(selectedVerification.status === 'pending' || !selectedVerification.status) && (
                                    <>
                                      <Button 
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                        onClick={() => {
                                          setIsApproveDialogOpen(true);
                                        }}
                                      >
                                        <CheckCircle className="h-4 w-4 mr-1" />
                                        Approve
                                      </Button>
                                      <Button 
                                        variant="destructive"
                                        onClick={() => {
                                          setIsDenyDialogOpen(true);
                                        }}
                                      >
                                        <XCircle className="h-4 w-4 mr-1" />
                                        Deny
                                      </Button>
                                    </>
                                  )}
                                  {selectedVerification.status === 'approved' && (
                                    <Button 
                                      variant="destructive"
                                      onClick={() => {
                                        setIsDenyDialogOpen(true);
                                      }}
                                    >
                                      <XCircle className="h-4 w-4 mr-1" />
                                      Revoke Approval
                                    </Button>
                                  )}
                                  {selectedVerification.status === 'rejected' && (
                                    <Button 
                                      className="bg-green-600 hover:bg-green-700 text-white"
                                      onClick={() => {
                                        setIsApproveDialogOpen(true);
                                      }}
                                    >
                                      <CheckCircle className="h-4 w-4 mr-1" />
                                      Approve Now
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-600">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No {statusFilter === 'all' ? '' : statusFilter} verifications found</p>
                  <p className="text-sm">
                    {statusFilter === 'all' 
                      ? 'Verification requests will appear here when submitted' 
                      : `No ${statusFilter} verifications at this time`
                    }
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Approve Verification Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>✅ Approve Verification</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this verification? The user will be notified.
            </DialogDescription>
          </DialogHeader>
          {selectedVerification && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-gray-50 rounded-md space-y-2">
                <p className="font-medium">{selectedVerification.shopName || 'Junk Shop'}</p>
                <p className="text-sm text-gray-600">User ID: {selectedVerification.userId}</p>
                <p className="text-sm text-gray-600">
                  Document: {selectedVerification.documentType?.replace('_', ' ')}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="approve-notes">Admin Notes (Optional)</Label>
                <Textarea
                  id="approve-notes"
                  placeholder="Add any notes about this approval..."
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsApproveDialogOpen(false);
                setVerificationNotes("");
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => {
                if (selectedVerification) {
                  handleVerification(selectedVerification, VerificationStatuses.APPROVED);
                }
              }}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve & Notify User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deny Verification Dialog */}
      <Dialog open={isDenyDialogOpen} onOpenChange={setIsDenyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>❌ Deny Verification</DialogTitle>
            <DialogDescription>
              Please provide a reason for denying this verification. The user will be notified with instructions on how to fix the issues.
            </DialogDescription>
          </DialogHeader>
          {selectedVerification && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-gray-50 rounded-md space-y-2">
                <p className="font-medium">{selectedVerification.shopName || 'Junk Shop'}</p>
                <p className="text-sm text-gray-600">User ID: {selectedVerification.userId}</p>
                <p className="text-sm text-gray-600">
                  Document: {selectedVerification.documentType?.replace('_', ' ')}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="denial-reason">Reason for Denial *</Label>
                <Textarea
                  id="denial-reason"
                  placeholder="Please explain why this verification is being denied and what needs to be fixed..."
                  value={denialReason}
                  onChange={(e) => setDenialReason(e.target.value)}
                  rows={4}
                  required
                />
                <p className="text-xs text-gray-600">
                  This reason will be sent to the user in a notification.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="deny-notes">Additional Admin Notes (Optional)</Label>
                <Textarea
                  id="deny-notes"
                  placeholder="Add any internal notes..."
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDenyDialogOpen(false);
                setDenialReason("");
                setVerificationNotes("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedVerification && denialReason.trim()) {
                  handleVerification(selectedVerification, VerificationStatuses.REJECTED);
                } else {
                  toast({
                    title: "Missing Information",
                    description: "Please provide a reason for denial.",
                    variant: "destructive",
                  });
                }
              }}
              disabled={!denialReason.trim()}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Deny & Notify User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </Layout>
  );
}