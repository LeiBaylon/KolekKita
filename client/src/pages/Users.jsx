import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useFirestoreCollection, useFirestoreOperations } from "@/hooks/useFirestore";
import { useToast } from "@/hooks/use-toast";
import { orderBy, where } from "firebase/firestore";
import { Users as UsersIcon, Mail, Phone, Shield, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";


export default function Users() {
  const [showViewUserDialog, setShowViewUserDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const { toast } = useToast();

  // Helper function to safely convert timestamps to Date objects (same as Dashboard)
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

  const constraints = [orderBy("createdAt", "desc")];

  const { data: allUsers, loading, error } = useFirestoreCollection(
    "users",
    constraints
  );

  const handleViewUser = (user) => {
    setSelectedUser(user);
    setShowViewUserDialog(true);
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case "resident":
      case "customer":
        return "bg-green-100 text-green-700 border-green-200";
      case "collector":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "junkshop":
      case "junk_shop_owner":
        return "bg-red-100 text-red-700 border-red-200";
      case "admin":
        return "bg-blue-100 text-blue-700 border-blue-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case "admin": return "";
      case "junk_shop_owner": return "";
      case "junkshop": return "";
      case "collector": return "";
      case "customer": return "";
      case "resident": return "";
      default: return "";
    }
  };

  if (loading) {
    return (
      <Layout title="User Management">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="User Management">
      <div className="space-y-6">
        {/* Header */}
        <Card className="bg-green-600 text-white">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2 text-white">
                  User Management
                </h1>
                <p className="text-green-100">
                  Manage system users, roles, and permissions
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Directory */}
        <Card className="bg-white border border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center">
              <UsersIcon className="h-5 w-5 mr-2" />
              User Directory
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="text-red-500 text-sm" data-testid="text-users-error">
                Error loading users: {error}
              </div>
            )}

            {/* User Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
              <div className="text-center p-4 bg-white rounded-lg border-green-200 border">
                <div className="text-2xl font-bold text-green-600">
                  {allUsers.filter(u => u.role === "admin").length}
                </div>
                <div className="text-sm text-green-600">Admins</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg border-green-200 border">
                <div className="text-2xl font-bold text-green-600">
                  {allUsers.filter(u => u.role === "junk_shop_owner" || u.role === "junkshop").length}
                </div>
                <div className="text-sm text-green-600">Junk Shops</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg border-green-200 border">
                <div className="text-2xl font-bold text-green-600">
                  {allUsers.filter(u => u.role === "collector").length}
                </div>
                <div className="text-sm text-green-600">Collectors</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg border-green-200 border">
                <div className="text-2xl font-bold text-green-600">
                  {allUsers.filter(u => u.role === "resident" || u.role === "customer").length}
                </div>
                <div className="text-sm text-green-600">Residents</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card className="bg-white border border-gray-200">
          <CardContent className="p-0">
            {allUsers.length === 0 ? (
              <div className="text-center py-12 text-gray-500" data-testid="text-no-users">
                <UsersIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No users found</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {allUsers.map((user) => (
                  <div 
                    key={user.id}
                    className="p-6 hover:bg-gray-50 transition-colors"
                    data-testid={`user-item-${user.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={user.profilePhoto || ""} alt={user.name} />
                          <AvatarFallback className="text-lg bg-blue-600 text-white">
                            {user.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h3 className="font-semibold text-gray-900">
                              {user.name}
                            </h3>
                            <Badge className={`text-xs border ${getRoleBadgeClass(user.role)}`}>
                              {getRoleIcon(user.role)} {user.role}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                            <div className="flex items-center">
                              <Mail className="h-4 w-4 mr-1" />
                              {user.email}
                            </div>
                            {user.phone && (
                              <div className="flex items-center">
                                <Phone className="h-4 w-4 mr-1" />
                                {user.phone}
                              </div>
                            )}
                          </div>
                          
                          <div className="mt-2 text-xs text-gray-500">
                            Joined: {getValidDate(user.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center">
                        <Button
                          variant="ghost"
                          onClick={() => handleViewUser(user)}
                          className="text-gray-900 hover:bg-gray-100"
                          data-testid={`button-view-${user.id}`}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* View User Details Dialog */}
        <Dialog open={showViewUserDialog} onOpenChange={setShowViewUserDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-6">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={selectedUser.profilePhoto || ""} alt={selectedUser.name} />
                    <AvatarFallback className="text-2xl bg-blue-600 text-white">
                      {selectedUser.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-2xl font-bold">{selectedUser.name}</h3>
                    <div className="flex items-center space-x-2 mt-2">
                      <Badge className={`border ${getRoleBadgeClass(selectedUser.role)}`}>
                        {getRoleIcon(selectedUser.role)} {selectedUser.role}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Email</label>
                      <p className="text-sm">{selectedUser.email}</p>
                    </div>
                    {selectedUser.phone && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Phone</label>
                        <p className="text-sm">{selectedUser.phone}</p>
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium text-gray-600">Role</label>
                      <p className="text-sm capitalize">{selectedUser.role.replace('_', ' ')}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Joined</label>
                      <p className="text-sm">
                        {getValidDate(selectedUser.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">User ID</label>
                      <p className="text-xs font-mono">{selectedUser.id}</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end pt-4 border-t">
                  <Button variant="outline" onClick={() => setShowViewUserDialog(false)}>
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}