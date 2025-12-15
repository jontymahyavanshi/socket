import React, { useState, useEffect } from "react";
import Login from "./Login";
import Register from "./Register";
import Chat from "./Chat";

const App = () => {
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState("login"); 
  const [loading, setLoading] = useState(true); 

  // 1. Check Local Storage when app loads
  useEffect(() => {
    const savedUser = localStorage.getItem("chatUser");
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        // Safety check: ensure the saved user actually has an ID
        if (parsedUser && parsedUser._id) {
            setUser(parsedUser);
        } else {
            localStorage.removeItem("chatUser"); // Clear invalid data
        }
      } catch (e) {
        localStorage.removeItem("chatUser");
      }
    }
    setLoading(false);
  }, []);

  // 2. Handle Login (Save the FULL object: { _id, name, email, about })
  const handleLoginSuccess = (userData) => {
    localStorage.setItem("chatUser", JSON.stringify(userData));
    setUser(userData);
  };

  // 3. Handle Logout
  const handleLogout = () => {
    localStorage.removeItem("chatUser");
    setUser(null);
    setCurrentPage("login");
  };

  // 4. NEW: Handle User Profile Updates (Name/About)
  const handleUserUpdate = (updatedData) => {
    // Merge existing user data with the new updates
    const newUser = { ...user, ...updatedData };
    setUser(newUser);
    localStorage.setItem("chatUser", JSON.stringify(newUser));
  };

  if (loading) {
    return <div style={{ textAlign: "center", marginTop: "50px" }}>Loading...</div>;
  }

  // 5. Render Chat if Logged In
  if (user) {
    return (
        <Chat 
            user={user} 
            onLogout={handleLogout} 
            onUpdateUser={handleUserUpdate} // <--- PASS THIS PROP
        />
    );
  }

  // 6. Render Login/Register
  return (
    <>
      {currentPage === "login" && (
        <Login 
          onLoginSuccess={handleLoginSuccess} 
          onSwitchToRegister={() => setCurrentPage("register")} 
        />
      )}
      
      {currentPage === "register" && (
        <Register 
          onRegisterSuccess={() => setCurrentPage("login")} 
          onSwitchToLogin={() => setCurrentPage("login")} 
        />
      )}
    </>
  );
};

export default App;