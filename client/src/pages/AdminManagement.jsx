import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";
import { useFirestoreCollection, useFirestoreOperations } from "@/hooks/useFirestore";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { where } from "firebase/firestore";
import { Shield, UserPlus, Trash2, Crown, AlertTriangle } from "lucide-react";
import { isMainAdmin, canDeleteUser } from "@/utils/setupMainAdmin";
import { validatePassword } from "@/utils/passwordValidation";
import { createAdminWithoutSignIn } from "@/utils/createAdminWithoutSignIn";

export default function AdminManagement() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMainAdminUser, setIsMainAdminUser] = useState(false);
  const [isCheckingPermission, setIsCheckingPermission] = useState(true);

  const { user } = useAuth();
  const { toast } = useToast();
  const { deleteDocument } = useFirestoreOperations("users");

  const passwordValidation = validatePassword(newAdminPassword);

  // Fetch all admin users
  const { data: adminUsers = [], loading } = useFirestoreCollection("users", [
    where("role", "in", ["admin", "main_admin"])
  ]);

  // Sort admin users: Main admin always on top, then by created date
  const sortedAdminUsers = [...adminUsers].sort((a, b) => {
    if (a.isMainAdmin) return -1;
    if (b.isMainAdmin) return 1;
    
    const dateA = a.createdAt?.toDate?.() || a.createdAt || new Date(0);
    const dateB = b.createdAt?.toDate?.() || b.createdAt || new Date(0);
    return dateB - dateA;
  });

  useEffect(() => {
    if (user) {
      setIsCheckingPermission(true);
      isMainAdmin(user.id).then((result) => {
        setIsMainAdminUser(result);
        setIsCheckingPermission(false);
      });
    }
  }, [user]);

  const handleCreateAdmin = async () => {
    if (!newAdminName.trim() || !newAdminEmail.trim() || !newAdminPassword.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (!passwordValidation.isValid) {
      toast({
        title: "Password Requirements Not Met",
        description: passwordValidation.errors.join(". "),
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await createAdminWithoutSignIn(
        newAdminEmail, 
        newAdminPassword, 
        newAdminName, 
        "admin"
      );
      
      toast({
        title: "✓ Admin Account Created",
        description: `Successfully created admin account for ${newAdminName}. You remain logged in as main admin.`,
        className: "bg-green-50 border-green-200"
      });

      setNewAdminName("");
      setNewAdminEmail("");
      setNewAdminPassword("");
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error("Error creating admin:", error);
      
      let errorMessage = "Failed to create admin account";
      
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "This email is already registered. Please use a different email address.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Invalid email address format.";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password is too weak. Please use a stronger password.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error Creating Admin",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAdmin = async () => {
    if (!selectedAdmin) return;

    const canDelete = await canDeleteUser(selectedAdmin.id);
    if (!canDelete) {
      toast({
        title: "Cannot Delete",
        description: "The Main Administrator account cannot be deleted",
        variant: "destructive",
      });
      setIsDeleteDialogOpen(false);
      return;
    }

    setIsSubmitting(true);

    try {
      await deleteDocument(selectedAdmin.id);
      
      toast({
        title: "Admin Deleted",
        description: `Successfully deleted admin account: ${selectedAdmin.name}`,
      });

      setIsDeleteDialogOpen(false);
      setSelectedAdmin(null);
    } catch (error) {
      toast({
        title: "Error Deleting Admin",
        description: error instanceof Error ? error.message : "Failed to delete admin account",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCheckingPermission) {
    return (
      <Layout title="Admin Management">
        <div className="flex justify-center items-center min-h-[400px]">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  if (!isMainAdminUser) {
    return (
      <Layout title="Admin Management">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You do not have permission to access this page. Only the Main Administrator can manage admin accounts.
          </AlertDescription>
        </Alert>
      </Layout>
    );
  }

  return (
    <Layout title="Admin Management">
      <div className="space-y-6">
        <Card className="bg-green-600 text-white">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2 text-white">
                  Admin Management
                </h1>
                <p className="text-green-100">
                  Manage administrator accounts
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="bg-white/20 text-white hover:bg-white/30"
                onClick={() => setIsCreateDialogOpen(true)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Create Admin
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Administrator Accounts ({sortedAdminUsers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : sortedAdminUsers.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No administrator accounts found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sortedAdminUsers.map((admin) => (
                  <div
                    key={admin.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                        {admin.isMainAdmin ? (
                          <Crown className="h-6 w-6 text-green-600" />
                        ) : (
                          <Shield className="h-6 w-6 text-green-600" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold">{admin.name}</h3>
                          {admin.isMainAdmin && (
                            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                              <Crown className="h-3 w-3 mr-1" />
                              Main Admin
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{admin.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {!admin.isMainAdmin && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setSelectedAdmin(admin);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Administrator</DialogTitle>
              <DialogDescription>
                Create a new administrator account with full access to the admin panel.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={newAdminName}
                  onChange={(e) => setNewAdminName(e.target.value)}
                  placeholder="Enter administrator name"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  placeholder="admin@example.com"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  placeholder="Enter secure password"
                  disabled={isSubmitting}
                />
                <PasswordStrengthIndicator password={newAdminPassword} />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateAdmin} disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Admin"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Administrator</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this administrator account? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            {selectedAdmin && (
              <div className="py-4">
                <p className="text-sm">
                  <strong>Name:</strong> {selectedAdmin.name}
                </p>
                <p className="text-sm">
                  <strong>Email:</strong> {selectedAdmin.email}
                </p>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteAdmin}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Deleting..." : "Delete Admin"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
