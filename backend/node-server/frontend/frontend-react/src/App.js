// App.js
import React from "react";
import { Route, Routes } from "react-router-dom";
import Home from "./components/Home";
import Header from "./components/Header" ;
import AuthSection from "./components/AuthSection"; 
import PrivateRoute from "./components/PrivateRoute"; 
import Users from "./components/Users"; 
import Profile from "./components/Profile";
import Quiz from "./components/Quiz";

const App = () => {
  return (
    <>
    <Header />
    <Routes>
      <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
      <Route path="/auth" element={<AuthSection />} />
      <Route path="/users" element={<PrivateRoute><Users /></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
      <Route path="/quiz/:categoryId" element={<Quiz />} />
    </Routes>
    </>
  );
};

export default App;
