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
import { Bell, CheckCircle, XCircle, Calendar, User, Filter, Trash2, Send, Plus, Loader2, Search, Download, MoreVertical } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Notifications() {
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
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
    
    return new Date(timestamp);
  };

  // Helper function to get notification icon
  const getNotificationIcon = (type) => {
    const icons = {
      system: "⚙️",
      promotional: "📢",
      update: "🔄",
      reminder: "⏰",
      announcement: "📢",
      alert: "🚨",
      booking: "📅",
      transaction: "💰",
      verification: "✅"
    };
    return icons[type?.toLowerCase()] || "🔔";
  };

  // Helper function to get badge color based on type
  const getNotificationTypeStyles = (type) => {
    const styles = {
      system: "border-blue-200 text-blue-600 bg-blue-50",
      promotional: "border-green-200 text-green-600 bg-green-50",
      update: "border-purple-200 text-purple-600 bg-purple-50",
      reminder: "border-yellow-200 text-yellow-600 bg-yellow-50",
      announcement: "border-orange-200 text-orange-600 bg-orange-50",
      alert: "border-red-200 text-red-600 bg-red-50",
      booking: "border-indigo-200 text-indigo-600 bg-indigo-50",
    };
    return styles[type] || styles.system;
  };

  const getNotificationTypeBadgeColor = (type) => {
    const colors = {
      system: "bg-blue-100 text-blue-800 border-blue-300",
      promotional: "bg-green-100 text-green-800 border-green-300",
      update: "bg-purple-100 text-purple-800 border-purple-300",
      reminder: "bg-yellow-100 text-yellow-800 border-yellow-300",
      announcement: "bg-orange-100 text-orange-800 border-orange-300",
      alert: "bg-red-100 text-red-800 border-red-300",
      booking: "bg-indigo-100 text-indigo-800 border-indigo-300",
    };
    return colors[type] || colors.system;
  };

  // Filter campaigns
  const filteredCampaigns = campaigns?.filter(campaign => {
    // Filter by type
    if (typeFilter !== 'all' && campaign.type !== typeFilter) return false;
    
    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        campaign.title?.toLowerCase().includes(searchLower) ||
        campaign.message?.toLowerCase().includes(searchLower) ||
        campaign.type?.toLowerCase().includes(searchLower) ||
        campaign.sentByName?.toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  }) || [];

  // Calculate statistics
  const totalCampaigns = campaigns?.length || 0;
  const totalSent = campaigns?.reduce((sum, c) => sum + (c.actualSentCount || c.userBreakdown?.total || 0), 0) || 0;
  const totalJunkShops = campaigns?.reduce((sum, c) => sum + (c.userBreakdown?.junkShops || 0), 0) || 0;
  const totalCollectors = campaigns?.reduce((sum, c) => sum + (c.userBreakdown?.collectors || 0), 0) || 0;
  const totalResidents = campaigns?.reduce((sum, c) => sum + (c.userBreakdown?.residents || 0), 0) || 0;

  // Handle sending notification
  const handleSendNotification = async () => {
    if (!notificationTitle.trim() || !notificationMessage.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in both title and message",
        variant: "destructive"
      });
      return;
    }

    // Generate a unique ID for this send operation
    const operationId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Prevent duplicate sends
    if (lastSentId === operationId) {
      console.log("⚠️ Duplicate send prevented for operation:", operationId);
      return;
    }

    setIsSubmitting(true);
    setLastSentId(operationId);

    try {
      console.log("📤 Sending notification with operation ID:", operationId);
      
      const result = await NotificationService.sendNotificationToAllUsers(
        notificationTitle.trim(),
        notificationMessage.trim(),
        notificationType,
        {
          sentBy: user?.uid || 'anonymous',
          sentByName: user?.displayName || user?.email || 'Anonymous User',
          operationId
        }
      );

      if (result.success) {
        toast({
          title: "Notification Sent!",
          description: `Successfully sent to ${result.sentCount} users`,
        });
        
        // Reset form
        setNotificationTitle("");
        setNotificationMessage("");
        setNotificationType(NotificationService.NotificationTypes.SYSTEM);
        setIsSendDialogOpen(false);
      } else {
        throw new Error(result.error || 'Failed to send notification');
      }
    } catch (error) {
      console.error("❌ Error sending notification:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send notification",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout title="Notifications">
      <div className="space-y-6">
        {/* Header */}
        <Card className="bg-green-600 text-white">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2 text-white">
                  Notifications 🔔
                </h1>
                <p className="text-green-100">
                  Manage and send notifications to users
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <Dialog open={isSendDialogOpen} onOpenChange={setIsSendDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="bg-white/20 text-white hover:bg-white/30"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Send Notification
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Send New Notification</DialogTitle>
                      <DialogDescription>
                        Send a notification to all users in the system
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="title">Title</Label>
                        <Input
                          id="title"
                          value={notificationTitle}
                          onChange={(e) => setNotificationTitle(e.target.value)}
                          placeholder="Enter notification title"
                        />
                      </div>
                      <div>
                        <Label htmlFor="type">Type</Label>
                        <Select value={notificationType} onValueChange={setNotificationType}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(NotificationService.NotificationTypes).map(([key, value]) => (
                              <SelectItem key={value} value={value}>
                                {getNotificationIcon(value)} {key.charAt(0) + key.slice(1).toLowerCase().replace(/_/g, ' ')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="message">Message</Label>
                        <Textarea
                          id="message"
                          value={notificationMessage}
                          onChange={(e) => setNotificationMessage(e.target.value)}
                          placeholder="Enter your notification message here..."
                          className="min-h-[100px]"
                        />
                      </div>
                    </div>
                    <DialogFooter className="gap-2">
                      <Button variant="outline" onClick={() => setIsSendDialogOpen(false)} disabled={isSubmitting}>
                        Cancel
                      </Button>
                      <Button onClick={handleSendNotification} disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            Send Notification
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters and Search */}
        <Card className="bg-white border border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="h-5 w-5 mr-2" />
              Notification Directory
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search notifications by title, message, type, or sender..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.values(NotificationService.NotificationTypes).map((type) => (
                    <SelectItem key={type} value={type}>
                      {getNotificationIcon(type)} {type.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error && (
              <div className="text-red-500 text-sm">
                Error loading campaigns: {error}
              </div>
            )}

            {/* Notification Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
              <div className="text-center p-4 bg-white rounded-lg border-green-200 border">
                <div className="text-2xl font-bold text-green-600">
                  {totalCampaigns}
                </div>
                <div className="text-sm text-green-600">Total Campaigns</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg border-green-200 border">
                <div className="text-2xl font-bold text-green-600">
                  {totalSent}
                </div>
                <div className="text-sm text-green-600">Total Recipients</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg border-green-200 border">
                <div className="text-2xl font-bold text-green-600">
                  {totalJunkShops}
                </div>
                <div className="text-sm text-green-600">Junk Shops</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg border-green-200 border">
                <div className="text-2xl font-bold text-green-600">
                  {totalCollectors + totalResidents}
                </div>
                <div className="text-sm text-green-600">Active Users</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Campaigns List */}
        <Card className="bg-white border border-gray-200">
          <CardContent className="p-0">
            {loading && (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            )}
            
            {filteredCampaigns.length === 0 && !loading ? (
              <div className="text-center py-12 text-gray-500">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No notifications found</p>
                <p className="text-sm mt-2">
                  {searchTerm ? 'Try adjusting your search criteria' : 
                   typeFilter !== 'all' ? `No ${typeFilter} notifications have been sent yet.` : 
                   "No notification campaigns have been sent yet."}
                </p>
              </div>
            ) : (!loading && (
              <div className="divide-y divide-gray-200">
                {filteredCampaigns.map((campaign) => {
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
                      className="p-6 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-lg">{getNotificationIcon(campaign.type)}</span>
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <h3 className="font-semibold text-gray-900">
                                {campaign.title}
                              </h3>
                              <Badge 
                                variant="outline" 
                                className={`${getNotificationTypeBadgeColor(campaign.type)} text-xs`}
                              >
                                {getNotificationIcon(campaign.type)} {campaign.type?.replace(/_/g, ' ')}
                              </Badge>
                              <Badge 
                                variant={campaign.status === 'completed' ? "default" : "secondary"}
                                className="text-xs"
                              >
                                {campaign.status === 'completed' ? "Delivered" : "Sending"}
                              </Badge>
                            </div>
                            
                            <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600 ">
                              <div className="flex items-center">
                                <User className="h-4 w-4 mr-1" />
                                {campaign.actualSentCount || campaign.userBreakdown?.total || 0} recipients
                              </div>
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-1" />
                                {getValidDate(campaign.createdAt).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </div>
                              {campaign.sentByName && (
                                <div>By: {campaign.sentByName}</div>
                              )}
                            </div>
                            
                            {!isExpanded && (
                              <div className="mt-2 text-sm text-gray-500  line-clamp-2">
                                {campaign.message}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={toggleExpanded}
                          >
                            {isExpanded ? 'Hide Details' : 'View Details'}
                          </Button>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="mt-4 pl-16 space-y-4 border-t border-gray-200  pt-4">
                          <div className="p-3 bg-gray-50  rounded-lg">
                            <h5 className="font-medium text-sm mb-2">Message Content:</h5>
                            <p className="text-sm whitespace-pre-wrap">
                              {campaign.message}
                            </p>
                          </div>
                          
                          {campaign.userBreakdown && (
                            <div>
                              <h4 className="font-semibold text-sm mb-3 flex items-center">
                                👥 Recipient Breakdown
                              </h4>
                              <div className="grid grid-cols-3 gap-3">
                                <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                                  <div className="text-xl font-bold text-green-600">
                                    {campaign.userBreakdown.junkShops || 0}
                                  </div>
                                  <div className="text-xs text-green-600">🏪 Junk Shops</div>
                                </div>
                                <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200">
                                  <div className="text-xl font-bold text-orange-600">
                                    {campaign.userBreakdown.collectors || 0}
                                  </div>
                                  <div className="text-xs text-orange-600">🚚 Collectors</div>
                                </div>
                                <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
                                  <div className="text-xl font-bold text-purple-600">
                                    {campaign.userBreakdown.residents || 0}
                                  </div>
                                  <div className="text-xs text-purple-600">👤 Residents</div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}