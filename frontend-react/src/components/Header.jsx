import React, { useState, useCallback, useEffect } from "react";
import "../styles/Header.css"; // Import styles
import logo from "../assets/images/QuizicleLogo.png";
import { FaBell, FaSearch, FaHome, FaPlus, FaPlay, FaUsers, FaBars } from "react-icons/fa";

// Import all avatar images
const avatars = Array.from({ length: 15 }, (_, i) => require(`../assets/images/avatars/${i + 1}.png`));

const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [avatarImg, setAvatarImg] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false); // Add state for search bar visibility

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

  const toggleMenu = useCallback(() => {
    setMenuOpen((prev) => !prev);
  }, []);

  const toggleSearch = () => {
    setSearchOpen((prev) => !prev); // Toggle search input visibility
  };

  return (
    <header className="header-container">
      <div className="left-section">
        <img src={logo} alt="Quizicle Logo" className="logo-image" loading="lazy" />

        <div className={`search-bar ${searchOpen ? "open" : ""}`}>
          <FaSearch className="search-icon" aria-label="Search" onClick={toggleSearch} />
          <input
            type="text"
            placeholder="Search quizzes..."
            className="search-input"
            aria-label="Search quizzes"
          />
        </div>
      </div>

      <nav className={`center-nav ${menuOpen ? "open" : ""}`}>
        <a href="/" className="nav-icon">
          <FaHome />
        </a>
        <a href="/add-category" className="nav-icon">
          <FaPlus />
        </a>
        <a href="/categories" className="nav-icon">
          <FaPlay />
        </a>
        <a href="/users" className="nav-icon">
          <FaUsers />
        </a>
      </nav>

      <div className="right-section">
        <a href="/notification" className="nav-icon" title="Notifications" aria-label="Notifications">
          <FaBell />
        </a>

        <div className="profile-container">
          {avatarImg && (
              <img src={avatarImg} alt="User Avatar" className="avatar-image" loading="lazy" />
          )}
        </div>

        <button className="menu-icon" onClick={toggleMenu} aria-label="Toggle Menu">
          <FaBars />
        </button>
      </div>
    </header>
  );
};

export default Header;
