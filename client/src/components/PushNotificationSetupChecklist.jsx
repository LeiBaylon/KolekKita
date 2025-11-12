import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Circle, AlertCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PushNotificationSetupChecklist() {
  const setupSteps = [
    {
      id: 1,
      title: 'Get VAPID Key from Firebase',
      description: 'Go to Firebase Console → Project Settings → Cloud Messaging → Web Push certificates',
      status: 'pending', // Change to 'complete' after done
      link: 'https://console.firebase.google.com/project/kolekkita/settings/cloudmessaging'
    },
    {
      id: 2,
      title: 'Update VAPID Key in Code',
      description: 'Edit client/src/services/pushNotificationService.js and replace YOUR_VAPID_KEY_HERE',
      status: 'pending',
      file: 'client/src/services/pushNotificationService.js'
    },
    {
      id: 3,
      title: 'Download Service Account Key',
      description: 'Go to Firebase Console → Project Settings → Service Accounts → Generate new private key',
      status: 'pending',
      link: 'https://console.firebase.google.com/project/kolekkita/settings/serviceaccounts/adminsdk'
    },
    {
      id: 4,
      title: 'Place Service Account Key',
      description: 'Save downloaded JSON as server/serviceAccountKey.json',
      status: 'pending',
      file: 'server/serviceAccountKey.json'
    },
    {
      id: 5,
      title: 'Install Dependencies',
      description: 'Run: npm install firebase@latest firebase-admin',
      status: 'pending',
      command: 'npm install firebase@latest firebase-admin'
    },
    {
      id: 6,
      title: 'Add Notification Icons',
      description: 'Create icon-192x192.png and badge-72x72.png in client/public/',
      status: 'pending',
      file: 'client/public/'
    },
    {
      id: 7,
      title: 'Test Push Notifications',
      description: 'Login as a non-admin user and grant notification permission',
      status: 'pending'
    }
  ];

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-900">
          <AlertCircle className="h-5 w-5" />
          Push Notification Setup Required
        </CardTitle>
        <CardDescription className="text-orange-800">
          Complete these steps to enable push notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-white border-orange-300">
          <AlertDescription className="text-sm">
            The push notification system is installed but requires configuration. 
            Follow the steps below to complete the setup. See <code className="bg-orange-100 px-1 py-0.5 rounded">PUSH_NOTIFICATION_SETUP.md</code> for detailed instructions.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          {setupSteps.map((step) => (
            <div 
              key={step.id} 
              className="flex items-start gap-3 p-3 rounded-lg bg-white border border-orange-200"
            >
              <div className="flex-shrink-0 mt-0.5">
                {step.status === 'complete' ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <Circle className="h-5 w-5 text-orange-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-900">
                  {step.id}. {step.title}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {step.description}
                </p>
                {step.file && (
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded mt-1 inline-block">
                    {step.file}
                  </code>
                )}
                {step.command && (
                  <code className="text-xs bg-gray-900 text-green-400 px-2 py-1 rounded mt-1 inline-block font-mono">
                    {step.command}
                  </code>
                )}
                {step.link && (
                  <div className="mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => window.open(step.link, '_blank')}
                    >
                      Open Firebase Console
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <Alert>
          <AlertDescription className="text-xs">
            <strong>Note:</strong> After completing setup, remove this checklist component from the Notifications page.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
