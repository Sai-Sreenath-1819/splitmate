import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Dashboard } from './pages/Dashboard';
import { Profile } from './pages/Profile';
import { GroupsList } from './pages/GroupsList';
import { GroupCreate } from './pages/GroupCreate';
import { GroupDetail } from './pages/GroupDetail';
import { ExpenseCreate } from './pages/ExpenseCreate';
import { ExpenseDetail } from './pages/ExpenseDetail';
import { GroupSettle } from './pages/GroupSettle';
import { AuthGuard } from './components/AuthGuard';
import { Layout } from './components/Layout';

import { useEffect } from 'react';
import { useAuthStore } from './stores/authStore';

function App() {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Auth routes */}
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/signup" element={<Signup />} />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <AuthGuard>
              <Layout>
                <Dashboard />
              </Layout>
            </AuthGuard>
          }
        />
        <Route
          path="/profile"
          element={
            <AuthGuard>
              <Layout>
                <Profile />
              </Layout>
            </AuthGuard>
          }
        />
        <Route
          path="/groups"
          element={
            <AuthGuard>
              <Layout>
                <GroupsList />
              </Layout>
            </AuthGuard>
          }
        />
        <Route
          path="/groups/new"
          element={
            <AuthGuard>
              <Layout>
                <GroupCreate />
              </Layout>
            </AuthGuard>
          }
        />
        <Route
          path="/groups/:id"
          element={
            <AuthGuard>
              <Layout>
                <GroupDetail />
              </Layout>
            </AuthGuard>
          }
        />
        <Route
          path="/groups/:id/expense/new"
          element={
            <AuthGuard>
              <Layout>
                <ExpenseCreate />
              </Layout>
            </AuthGuard>
          }
        />
        <Route
          path="/expenses/:id"
          element={
            <AuthGuard>
              <Layout>
                <ExpenseDetail />
              </Layout>
            </AuthGuard>
          }
        />
        <Route
          path="/groups/:id/settle"
          element={
            <AuthGuard>
              <Layout>
                <GroupSettle />
              </Layout>
            </AuthGuard>
          }
        />

        {/* Redirects */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
