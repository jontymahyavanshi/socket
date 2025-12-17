// src/components/SettingsDialog.jsx
import React from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, Switch, FormControlLabel
} from "@mui/material";

// 1. Accept props for dark mode state and toggle function
const SettingsDialog = ({ open, onClose, isDarkMode, onToggleTheme }) => {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Settings</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControlLabel 
                control={<Switch defaultChecked />} 
                label="Notifications" 
            />
            
            {/* 2. Bind the Switch to the props */}
            <FormControlLabel 
                control={
                    <Switch 
                        checked={isDarkMode} 
                        onChange={onToggleTheme} 
                    />
                } 
                label="Dark Mode" 
            />
            
            <Typography variant="body2" color="text.secondary">
                App Version: 1.0.0
            </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default SettingsDialog;