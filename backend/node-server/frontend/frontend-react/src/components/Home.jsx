import React, { useEffect, useState } from "react";

const Home = () => {
  const [userAlias, setUserAlias] = useState("");
  const [userAge, setUserAge] = useState("");

  useEffect(() => {
    // Get user data from localStorage
    const user = JSON.parse(localStorage.getItem("user"));
    
    // Set the alias and age if user data exists
    if (user) {
      setUserAlias(user.alias);
      setUserAge(user.age);
    }
  }, []);

  return (
    <div>
      <h1>Welcome {userAlias ? userAlias : "Guest"}!</h1>
      <p>Age: {userAge ? userAge : "N/A"}</p>
      <p>This is the home page, and we're happy to have you here.</p>
    </div>
  );
};

export default Home;
