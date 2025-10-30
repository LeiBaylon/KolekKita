import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useFirestoreCollection, useFirestoreOperations } from "@/hooks/useFirestore";
import { useToast } from "@/hooks/use-toast";
import { orderBy, where } from "firebase/firestore";
import { Users as UsersIcon, Mail, Phone, Shield, MoreVertical, Calendar, Edit, Trash2, Eye } from "lucide-react";
import { cn } from "@/lib/utils";


export default function Users() {
  const [showViewUserDialog, setShowViewUserDialog] = useState(false);
  const [showEditUserDialog, setShowEditUserDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: ""
  });
  const { toast } = useToast();
  const { updateDocument, deleteDocument } = useFirestoreOperations("users");

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

  const handleStatusChange = async (userId, isActive) => {
    try {
      console.log(`Updating user ${userId} status to ${isActive}`);
      await updateDocument(userId, { 
        isActive,
        updatedAt: new Date()
      });
      toast({
        title: "Status updated",
        description: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      });
    } catch (error) {
      console.error("Error updating user status:", error);
      toast({
        title: "Update failed",
        description: "Failed to update user status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
      return;
    }
    
    try {
      await deleteDocument(userId);
      toast({
        title: "User deleted",
        description: `${userName} has been removed from the system`,
      });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: "Failed to delete user",
        variant: "destructive",
      });
    }
  };

  const handleViewUser = (user) => {
    setSelectedUser(user);
    setShowViewUserDialog(true);
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setEditFormData({
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      role: user.role
    });
    setShowEditUserDialog(true);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    
    try {
      await updateDocument(selectedUser.id, {
        name: editFormData.name,
        email: editFormData.email,
        phone: editFormData.phone,
        role: editFormData.role,
        updatedAt: new Date()
      });
      
      toast({
        title: "User updated",
        description: "User information has been successfully updated",
      });
      
      setShowEditUserDialog(false);
      setSelectedUser(null);
    } catch (error) {
      toast({
        title: "Update failed",
        description: "Failed to update user information",
        variant: "destructive",
      });
    }
  };

  const getRoleBadgeVariant = (role) => {
    switch (role) {
      case "admin": return "default";
      case "junk_shop_owner": return "secondary";
      case "junkshop": return "secondary";
      case "collector": return "outline";
      case "customer": return "destructive";
      case "resident": return "destructive";
      default: return "outline";
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case "admin": return "👑";
      case "junk_shop_owner": return "🏪";
      case "junkshop": return "🏪";
      case "collector": return "🚚";
      case "customer": return "👤";
      case "resident": return "👤";
      default: return "❓";
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
                  User Management 👥
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
                            <Badge variant={getRoleBadgeVariant(user.role)} className="text-xs">
                              {getRoleIcon(user.role)} {user.role}
                            </Badge>
                            <Badge 
                              variant={user.isActive !== false ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {user.isActive !== false ? "Active" : "Inactive"}
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

                      <div className="flex items-center space-x-2">
                        <Select 
                          value={user.isActive !== false ? "active" : "inactive"}
                          onValueChange={(value) => handleStatusChange(user.id, value === "active")}
                          data-testid={`select-status-${user.id}`}
                        >
                          <SelectTrigger className="w-[100px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              data-testid={`button-more-${user.id}`}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewUser(user)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditUser(user)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit User
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteUser(user.id, user.name)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
                      <Badge variant={getRoleBadgeVariant(selectedUser.role)}>
                        {getRoleIcon(selectedUser.role)} {selectedUser.role}
                      </Badge>
                      <Badge variant={selectedUser.isActive !== false ? "default" : "secondary"}>
                        {selectedUser.isActive !== false ? "Active" : "Inactive"}
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
                      <label className="text-sm font-medium text-gray-600">Status</label>
                      <p className="text-sm">{selectedUser.isActive !== false ? "Active User" : "Inactive User"}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">User ID</label>
                      <p className="text-xs font-mono">{selectedUser.id}</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setShowViewUserDialog(false)}>
                    Close
                  </Button>
                  <Button onClick={() => {
                    setShowViewUserDialog(false);
                    handleEditUser(selectedUser);
                  }}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit User
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={showEditUserDialog} onOpenChange={setShowEditUserDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  placeholder="User name"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  placeholder="User email"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Phone</label>
                <Input
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  placeholder="Phone number (optional)"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Role</label>
                <Select value={editFormData.role} onValueChange={(value) => setEditFormData({ ...editFormData, role: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="junk_shop_owner">Junk Shop Owner</SelectItem>
                    <SelectItem value="collector">Collector</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="resident">Resident</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex space-x-2 pt-4">
                <Button onClick={handleUpdateUser} className="flex-1">
                  <Edit className="h-4 w-4 mr-2" />
                  Update User
                </Button>
                <Button variant="outline" onClick={() => setShowEditUserDialog(false)}>
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