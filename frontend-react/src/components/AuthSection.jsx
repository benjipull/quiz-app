import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaEnvelope, FaLock, FaUser, FaBirthdayCake } from "react-icons/fa";
import "../styles/AuthSection.css";

const AuthSection = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupAlias, setSignupAlias] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupAge, setSignupAge] = useState("");
  const [message, setMessage] = useState("");

  const handleLogin = async () => {
    if (!loginEmail || !loginPassword) {
      setMessage("Please enter both email and password.");
      return;
    }
    try {
      const response = await fetch("http://localhost:3000/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        navigate("/");
      } else {
        setMessage(data.message || "Login failed.");
      }
    } catch (error) {
      setMessage("An error occurred. Please try again.");
    }
  };

  const handleSignup = async () => {
    if (!signupAlias || !signupEmail || !signupPassword || !signupAge) {
      setMessage("All fields are required.");
      return;
    }
    try {
      const response = await fetch("http://localhost:3000/api/users/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alias: signupAlias,
          email: signupEmail,
          password: signupPassword,
          age: signupAge,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      handleLogin();
    } catch (error) {
      setMessage(`❌ ${error.message}`);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>{isLogin ? "Login" : "Sign Up"}</h2>
        {isLogin ? (
          <>
            <div className="input-group">
              <FaEnvelope className="input-icon" />
              <input
                type="email"
                placeholder="Email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />
            </div>
            <div className="input-group">
              <FaLock className="input-icon" />
              <input
                type="password"
                placeholder="Password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
              />
            </div>
            <button onClick={handleLogin}>Login</button>
            {message && <p className="error-message">{message}</p>}
            <p className="toggle-text">
              Don't have an account?{" "}
              <span onClick={() => setIsLogin(false)}>Sign Up</span>
            </p>
          </>
        ) : (
          <>
            <div className="input-group">
              <FaUser className="input-icon" />
              <input
                type="text"
                placeholder="Alias"
                value={signupAlias}
                onChange={(e) => setSignupAlias(e.target.value)}
              />
            </div>
            <div className="input-group">
              <FaEnvelope className="input-icon" />
              <input
                type="email"
                placeholder="Email"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
              />
            </div>
            <div className="input-group">
              <FaLock className="input-icon" />
              <input
                type="password"
                placeholder="Password"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
              />
            </div>
            <div className="input-group">
              <FaBirthdayCake className="input-icon" />
              <input
                type="number"
                placeholder="Age"
                value={signupAge}
                onChange={(e) => setSignupAge(e.target.value)}
              />
            </div>
            <button onClick={handleSignup}>Sign Up</button>
            {message && <p className="error-message">{message}</p>}
            <p className="toggle-text">
              Already have an account?{" "}
              <span onClick={() => setIsLogin(true)}>Login</span>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthSection;
