// App.js
import React from "react";
import { Route, Routes } from "react-router-dom";
import Home from "./components/Home"; // Assuming Home is your main component
import AuthSection from "./components/AuthSection"; // Your Auth section component
import PrivateRoute from "./components/PrivateRoute"; // Import the PrivateRoute component

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
      <Route path="/auth" element={<AuthSection />} />
    </Routes>
  );
};

export default App;
