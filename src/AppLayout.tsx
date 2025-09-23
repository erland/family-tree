import React, { useEffect } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  AppBar,
  Typography,
} from "@mui/material";

import DashboardIcon from "@mui/icons-material/Dashboard";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import PersonIcon from "@mui/icons-material/Person";
import TimelineIcon from "@mui/icons-material/Timeline";
import DescriptionIcon from "@mui/icons-material/Description";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import FavoriteIcon from "@mui/icons-material/Favorite";

import { useAppDispatch } from "./store";
import { fetchIndividuals } from "./features/individualsSlice";
import { fetchRelationships } from "./features/relationshipsSlice";
import { useTranslation } from "react-i18next";

const drawerWidth = 240;

export default function AppLayout() {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    // Bootstrap data once when layout mounts
    dispatch(fetchIndividuals());
    dispatch(fetchRelationships());
  }, [dispatch]);

  const navItems = [
    { to: "/", labelKey: "dashboard", icon: <DashboardIcon /> },
    { to: "/tree", labelKey: "tree", icon: <AccountTreeIcon /> },
    { to: "/timeline", labelKey: "timeline", icon: <TimelineIcon /> },
    { to: "/individuals", labelKey: "individuals", icon: <PersonAddIcon /> },
    { to: "/relationships", labelKey: "relationships", icon: <FavoriteIcon /> },
  ];

  return (
    <Box sx={{ display: "flex" }}>
      {/* Top AppBar */}
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <Typography variant="h6" noWrap>
            {t("appTitle", { defaultValue: "Genealogy App" })}
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Left Drawer Nav */}
      <Drawer
        variant="permanent"
        sx={{
          width: 240,
          flexShrink: 0,
          "& .MuiDrawer-paper": { width: 240, boxSizing: "border-box" },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: "auto" }}>
          <List>
            {navItems.map((item) => (
              <ListItem key={item.to} disablePadding>
                <ListItemButton
                  component={Link}
                  to={item.to}
                  selected={location.pathname === item.to}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={t(item.labelKey)} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}