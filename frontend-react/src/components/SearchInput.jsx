import { useNavigate } from "react-router-dom";  // Import React Router's useNavigate hook
import { useState } from "react";
import "../styles/Search.css"
import { FaSearch } from "react-icons/fa";

export function SearchInput() {
  const navigate = useNavigate();  // Use useNavigate from React Router
  const [searchQuery, setSearchQuery] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Use navigate to redirect to the search page
      navigate(`/search/${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="relative w-full flex-1 max-w-[300px]"
    >
      <input
        type="text"
        placeholder="Search courses..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="search-input"
      />
      <FaSearch className="search-icon" />
    </form>
  );
}
