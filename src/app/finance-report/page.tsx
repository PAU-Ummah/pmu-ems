"use client";
import { useState, useEffect } from "react";
import NavigationDrawer from "@/components/Drawer";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleGuard from "@/components/RoleGuard";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
  useMediaQuery,
  useTheme,
  Divider,
} from "@mui/material";
import { AttachMoney, Print, Download, Visibility } from "@mui/icons-material";
import { Event, Invoice } from "@/types";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase";
import { generateInvoicePDF, generateCSVData, downloadCSV } from "@/utils/pdfGenerator";

interface EventFinanceData {
  event: Event;
  invoices: Invoice[];
  totalSpent: number;
  itemCount: number;
}

export default function FinanceReportPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [eventFinanceData, setEventFinanceData] = useState<EventFinanceData[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventFinanceData | null>(null);
  const [open, setOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [eventsSnapshot, invoicesSnapshot] = await Promise.all([
      getDocs(collection(db, "events")),
      getDocs(collection(db, "invoices"))
    ]);

    const eventsData: Event[] = [];
    eventsSnapshot.forEach((doc) => {
      eventsData.push({ id: doc.id, ...doc.data() } as Event);
    });

    const invoicesData: Invoice[] = [];
    invoicesSnapshot.forEach((doc) => {
      invoicesData.push({ id: doc.id, ...doc.data() } as Invoice);
    });

    setEvents(eventsData);

    // Process finance data
    const financeData: EventFinanceData[] = eventsData.map(event => {
      const eventInvoices = invoicesData.filter(invoice => invoice.eventId === event.id);
      const totalSpent = eventInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
      const itemCount = eventInvoices.reduce((sum, invoice) => sum + (invoice.items?.length || 0), 0);

      return {
        event,
        invoices: eventInvoices,
        totalSpent,
        itemCount,
      };
    });

    setEventFinanceData(financeData);
  };

  const getTotalSpending = () => {
    return eventFinanceData.reduce((sum, data) => sum + data.totalSpent, 0);
  };

  const getTotalInvoices = () => {
    return eventFinanceData.reduce((sum, data) => sum + data.invoices.length, 0);
  };

  const getTotalItems = () => {
    return eventFinanceData.reduce((sum, data) => sum + data.itemCount, 0);
  };

  const handleViewDetails = (data: EventFinanceData) => {
    setSelectedEvent(data);
    setOpen(true);
  };

  const handleGeneratePDF = (data: EventFinanceData) => {
    generateInvoicePDF(data);
  };

  const handleDownloadData = (data: EventFinanceData) => {
    const csvData = generateCSVData(data);
    const filename = `${data.event.name.replace(/\s+/g, '_')}_invoice_data.csv`;
    downloadCSV(csvData, filename);
  };

  return (
    <ProtectedRoute>
      <RoleGuard allowedRoles={["admin", "finance-manager"]}>
        <Box sx={{ display: 'flex' }}>
          <NavigationDrawer />
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              p: { xs: 2, md: 3 },
              backgroundColor: "#f5f5f5",
              minHeight: "100vh",
              ml: { xs: 0, md: "56px" },
            }}
          >
            <Typography
              variant="h4"
              color="black"
              gutterBottom
              sx={{ fontSize: { xs: "1.5rem", md: "2rem" } }}
            >
              Finance Report
            </Typography>

            {/* Summary Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Total Events
                    </Typography>
                    <Typography variant="h5" component="div">
                      {events.length}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Total Spending
                    </Typography>
                    <Typography variant="h5" component="div" color="primary">
                      ₦{getTotalSpending().toLocaleString()}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Total Invoices
                    </Typography>
                    <Typography variant="h5" component="div">
                      {getTotalInvoices()}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Total Items
                    </Typography>
                    <Typography variant="h5" component="div">
                      {getTotalItems()}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Events Finance Table */}
            <TableContainer component={Paper} sx={{ overflowX: "auto" }}>
              <Table sx={{ minWidth: 650 }} size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: "#f0f0f0" }}>
                    <TableCell>Event Name</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Invoices</TableCell>
                    <TableCell>Items</TableCell>
                    <TableCell>Total Spent</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {eventFinanceData.map((data) => (
                    <TableRow key={data.event.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {data.event.name}
                        </Typography>
                      </TableCell>
                      <TableCell>{data.event.date}</TableCell>
                      <TableCell>
                        <Chip
                          label={data.event.isEnded ? "Ended" : "Active"}
                          color={data.event.isEnded ? "default" : "success"}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {data.invoices.length} invoice(s)
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {data.itemCount} item(s)
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <AttachMoney color="success" />
                          ₦{data.totalSpent.toLocaleString()}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <IconButton
                          onClick={() => handleViewDetails(data)}
                          title="View Details"
                        >
                          <Visibility color="primary" />
                        </IconButton>
                        <IconButton
                          onClick={() => handleGeneratePDF(data)}
                          title="Generate PDF"
                        >
                          <Print color="primary" />
                        </IconButton>
                        <IconButton
                          onClick={() => handleDownloadData(data)}
                          title="Download Data"
                        >
                          <Download color="primary" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Event Details Dialog */}
            <Dialog
              open={open}
              onClose={() => setOpen(false)}
              fullWidth
              maxWidth="lg"
              fullScreen={isMobile}
            >
              <DialogTitle>
                Invoice Details - {selectedEvent?.event.name}
              </DialogTitle>
              <DialogContent>
                {selectedEvent && (
                  <Box>
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <Typography variant="h6">Event Information</Typography>
                        <Typography><strong>Name:</strong> {selectedEvent.event.name}</Typography>
                        <Typography><strong>Date:</strong> {selectedEvent.event.date}</Typography>
                        <Typography><strong>Status:</strong> {selectedEvent.event.isEnded ? "Ended" : "Active"}</Typography>
                        <Typography><strong>Total Spent:</strong> ₦{selectedEvent.totalSpent.toLocaleString()}</Typography>
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <Typography variant="h6">Summary</Typography>
                        <Typography><strong>Total Invoices:</strong> {selectedEvent.invoices.length}</Typography>
                        <Typography><strong>Total Items:</strong> {selectedEvent.itemCount}</Typography>
                        <Typography><strong>Average per Invoice:</strong> ₦{selectedEvent.invoices.length > 0 ? Math.round(selectedEvent.totalSpent / selectedEvent.invoices.length).toLocaleString() : "0"}</Typography>
                      </Grid>
                    </Grid>

                    <Divider sx={{ my: 2 }} />

                    <Typography variant="h6" sx={{ mb: 2 }}>Invoice Details</Typography>
                    
                    {selectedEvent.invoices.map((invoice) => (
                      <Paper key={invoice.id} sx={{ p: 2, mb: 2, border: "1px solid #e0e0e0" }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                          <Typography variant="h6">
                            Invoice #{invoice.invoiceNumber || `INV-${invoice.id?.slice(-6)}`}
                          </Typography>
                          <Typography variant="h6" color="primary">
                            ₦{invoice.totalAmount.toLocaleString()}
                          </Typography>
                        </Box>
                        
                        <Grid container spacing={2} sx={{ mb: 2 }}>
                          <Grid size={{ xs: 12, md: 6 }}>
                            <Typography><strong>Vendor:</strong> {invoice.vendor || "N/A"}</Typography>
                          </Grid>
                          <Grid size={{ xs: 12, md: 6 }}>
                            <Typography><strong>Date:</strong> {invoice.date}</Typography>
                          </Grid>
                        </Grid>

                        {invoice.notes && (
                          <Typography sx={{ mb: 2 }}>
                            <strong>Notes:</strong> {invoice.notes}
                          </Typography>
                        )}

                        <TableContainer component={Paper} variant="outlined">
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Description</TableCell>
                                <TableCell>Quantity</TableCell>
                                <TableCell>Unit Price</TableCell>
                                <TableCell>Total</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {invoice.items?.map((item) => (
                                <TableRow key={item.id}>
                                  <TableCell>{item.description}</TableCell>
                                  <TableCell>{item.quantity}</TableCell>
                                  <TableCell>₦{item.unitPrice.toLocaleString()}</TableCell>
                                  <TableCell>₦{item.totalPrice.toLocaleString()}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Paper>
                    ))}
                  </Box>
                )}
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setOpen(false)}>Close</Button>
                {selectedEvent && (
                  <>
                    <Button
                      startIcon={<Print />}
                      onClick={() => handleGeneratePDF(selectedEvent)}
                      variant="outlined"
                    >
                      Generate PDF
                    </Button>
                    <Button
                      startIcon={<Download />}
                      onClick={() => handleDownloadData(selectedEvent)}
                      variant="contained"
                      sx={{ backgroundColor: "#144404", color: "white" }}
                    >
                      Download Data
                    </Button>
                  </>
                )}
              </DialogActions>
            </Dialog>
          </Box>
        </Box>
      </RoleGuard>
    </ProtectedRoute>
  );
}
