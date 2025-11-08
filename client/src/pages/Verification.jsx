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
import { CheckCircle, XCircle, Clock, ShieldCheck, Phone, Mail, Calendar, Building2, MapPin, FileText, Filter, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";





export default function Verification() {
  const [selectedVerification, setSelectedVerification] = useState(null);
  const [verificationNotes, setVerificationNotes] = useState("");
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
  // Try without orderBy first to see if data exists
  const { data: allVerifications = [], loading, error } = useFirestoreCollection("verifications");
  
  // Debug logging to see what's being fetched
  useEffect(() => {
    console.log('🔍 Verification Page - Debug Info:');
    console.log('  - allVerifications:', allVerifications);
    console.log('  - allVerifications.length:', allVerifications.length);
    console.log('  - loading:', loading);
    console.log('  - error:', error);
    
    // Log individual items with their shopName field
    if (allVerifications.length > 0) {
      console.log('  - First verification:', allVerifications[0]);
      allVerifications.forEach((v, index) => {
        console.log(`  - Verification ${index}:`, {
          id: v.id,
          shopName: v.shopName,
          businessName: v.businessName,
          name: v.name,
          junkshopName: v.junkshopName,
          status: v.status,
          allFields: Object.keys(v)
        });
      });
    }
  }, [allVerifications, loading, error]);
  
  // Map mobile app fields to admin web app expected fields
  const mappedVerifications = allVerifications.map(verification => ({
    ...verification,
    // Map submittedBy to userId for consistency with admin interface
    userId: verification.userId || verification.submittedBy,
    // Map submissionTimestamp to createdAt if createdAt is missing
    createdAt: verification.createdAt || verification.submissionTimestamp || verification.uploadedAt,
    // Ensure we have submission timestamp
    submissionTimestamp: verification.submissionTimestamp || verification.createdAt || verification.uploadedAt,
    // Map shop name from various possible fields
    shopName: verification.shopName || verification.businessName || verification.name || verification.junkshopName,
    // Map document fields properly
    documentType: verification.documentType || "PhilSys ID",
    documentURL: verification.documentURL || verification.documentUrl,
    // Ensure metadata structure
    metadata: {
      submissionTimestamp: verification.submissionTimestamp || verification.metadata?.submissionTimestamp || verification.uploadedAt,
      submittedBy: verification.submittedBy || verification.userId,
      ...verification.metadata
    }
  }))
  // Sort by status priority (pending first, then rejected, then approved)
  // Within each status group, sort by submission timestamp (newest first)
  .sort((a, b) => {
    // Define status priority: pending = 0, rejected = 1, approved = 2
    const getStatusPriority = (status) => {
      if (status === 'pending' || !status) return 0;
      if (status === 'rejected') return 1;
      if (status === 'approved') return 2;
      return 3; // any other status
    };
    
    const priorityA = getStatusPriority(a.status);
    const priorityB = getStatusPriority(b.status);
    
    // First sort by status priority
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    // If same status, sort by timestamp (newest first)
    const dateA = getValidDate(a.submissionTimestamp || a.createdAt);
    const dateB = getValidDate(b.submissionTimestamp || b.createdAt);
    return dateB.getTime() - dateA.getTime();
  });

  // Filter verifications by status and role - properly sync with database
  const junkshopVerifications = mappedVerifications;
  


  
  const pendingJunkshops = junkshopVerifications.filter(item => item.status === 'pending' || !item.status);
  const approvedJunkshops = junkshopVerifications.filter(item => item.status === 'approved');
  const rejectedJunkshops = junkshopVerifications.filter(item => item.status === 'rejected');

  // Firestore operations for direct updates
  const { updateDocument } = useFirestoreOperations('verifications');

  // Update verification status function - using enhanced verification service
  const handleVerification = async (verification, status) => {
    try {
      console.log('🔄 Starting verification status update:', {
        verificationId: verification.id,
        verificationDocumentId: verification.id, // Explicit log
        currentStatus: verification.status,
        newStatus: status,
        userId: verification.userId,
        submittedBy: verification.submittedBy,
        documentType: verification.documentType,
        fullVerificationObject: verification // Log full object to debug
      });

      // Validate that we have a verification ID
      if (!verification.id) {
        throw new Error('Verification ID is missing! Cannot update document.');
      }

      const options = {
        adminNotes: verificationNotes || `Verification ${status} by admin`
      };

      // Add rejection reason if rejecting
      if (status === VerificationStatuses.REJECTED) {
        options.rejectionReason = denialReason || verificationNotes || 'Rejected by admin';
      }

      console.log('📝 Update options:', options);
      console.log('🎯 Targeting verification document ID:', verification.id);

      // Update using the verification service - this updates the EXISTING document
      await VerificationService.updateVerificationStatus(
        verification.id, 
        status, 
        user?.uid || 'admin', // Use actual admin UID
        options
      );
      
      console.log('✅ Document updated successfully in Firebase. Document ID:', verification.id);
      
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
        description: `Verification document ${verification.id} successfully ${status === VerificationStatuses.APPROVED ? 'approved' : 'rejected'}! User has been notified.`,
        variant: status === VerificationStatuses.APPROVED ? "default" : "destructive",
      });
    } catch (error) {
      console.error('❌ Error updating verification:', error);
      console.error('Failed verification details:', {
        verificationId: verification?.id,
        status,
        error: error.message
      });
      toast({
        title: "Update Failed",
        description: `Failed to ${status} verification. Error: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  // Handle view documents

  return (
    <Layout title="Junk Shop Verification">
      <div className="space-y-8">
        {/* Hero Section */}
        <Card className="bg-green-600 text-white">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">
                  Junk Shop Verification
                </h1>
                <p className="text-green-100">
                  Review and verify junk shop document submissions
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Verification Results */}
        <Card className="bg-white border border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ShieldCheck className="h-5 w-5 text-green-600" />
              <span>All Verifications ({allVerifications.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-8 text-gray-600">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50 animate-spin" />
                  <p>Loading verifications...</p>
                </div>
              ) : error ? (
                <div className="text-center py-8 text-red-600">
                  <XCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-semibold">Error loading verifications</p>
                  <p className="text-sm">{error}</p>
                </div>
              ) : junkshopVerifications.length > 0 ? (
                junkshopVerifications.map((verification) => (
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
                          <h3 className="text-lg font-semibold">
                            {verification.shopName || verification.businessName || verification.name || verification.junkshopName || 'Junk Shop Verification'}
                          </h3>
                          <div className="flex items-center space-x-4 text-gray-600 text-sm mt-2">
                            <span className="flex items-center space-x-1">
                              <Calendar className="h-4 w-4" />
                              <span>Submitted: {verification.metadata?.submissionTimestamp 
                                ? getValidDate(verification.metadata.submissionTimestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                : verification.createdAt 
                                  ? getValidDate(verification.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                  : 'Recently'}</span>
                            </span>
                          </div>
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
                  <p>No verifications found</p>
                  <p className="text-sm">
                    Verification requests will appear here when submitted
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