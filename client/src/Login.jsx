// src/Login.jsx
import React, { useState } from 'react';
import { Container, Paper, Typography, TextField, Button, Box, Alert } from '@mui/material';

const Login = ({ onLoginSuccess, onSwitchToRegister }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost:5000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      
      if (res.ok) {
        onLoginSuccess(data.user); // Pass full user object
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Login failed");
    }
  };

  return (
    <Container maxWidth="xs" sx={{ mt: 10 }}>
      <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h5" gutterBottom>Login</Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <Button variant="contained" size="large" type="submit">Login</Button>
          <Button onClick={onSwitchToRegister}>Create an Account</Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default Login;