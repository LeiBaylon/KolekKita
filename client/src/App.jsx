import React, { useEffect } from "react";
import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import Users from "@/pages/Users";
import Verification from "@/pages/Verification";
import Moderation from "@/pages/Moderation";
import Analytics from "@/pages/Analytics";
import Notifications from "@/pages/Notifications";
import AdminManagement from "@/pages/AdminManagement";
import Login from "@/pages/Login";
import NotFound from "@/pages/not-found";

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("❌ App Error:", error, errorInfo);
    console.error("Error stack:", error?.stack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "20px", background: "#fee", border: "2px solid #f00", margin: "20px" }}>
          <h1>Something went wrong</h1>
          <p style={{ color: "#c00", fontWeight: "bold" }}>{String(this.state.error?.message || this.state.error)}</p>
          <pre style={{ background: "#fff", padding: "10px", overflow: "auto", fontSize: "12px" }}>
            {String(this.state.error?.stack || "")}
          </pre>
          <button onClick={() => window.location.reload()} style={{ padding: "10px 20px", cursor: "pointer" }}>
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppRoutes() {
  const { user, loading } = useAuth();
  const [location, setLocation] = useLocation();

  // Redirect authenticated users away from login/register pages
  useEffect(() => {
    if (user && location === "/login") {
      setLocation("/");
    }
  }, [user, location, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Allow access to login page without authentication
  if (!user) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="*">
          <Login />
        </Route>
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/" component={Analytics} />
      <Route path="/users" component={Users} />
      <Route path="/verification" component={Verification} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/moderation" component={Moderation} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/admin-management" component={AdminManagement} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  console.log("🚀 App component rendering");
  
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <Toaster />
            <AppRoutes />
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
