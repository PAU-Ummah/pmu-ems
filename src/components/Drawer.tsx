// src/components/Drawer.tsx
"use client";
import React, { useState } from "react";
import {
  Drawer as MuiDrawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
  Box,
  Typography,
  useMediaQuery,
  useTheme,
  Tooltip,
  styled,
} from "@mui/material";
import {
  Menu,
  Event,
  People,
  Assessment,
  Settings,
  ChevronLeft,
  ChevronRight,
  ExitToApp,
} from "@mui/icons-material";
import Link from 'next/link';
import Image from "next/image";

export const drawerWidth = 240;
export const collapsedWidth = 68;

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
  justifyContent: 'flex-end',
}));

export default function NavigationDrawer() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [open, setOpen] = useState(!isMobile);

  const handleDrawerToggle = () => {
    setOpen(!open);
  };

  const menuItems = [
    { text: "Events", icon: <Event />, path: "/events" },
    { text: "People", icon: <People />, path: "/people" },
    { text: "Reports", icon: <Assessment />, path: "/reports" },
    { text: "Settings", icon: <Settings />, path: "/settings" },
    { text: "Logout", icon: <ExitToApp />, path: "/logout" },
  ];

  return (
    <>
      {isMobile && (
        <IconButton
          onClick={handleDrawerToggle}
          sx={{
            position: "fixed",
            top: 16,
            left: 16,
            zIndex: theme.zIndex.drawer + 1,
            backgroundColor: "#144404",
            color: "white",
            "&:hover": {
              backgroundColor: "#0d3002",
            }
          }}
        >
          <Menu />
        </IconButton>
      )}
      <MuiDrawer
        variant={isMobile ? "temporary" : "permanent"}
        open={open}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          width: open ? drawerWidth : collapsedWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: open ? drawerWidth : collapsedWidth,
            boxSizing: 'border-box',
            backgroundColor: "#144404",
            color: "white",
            borderRight: 'none',
            overflowX: 'hidden',
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
          },
        }}
      >
        <DrawerHeader>
          {open ? (
            <Link href="/" style={{ textDecoration: 'none', color: 'inherit', flexGrow: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', px: 2 }}>
                <Image
                  src="/Logo.png"
                  alt="Company Logo"
                  width={40}
                  height={40}
                  style={{ objectFit: 'contain', marginRight: '16px' }}
                />
                <Typography variant="h6">EMS</Typography>
              </Box>
            </Link>
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', py: 2 }}>
              <Image
                src="/Logo.png"
                alt="Company Logo"
                width={32}
                height={32}
                style={{ objectFit: 'contain' }}
              />
            </Box>
          )}
          {!isMobile && (
            <IconButton 
              onClick={handleDrawerToggle} 
              sx={{ color: "white", position: 'absolute', right: 8, top: 8 }}
            >
              {open ? <ChevronLeft /> : <ChevronRight />}
            </IconButton>
          )}
        </DrawerHeader>
        <Divider sx={{ backgroundColor: "rgba(255,255,255,0.2)" }} />
        <List>
          {menuItems.map((item) => (
            <ListItem key={item.text} disablePadding>
              <Link href={item.path} style={{ textDecoration: 'none', color: 'inherit', width: '100%' }}>
                <Tooltip title={!open ? item.text : ""} placement="right">
                  <ListItemButton
                    sx={{
                      minHeight: 48,
                      justifyContent: open ? "initial" : "center",
                      px: 2.5,
                      "&:hover": {
                        backgroundColor: "rgba(255,255,255,0.1)",
                      }
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 0,
                        mr: open ? 3 : 'auto',
                        justifyContent: "center",
                        color: "white",
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText 
                      primary={item.text} 
                      sx={{ 
                        opacity: open ? 1 : 0,
                        whiteSpace: 'nowrap',
                      }} 
                    />
                  </ListItemButton>
                </Tooltip>
              </Link>
            </ListItem>
          ))}
        </List>
      </MuiDrawer>
    </>
  );
}