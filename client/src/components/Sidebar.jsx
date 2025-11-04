import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useFirestoreCollection } from "@/hooks/useFirestore";
import { where } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  Users, 
  CheckCircle,
  Shield,
  BarChart3,
  X,
  Menu,
  Bell
} from "lucide-react";




const getMenuItems = () => [
  { id: "analytics", label: "Analytics", icon: BarChart3, path: "/" },
  { id: "users", label: "User Management", icon: Users, path: "/users" },
  { id: "verification", label: "Verification", icon: CheckCircle, path: "/verification" },
  { id: "notifications", label: "Notifications", icon: Bell, path: "/notifications" },
  { id: "moderation", label: "Moderation", icon: Shield, path: "/moderation" },
];

export const Sidebar = ({ isOpen, onClose }) => {
  const { user, switchRole } = useAuth();
  const [location] = useLocation();

  // Get real-time data for admin notifications (only if user is authenticated)
  const { data: verifications } = useFirestoreCollection("verifications", []);
  const { data: reportedContent } = useFirestoreCollection("reported_content", []);

  const handleRoleChange = (role) => {
    switchRole(role);
  };

  const menuItems = getMenuItems();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={onClose}
          data-testid="sidebar-overlay"
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "bg-white w-64 fixed inset-y-0 left-0 z-30",
          "lg:translate-x-0 lg:static lg:inset-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        data-testid="sidebar"
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-800" data-testid="sidebar-title">
            KolekKita
          </h1>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={onClose}
            data-testid="button-close-sidebar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        

        {/* Navigation */}
        <nav className="mt-4">
          {menuItems.map((item) => {
            const isActive = location === item.path;
            const Icon = item.icon;

            // Calculate real-time notifications for admin features
            let notificationCount = 0;
            if (item.id === "verification") {
              // Count pending verifications (status is 'pending' or null/undefined)
              notificationCount = verifications.filter((v) => 
                v.status === "pending" || !v.status
              ).length;
            } else if (item.id === "moderation") {
              notificationCount = reportedContent.length;
            }

            return (
              <Link key={item.id} href={item.path}>
                <div
                  className={cn(
                    "flex items-center px-6 py-3 text-gray-700  hover:bg-gray-50  transition-colors cursor-pointer",
                    isActive && "text-primary bg-green-50  border-r-2 border-primary"
                  )}
                  data-testid={`link-${item.id}`}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  <span className="flex-1">{item.label}</span>
                  {notificationCount > 0 && (
                    <Badge 
                      variant={item.id === "moderation" ? "destructive" : "default"}
                      className={cn(
                        "ml-auto text-xs font-semibold",
                        item.id === "verification" && "bg-green-600 hover:bg-green-700 animate-pulse",
                        item.id === "moderation" && "animate-pulse"
                      )}
                      data-testid={`badge-${item.id}-notifications`}
                    >
                      {notificationCount}
                    </Badge>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
};
