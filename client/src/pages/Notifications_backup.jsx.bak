import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import NotificationService, { useCampaigns } from "@/services/notificationService";
import { Bell, CheckCircle, XCircle, Calendar, User, Filter, Trash2, Send, Plus, Loader2 } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Notifications() {
  const [typeFilter, setTypeFilter] = useState("all");
  const [readFilter, setReadFilter] = useState("all");
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationType, setNotificationType] = useState(NotificationService.NotificationTypes.SYSTEM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSentId, setLastSentId] = useState(null); // Prevent duplicate sends
  const [expandedCampaigns, setExpandedCampaigns] = useState(new Set()); // Track expanded campaigns
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch all campaigns in real-time
  const { campaigns, loading, error } = useCampaigns();

  // Helper function to safely convert timestamps to Date objects
  const getValidDate = (timestamp) => {
    if (!timestamp) return new Date();
    
    if (timestamp && typeof timestamp === 'object') {
      if (timestamp.seconds) {
        return new Date(timestamp.seconds * 1000);
      }
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        return timestamp.toDate();
      }
    }
    
    if (typeof timestamp === 'string') {
      const date = new Date(timestamp);
      return isNaN(date.getTime()) ? new Date() : date;
    }
    
    if (timestamp instanceof Date) {
      return timestamp;
    }
    
    return new Date();
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case NotificationService.NotificationTypes.ANNOUNCEMENT:
        return "📢";
      case NotificationService.NotificationTypes.VERIFICATION_APPROVED:
        return "✅";
      case NotificationService.NotificationTypes.VERIFICATION_DENIED:
        return "❌";
      case NotificationService.NotificationTypes.BOOKING:
        return "📦";
      case NotificationService.NotificationTypes.CHAT:
        return "💬";
      default:
        return "🔔";
    }
  };

  const getNotificationTypeBadgeColor = (type) => {
    switch (type) {
      case NotificationService.NotificationTypes.ANNOUNCEMENT:
        return "bg-blue-100 text-blue-800 border-blue-300";
      case NotificationService.NotificationTypes.VERIFICATION_APPROVED:
        return "bg-green-100 text-green-800 border-green-300";
      case NotificationService.NotificationTypes.VERIFICATION_DENIED:
        return "bg-red-100 text-red-800 border-red-300";
      case NotificationService.NotificationTypes.BOOKING:
        return "bg-purple-100 text-purple-800 border-purple-300";
      case NotificationService.NotificationTypes.CHAT:
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      await NotificationService.deleteNotification(notificationId);
      toast({
        title: "Notification Deleted",
        description: "Notification has been successfully deleted.",
      });
    } catch (error) {
      console.error("Error deleting notification:", error);
      toast({
        title: "Error",
        description: "Failed to delete notification.",
        variant: "destructive",
      });
    }
  };

  const handleSendNotification = async () => {
    // Create a unique ID for this send operation
    const sendId = `${notificationTitle}-${notificationType}-${Date.now()}`;
    
    // Prevent double submission
    if (isSubmitting || lastSentId === sendId) {
      console.log("Preventing duplicate send:", { isSubmitting, lastSentId, sendId });
      return;
    }
    
    if (!notificationTitle.trim() || !notificationMessage.trim()) {
      toast({
        title: "Error",
        description: "Please fill in both title and message fields.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to send notifications.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setLastSentId(sendId);
    
    console.log("🚀 STARTING notification send:", { 
      title: notificationTitle, 
      type: notificationType, 
      sendId,
      timestamp: new Date().toISOString() 
    });

    try {
      const result = await NotificationService.sendNotificationToAllUsers(
        notificationTitle,
        notificationMessage,
        notificationType,
        { sentBy: user.id, sentByName: user.name || user.email, sendId }
      );

      console.log("✅ COMPLETED notification send:", { result, sendId });

      toast({
        title: "✅ Notifications Sent!",
        description: `Successfully sent ${result} notifications to all users.`,
      });

      setNotificationTitle("");
      setNotificationMessage("");
      setNotificationType(NotificationService.NotificationTypes.SYSTEM);
      setIsSendDialogOpen(false);
      
      // Reset the last sent ID after successful send
      setTimeout(() => setLastSentId(null), 2000);
    } catch (error) {
      console.error("❌ FAILED notification send:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send notifications. Please try again.",
        variant: "destructive",
      });
      setLastSentId(null); // Reset on error
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate stats
  const totalCampaigns = campaigns.length;
  const totalNotificationsSent = campaigns.reduce((sum, c) => sum + (c.actualSentCount || c.userBreakdown?.total || 0), 0);
  const announcementCampaigns = campaigns.filter(
    c => c.type === NotificationService.NotificationTypes.ANNOUNCEMENT
  ).length;
  const systemCampaigns = campaigns.filter(
    c => c.type === NotificationService.NotificationTypes.SYSTEM
  ).length;

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <Alert variant="destructive">
          <AlertDescription>
            Error loading data: {error.message}
          </AlertDescription>
        </Alert>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header Section - Matching User Management Style */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-lg mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2 flex items-center">
              <Bell className="w-6 h-6 mr-3" />
              Notification Management 🔔
            </h1>
            <p className="text-blue-100">Send notifications to all users and view notification logs</p>
          </div>
          <Dialog open={isSendDialogOpen} onOpenChange={setIsSendDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" variant="secondary" className="gap-2">
                <Send className="w-4 h-4" />
                Send Notification
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Send Notification to All Users</DialogTitle>
                <DialogDescription>
                  This notification will be sent to all registered users in the system.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Notification Type</Label>
                  <Select value={notificationType} onValueChange={setNotificationType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NotificationService.NotificationTypes.SYSTEM}>
                        🔔 System
                      </SelectItem>
                      <SelectItem value={NotificationService.NotificationTypes.ANNOUNCEMENT}>
                        📢 Message
                      </SelectItem>
                      <SelectItem value={NotificationService.NotificationTypes.BOOKING}>
                        📦 Booking
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="Enter notification title..."
                    value={notificationTitle}
                    onChange={(e) => setNotificationTitle(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    placeholder="Enter notification message..."
                    value={notificationMessage}
                    onChange={(e) => setNotificationMessage(e.target.value)}
                    rows={6}
                    disabled={isSubmitting}
                  />
                </div>
                <Alert>
                  <Bell className="h-4 w-4" />
                  <AlertDescription>
                    This notification will be sent to all registered users in the system.
                  </AlertDescription>
                </Alert>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsSendDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSendNotification}
                  disabled={isSubmitting}
                  className="gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Notification
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="space-y-6">
        {/* Stats Cards - Matching User Management Style */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100   rounded-lg border-blue-200 border">
            <div className="text-2xl font-bold text-blue-600 ">
              {totalCampaigns}
            </div>
            <div className="text-sm text-blue-600 ">Campaigns</div>
          </div>
          
          <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100   rounded-lg border-green-200 border">
            <div className="text-2xl font-bold text-green-600 ">
              {totalNotificationsSent}
            </div>
            <div className="text-sm text-green-600 ">Notifications Sent</div>
          </div>
          
          <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100   rounded-lg border-purple-200 border">
            <div className="text-2xl font-bold text-purple-600 ">
              {announcementCampaigns}
            </div>
            <div className="text-sm text-purple-600 ">Messages</div>
          </div>
          
          <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100   rounded-lg border-orange-200 border">
            <div className="text-2xl font-bold text-orange-600 ">
              {systemCampaigns}
            </div>
            <div className="text-sm text-orange-600 ">System</div>
          </div>
        </div>



        {/* Notification Campaigns List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="h-5 w-5 mr-2" />
              Notification Campaigns
            </CardTitle>
            <CardDescription>
              Each campaign represents one notification sent to multiple users. Click to see recipient details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {campaigns.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-600">No campaigns found</p>
                <p className="text-sm text-gray-600 mt-1">
                  Campaigns will appear here when you send notifications
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {campaigns.map((campaign) => {
                  const isExpanded = expandedCampaigns.has(campaign.id);
                  const toggleExpanded = () => {
                    const newExpanded = new Set(expandedCampaigns);
                    if (isExpanded) {
                      newExpanded.delete(campaign.id);
                    } else {
                      newExpanded.add(campaign.id);
                    }
                    setExpandedCampaigns(newExpanded);
                  };

                  return (
                    <div
                      key={campaign.id}
                      className="border border-gray-200  rounded-lg p-4 hover:bg-gray-50  transition-colors cursor-pointer bg-white "
                      onClick={toggleExpanded}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100  flex items-center justify-center">
                            <span className="text-lg">{getNotificationIcon(campaign.type)}</span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-base">
                                {campaign.title}
                              </h3>
                              <Badge 
                                variant="outline" 
                                className={`${getNotificationTypeBadgeColor(campaign.type)} text-xs`}
                              >
                                {campaign.type?.replace(/_/g, ' ')}
                              </Badge>
                              <Badge variant={campaign.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                                {campaign.status || 'unknown'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {campaign.actualSentCount || campaign.userBreakdown?.total || 0} recipients
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {getValidDate(campaign.createdAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                              {campaign.sentByName && (
                                <span>By: {campaign.sentByName}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={campaign.status === 'completed' ? 'default' : 'outline'} className="text-xs">
                            {campaign.status === 'completed' ? '✅ Delivered' : '🔄 Sending'}
                          </Badge>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            {isExpanded ? '🔽' : '▶️'}
                          </Button>
                        </div>
                      </div>

                      {/* Message Preview */}
                      {!isExpanded && (
                        <div className="mt-3 ml-13">
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {campaign.message}
                          </p>
                        </div>
                      )}

                          {/* Expanded Details */}
                          {isExpanded && campaign.userBreakdown && (
                            <div className="mt-4 p-4 bg-gray-50/50 rounded-lg">
                              <h4 className="font-semibold text-sm mb-3">👥 Recipient Breakdown:</h4>
                              <div className="grid grid-cols-3 gap-4 mb-4">
                                <div className="text-center">
                                  <div className="text-lg font-bold text-green-600">
                                    {campaign.userBreakdown.junkShops || 0}
                                  </div>
                                  <div className="text-xs text-gray-600">🏪 Junk Shops</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-lg font-bold text-orange-600">
                                    {campaign.userBreakdown.collectors || 0}
                                  </div>
                                  <div className="text-xs text-gray-600">🚚 Collectors</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-lg font-bold text-purple-600">
                                    {campaign.userBreakdown.residents || 0}
                                  </div>
                                  <div className="text-xs text-gray-600">� Residents</div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
