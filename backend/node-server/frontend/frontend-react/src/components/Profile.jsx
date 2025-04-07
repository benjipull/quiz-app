import React, { useState, useEffect } from "react";
import "../styles/Profile.css";

const avatars = Array.from({ length: 15 }, (_, i) =>
  require(`../assets/images/avatars/${i + 1}.png`)
);

const Profile = () => {
  const [user, setUser] = useState(null);
  const [avatar, setAvatar] = useState(null);
  const [alias, setAlias] = useState("");
  const [age, setAge] = useState("");
  const [isProfileVisible, setIsProfileVisible] = useState(true);

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setAlias(parsedUser.alias || "");
          setAge(parsedUser.age || "");
          setAvatar(localStorage.getItem("userAvatar") || parsedUser.avatar || null);
          return;
        }

        const response = await fetch("http://localhost:3000/api/getUserDetails", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) throw new Error("Failed to fetch user details.");

        const userData = await response.json();
        if (userData.error) return;

        localStorage.setItem("user", JSON.stringify(userData));
        setUser(userData);
        setAlias(userData.alias || "");
        setAge(userData.age || "");
        setAvatar(localStorage.getItem("userAvatar") || userData.avatar || null);
      } catch (error) {
        console.error("Error fetching user details:", error.message);
      }
    };

    fetchUserDetails();
  }, []);

  const handleAvatarSelection = (selectedAvatar) => {
    setAvatar(selectedAvatar);
    localStorage.setItem("userAvatar", selectedAvatar);
  };

  const updateUserDetails = async (alias, age, avatar) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch("http://localhost:3000/api/updateUserDetails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ alias, age, avatar }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Error updating user details.");

      console.log("✅ Server Response:", data);

      const updatedUser = { ...user, alias, age, avatar };
      setUser(updatedUser);
      setAlias(alias);
      setAge(age);
      localStorage.setItem("user", JSON.stringify(updatedUser));

      console.log("🔄 Updated User in State:", updatedUser);
      console.log("💾 Local Storage after Update:", localStorage.getItem("user"));
    } catch (error) {
      console.error("❌ Error updating user:", error.message);
    }
  };

  const handleSaveClick = async () => {
    if (!alias || isNaN(age) || age <= 0) {
      alert("Please enter a valid username and age.");
      return;
    }

    if (!avatar) {
      alert("Please select an avatar.");
      return;
    }

    try {
      await updateUserDetails(alias, age, avatar);
      setIsProfileVisible(true);
    } catch (error) {
      alert("Error updating user details: " + error.message); // Show error to user
    }
  };

  return (
    <div>
      {user ? (
        isProfileVisible ? (
          <div id="user-profile">
            <h2>Profile Updated!</h2>
            <p><strong>Username:</strong> {user.alias}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Age:</strong> {user.age}</p>
            {avatar && <img src={avatar} alt="Selected Avatar" className="profile-avatar" />}
            <button className="btn" onClick={() => setIsProfileVisible(false)}>Edit Profile</button>
          </div>
        ) : (
          <div id="user-details-container">
            <form id="user-details-form">
              <label htmlFor="user-details-alias">Username</label>
              <input
                type="text"
                id="user-details-alias"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
              />

              <label htmlFor="user-details-email">Email</label>
              <input type="text" id="user-details-email" defaultValue={user.email} disabled />

              <label htmlFor="user-details-age">Age</label>
              <input
                type="number"
                id="user-details-age"
                value={age || ""}
                onChange={(e) => setAge(e.target.value)}
              />

              <div id="avatar-grid">
                {avatars.map((avatarImg, index) => (
                  <img
                    key={index}
                    src={avatarImg}
                    alt={`Avatar ${index + 1}`}
                    className={`avatar-option ${avatar === avatarImg ? "selected" : ""}`}
                    onClick={() => handleAvatarSelection(avatarImg)}
                  />
                ))}
              </div>

              <button type="button" className="btn" onClick={handleSaveClick}>
                Save
              </button>
            </form>
          </div>
        )
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
};

export default Profile;
