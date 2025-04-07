import React, { useState, useEffect } from "react";
import "../styles/Header.css"; // Import styles
import logo from "../assets/images/QuizicleLogo.png";
import { FaBell, FaSearch, FaUsers } from "react-icons/fa";
import { Link } from "react-router-dom";
import { SearchInput } from "./SearchInput";

// Import all avatar images
const avatars = Array.from({ length: 15 }, (_, i) => require(`../assets/images/avatars/${i + 1}.png`));

const Header = () => {
  const [avatarImg, setAvatarImg] = useState(null);

  // Handle avatar loading
  useEffect(() => {
    const storedAvatar = localStorage.getItem("userAvatar");

    if (storedAvatar) {
      setAvatarImg(storedAvatar);
    } else {
      const randomIndex = Math.floor(Math.random() * avatars.length);
      const selectedAvatar = avatars[randomIndex];
      setAvatarImg(selectedAvatar);
      localStorage.setItem("userAvatar", selectedAvatar);
    }
  }, []);

  return (
    <header className="header-container">
      <div className="left-section">
        <a className="logo-link" href="/">
          <img src={logo} alt="Quizicle Logo" className="logo-image" loading="lazy" />
        </a>
        
        {/* Search Bar */}
       {/* <SearchInput/> */}
      </div>

      <div className="right-section">
        {/* Notifications */}
        <Link to="/notification" className="notif-icon" title="Notifications" aria-label="Notifications">
          <FaBell />
        </Link>

        {/* Users Icon */}
        <Link to="/users" className="nav-icon users-icon">
          <FaUsers />
        </Link>

        {/* User Avatar */}
        <div className="profile-container">
          {avatarImg && (
            <Link to="/profile">
              <img src={avatarImg} alt="User Avatar" className="avatar-image" loading="lazy" />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;