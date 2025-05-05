import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import DutyChange from "./component/DutyChange";
import Login from "./component/Login";
import Schedule from "./component/Schedule";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userDetails, setUserDetails] = useState(null);

  const handleSuccessfulLogin = (userData) => {
    setUserDetails(userData);
    setIsAuthenticated(true);
  };

  // Private route wrapper component
  const PrivateRoute = ({ element }) => {
    return isAuthenticated ? element : <Navigate to="/" replace />;
  };

  return (
    <Router>
      <Toaster position="top-center" />
      <Routes>
        <Route path="/duty-change" element={<PrivateRoute element={<DutyChange />} />} />
        <Route path="/" element={
          isAuthenticated ? (
            <Schedule userDetails={userDetails} />
          ) : (
            <Login onLoginSuccess={handleSuccessfulLogin} />
          )
        } />
      </Routes>
    </Router>
  );
}

export default App;