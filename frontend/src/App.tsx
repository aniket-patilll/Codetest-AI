import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

// Pages
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import StudentLogin from "./pages/auth/StudentLogin";
import HostLogin from "./pages/auth/HostLogin";
import StudentSignup from "./pages/auth/StudentSignup";
import HostSignup from "./pages/auth/HostSignup";
import AuthCallback from "./pages/auth/AuthCallback";
import HostDashboard from "./pages/host/HostDashboard";
import TestCreation from "./pages/host/TestCreation";
import Leaderboard from "./pages/host/Leaderboard";
import Submissions from "./pages/host/Submissions";
import TestResults from "./pages/host/TestResults";
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentTestResults from "./pages/student/StudentTestResults";
import TestEnvironment from "./pages/test/TestEnvironment";
import JoinTest from "./pages/JoinTest";

// Layout
import { DashboardLayout } from "@/components/layout/DashboardLayout";

const queryClient = new QueryClient();



const AppRoutes = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <Navigate to={user?.role === 'host' ? '/host' : '/student'} replace />
          ) : (
            <Index />
          )
        }
      />
      
      {/* Role selection pages (redirect to role-specific pages) */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      
      {/* Student auth routes */}
      <Route path="/login/student" element={<StudentLogin />} />
      <Route path="/signup/student" element={<StudentSignup />} />
      
      {/* Host auth routes */}
      <Route path="/login/host" element={<HostLogin />} />
      <Route path="/signup/host" element={<HostSignup />} />
      
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/join" element={<JoinTest />} />
      <Route path="/join/:code" element={<JoinTest />} />

      {/* Host routes */}
      <Route
        path="/host"
        element={
          <ProtectedRoute allowedRole="host">
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<HostDashboard />} />
        <Route path="tests" element={<HostDashboard />} />
        <Route path="tests/create" element={<TestCreation />} />
        <Route path="tests/:id" element={<TestCreation />} />
        <Route path="tests/:id/manage" element={<TestCreation />} />
        <Route path="submissions" element={<Submissions />} />
        <Route path="leaderboard" element={<Leaderboard />} />
        <Route path="tests/:id/results" element={<TestResults />} />
      </Route>

      {/* Student routes */}
      <Route
        path="/student"
        element={
          <ProtectedRoute allowedRole="student">
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<StudentDashboard />} />
        <Route path="tests" element={<StudentDashboard />} />
        <Route path="results/:id" element={<StudentTestResults />} />
      </Route>

      {/* Test environment (accessible by students) */}
      <Route
        path="/test/:id"
        element={
          <ProtectedRoute>
            <TestEnvironment />
          </ProtectedRoute>
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
