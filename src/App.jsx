import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import HomePage from '@/pages/HomePage';
import HotelDashboard from '@/pages/HotelDashboard';
import AnalyticsPage from '@/pages/AnalyticsPage';
import InvoicePage from '@/pages/InvoicePage';
import ArrivalsProgramPage from '@/pages/ArrivalsProgramPage';
import { Toaster } from '@/components/ui/toaster';

const PrivateRoute = ({ children, isAuthenticated }) => {
  return isAuthenticated ? children : <Navigate to="/" />;
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <>
      <Helmet>
        <title>Hotel HK - Système de Gestion</title>
        <meta name="description" content="Un système moderne pour gérer votre hôtel avec facilité." />
      </Helmet>
      <Router>
        <main className="light">
          <Routes>
            <Route path="/" element={<HomePage setIsAuthenticated={setIsAuthenticated} />} />
            <Route 
              path="/dashboard" 
              element={
                <PrivateRoute isAuthenticated={isAuthenticated}>
                  <HotelDashboard setIsAuthenticated={setIsAuthenticated} />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/analytics" 
              element={
                <PrivateRoute isAuthenticated={isAuthenticated}>
                  <AnalyticsPage />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/invoice/:reservationId"
              element={
                <PrivateRoute isAuthenticated={isAuthenticated}>
                  <InvoicePage />
                </PrivateRoute>
              }
            />
            <Route 
              path="/arrivals-program"
              element={
                <PrivateRoute isAuthenticated={isAuthenticated}>
                  <ArrivalsProgramPage />
                </PrivateRoute>
              }
            />
          </Routes>
        </main>
        <Toaster />
      </Router>
    </>
  );
}

export default App;
