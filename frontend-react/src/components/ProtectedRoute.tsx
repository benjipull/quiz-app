import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

// Define the base URL outside the component
const BASE_URL = "https://quiz-app-node-606998948537.europe-west4.run.app";

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const [isValid, setIsValid] = useState<boolean | null>(null); // null = loading

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setIsValid(false);
      return;
    }

    // Call your backend to verify token using the BASE_URL
    fetch(`${BASE_URL}/api/user`, { // 👈 URL updated here
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (res.status === 200) {
          setIsValid(true); // token is valid
        } else if (res.status === 401) {
          // Invalid or expired token
          localStorage.removeItem("token");
          setIsValid(false);
        } else {
          // Handle other errors (e.g., 500 server error)
          setIsValid(false);
        }
      })
      .catch((error) => {
        console.error("Token verification failed:", error); // Log the error for debugging
        localStorage.removeItem("token"); // Network error or invalid token
        setIsValid(false);
      });
  }, []);

  if (isValid === null) return <div>Loading...</div>; // Optional: loading UI

  if (!isValid) return <Navigate to="/auth" replace />; // Redirect to login

  return <>{children}</>;
};

export default ProtectedRoute;