import React, { useEffect, useState } from "react";
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
  IconButton,
  Divider,
} from "@mui/material";

import MenuIcon from "@mui/icons-material/Menu";
import DashboardIcon from "@mui/icons-material/Dashboard";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import TimelineIcon from "@mui/icons-material/Timeline";
import FavoriteIcon from "@mui/icons-material/Favorite";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import BarChartIcon from "@mui/icons-material/BarChart";

import { useAppDispatch } from "./store";
import { fetchIndividuals } from "./features/individualsSlice";
import { fetchRelationships } from "./features/relationshipsSlice";
import { useTranslation } from "react-i18next";

const drawerWidth = 240;

export default function AppLayout() {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const { t } = useTranslation();

  // mobile drawer open/closed
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    // Bootstrap data once when layout mounts
    dispatch(fetchIndividuals());
    dispatch(fetchRelationships());
  }, [dispatch]);

  // close drawer when route changes (nice on mobile)
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // 🧭 Navigation items
  const navItems = [
    { to: "/", labelKey: "dashboard", icon: <DashboardIcon /> },
    { to: "/tree", labelKey: "tree", icon: <AccountTreeIcon /> },
    { to: "/timeline", labelKey: "timeline", icon: <TimelineIcon /> },
    { to: "/individuals", labelKey: "individuals", icon: <PersonAddIcon /> },
    { to: "/relationships", labelKey: "relationships", icon: <FavoriteIcon /> },
    { to: "/places", labelKey: "places", icon: <LocationOnIcon /> },
    { to: "/ages", labelKey: "ages", icon: <BarChartIcon /> },
  ];

  function NavList() {
    return (
      <List>
        {navItems.map((item) => (
          <ListItem key={item.to} disablePadding>
            <ListItemButton
              component={Link}
              to={item.to}
              selected={location.pathname === item.to}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText
                primary={t(item.labelKey, { defaultValue: item.labelKey })}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    );
  }

  // Drawer content reused for both desktop + mobile drawers
  const drawerContent = (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      {/* pushes content below the app bar height */}
      <Toolbar />
      <Divider />
      <Box sx={{ flex: 1, overflowY: "auto" }}>
        <NavList />
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex" }}>
      {/* Top AppBar */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar
          sx={{
            minHeight: 56,
            "@media (min-width:600px)": {
              minHeight: 64,
            },
            px: 2,
            gap: 2,
          }}
        >
          {/* Hamburger only on small screens */}
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setMobileOpen(true)}
            sx={{
              mr: 1,
              display: { xs: "inline-flex", md: "none" },
            }}
            aria-label={t("openMenu", { defaultValue: "Open menu" })}
          >
            <MenuIcon />
          </IconButton>

          {/* Title */}
          <Typography
            variant="h6"
            noWrap
            sx={{
              flexGrow: 1,
              fontSize: { xs: "1rem", sm: "1.1rem", md: "1.25rem" },
              lineHeight: 1.2,
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
              overflow: "hidden",
            }}
          >
            {t("appTitle", { defaultValue: "Genealogy App" })}
          </Typography>

          {/* Right side of AppBar could hold actions (export, settings, etc) */}
          {/* <IconButton color="inherit">...</IconButton> */}
        </Toolbar>
      </AppBar>

      {/* Desktop (permanent) drawer - hidden on xs/sm, shown md+ */}
      <Drawer
        variant="permanent"
        open
        sx={{
          display: { xs: "none", md: "block" },
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Mobile (temporary) drawer - shown xs/sm only */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{
          keepMounted: true, // better iOS performance
        }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,

          // ❌ remove the manual left margin that caused the white gap
          // ml: { xs: 0, md: `${drawerWidth}px` },

          // keep space below AppBar so content doesn't hide behind it
          pt: {
            xs: "56px", // matches AppBar/Toolbar height on xs
            sm: "64px",
          },

          px: 2,
          pb: 4,

          minHeight: "100vh",
          bgcolor: (theme) =>
            theme.palette.mode === "dark"
              ? theme.palette.background.default
              : theme.palette.grey[100],
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}