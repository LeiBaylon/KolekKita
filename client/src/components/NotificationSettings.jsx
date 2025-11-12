import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bell, BellOff, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import PushNotificationService from '@/services/pushNotificationService';
import { useToast } from '@/hooks/use-toast';

export function NotificationSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if push notifications are supported
    const supported = PushNotificationService.isSupported();
    setIsSupported(supported);

    if (supported) {
      const currentPermission = PushNotificationService.getPermissionStatus();
      setPermission(currentPermission);
      setIsEnabled(currentPermission === 'granted');
    }
  }, []);

  const handleEnableNotifications = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to enable notifications",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const token = await PushNotificationService.requestPermissionAndGetToken(user.id);
      
      if (token) {
        setPermission('granted');
        setIsEnabled(true);
        toast({
          title: "Success! 🎉",
          description: "Push notifications enabled. You'll now receive updates even when the app is closed.",
        });
      } else {
        toast({
          title: "Permission Denied",
          description: "Please enable notifications in your browser settings.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      toast({
        title: "Error",
        description: "Failed to enable notifications. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisableNotifications = async () => {
    if (!user) return;

    setLoading(true);
    try {
      await PushNotificationService.removeFCMToken(user.id);
      setIsEnabled(false);
      toast({
        title: "Notifications Disabled",
        description: "You won't receive push notifications anymore.",
      });
    } catch (error) {
      console.error('Error disabling notifications:', error);
      toast({
        title: "Error",
        description: "Failed to disable notifications. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (checked) => {
    if (checked) {
      handleEnableNotifications();
    } else {
      handleDisableNotifications();
    }
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Push Notifications Not Supported
          </CardTitle>
          <CardDescription>
            Your browser doesn't support push notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Push notifications require a modern browser. Please use Chrome, Firefox, Edge, or Safari 16+.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Receive notifications even when the app is closed
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Alert */}
        {permission === 'granted' && isEnabled && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Push notifications are enabled. You'll receive updates even when the app is closed.
            </AlertDescription>
          </Alert>
        )}

        {permission === 'denied' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Notifications are blocked. Please enable them in your browser settings.
            </AlertDescription>
          </Alert>
        )}

        {permission === 'default' && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Enable notifications to receive updates about bookings, transactions, and important announcements.
            </AlertDescription>
          </Alert>
        )}

        {/* Toggle Switch */}
        <div className="flex items-center justify-between space-x-4 rounded-lg border p-4">
          <div className="flex-1 space-y-1">
            <Label htmlFor="push-notifications" className="text-base font-medium">
              Enable Push Notifications
            </Label>
            <p className="text-sm text-muted-foreground">
              Get notified about important updates
            </p>
          </div>
          <Switch
            id="push-notifications"
            checked={isEnabled}
            onCheckedChange={handleToggle}
            disabled={loading || permission === 'denied'}
          />
        </div>

        {/* Enable Button (if not enabled) */}
        {!isEnabled && permission !== 'denied' && (
          <Button
            onClick={handleEnableNotifications}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                Enabling...
              </>
            ) : (
              <>
                <Bell className="mr-2 h-4 w-4" />
                Enable Push Notifications
              </>
            )}
          </Button>
        )}

        {/* Browser Instructions */}
        {permission === 'denied' && (
          <div className="rounded-lg bg-muted p-4 text-sm">
            <p className="font-medium mb-2">To enable notifications:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Click the lock icon in your browser's address bar</li>
              <li>Find "Notifications" and change it to "Allow"</li>
              <li>Refresh this page</li>
            </ol>
          </div>
        )}

        {/* Info Box */}
        <div className="rounded-lg border bg-blue-50 border-blue-200 p-4">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1 text-sm">
              <p className="font-medium text-blue-900">How it works</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li>Receive notifications even when the app is closed</li>
                <li>Get updates about bookings and transactions</li>
                <li>Stay informed about important announcements</li>
                <li>You can disable this anytime</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
