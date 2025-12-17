import React, { useState, useEffect, useMemo } from "react";
import { ThemeProvider, createTheme, CssBaseline, CircularProgress } from "@mui/material";
import Login from "./Login";
import Register from "./Register";
import Chat from "./Chat";

const App = () => {
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState("login"); 
  const [loading, setLoading] = useState(true); 

  // --- 1. PERSIST DARK MODE STATE ---
  // Initialize state by checking localStorage first
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem("chatAppTheme") === "dark";
  });

  // --- 2. SAVE THEME CHANGES ---
  // Whenever isDarkMode changes, save it to localStorage
  useEffect(() => {
    localStorage.setItem("chatAppTheme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  // --- PROFESSIONAL THEME CONFIGURATION ---
  const theme = useMemo(() => createTheme({
    palette: {
      mode: isDarkMode ? 'dark' : 'light',
      primary: {
        main: isDarkMode ? '#00a884' : '#008069', 
      },
      background: {
        default: isDarkMode ? '#0b141a' : '#efeae2', 
        paper: isDarkMode ? '#202c33' : '#ffffff',   
      },
      text: {
        primary: isDarkMode ? '#e9edef' : '#111b21',
        secondary: isDarkMode ? '#8696a0' : '#667781',
      },
      action: {
        hover: isDarkMode ? '#2a3942' : '#f5f6f6',
        selected: isDarkMode ? '#2a3942' : '#f0f2f5',
      }
    },
    components: {
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundColor: isDarkMode ? '#222e35' : '#ffffff',
          }
        }
      }
    }
  }), [isDarkMode]);

  const handleToggleTheme = () => setIsDarkMode((prev) => !prev);

  // --- AUTH LOGIC (Same as before) ---
  useEffect(() => {
    const savedUser = localStorage.getItem("chatUser");
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        if (parsedUser && parsedUser._id) setUser(parsedUser);
      } catch (e) {}
    }
    setLoading(false);
  }, []);

  const handleLoginSuccess = (userData) => {
    localStorage.setItem("chatUser", JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem("chatUser");
    setUser(null);
    setCurrentPage("login");
  };

  const handleUserUpdate = (updatedData) => {
    const newUser = { ...user, ...updatedData };
    setUser(newUser);
    localStorage.setItem("chatUser", JSON.stringify(newUser));
  };

  if (loading) return <div><CircularProgress/></div>;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline /> 
      {user ? (
        <Chat 
            user={user} 
            onLogout={handleLogout} 
            onUpdateUser={handleUserUpdate}
            isDarkMode={isDarkMode}
            onToggleTheme={handleToggleTheme}
        />
      ) : (
        <>
          {currentPage === "login" && <Login onLoginSuccess={handleLoginSuccess} onSwitchToRegister={() => setCurrentPage("register")} />}
          {currentPage === "register" && <Register onRegisterSuccess={() => setCurrentPage("login")} onSwitchToLogin={() => setCurrentPage("login")} />}
        </>
      )}
    </ThemeProvider>
  );
};

export default App;