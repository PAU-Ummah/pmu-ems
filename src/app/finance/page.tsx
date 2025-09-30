"use client";
import { useState, useEffect } from "react";
import NavigationDrawer from "@/components/Drawer";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleGuard from "@/components/RoleGuard";
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  useMediaQuery,
  useTheme,
  Divider,
  Grid,
  Card,
  CardContent,
} from "@mui/material";
import { Add, Delete, Edit, AttachMoney } from "@mui/icons-material";
import { Event, Invoice, InvoiceItem } from "@/types";
import { useAuth } from "@/context/AuthContext";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/firebase";
// Simple ID generator
const generateId = () => Math.random().toString(36).substr(2, 9);

export default function FinancePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [open, setOpen] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState<Partial<Invoice>>({
    eventId: "",
    items: [],
    totalAmount: 0,
    date: new Date().toISOString().split("T")[0],
    invoiceNumber: "",
    vendor: "",
    notes: "",
  });
  const [isEdit, setIsEdit] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { user } = useAuth();

  useEffect(() => {
    fetchEvents();
    fetchInvoices();
  }, []);

  const fetchEvents = async () => {
    const querySnapshot = await getDocs(collection(db, "events"));
    const eventsData: Event[] = [];
    querySnapshot.forEach((doc) => {
      eventsData.push({ id: doc.id, ...doc.data() } as Event);
    });
    setEvents(eventsData);
  };

  const fetchInvoices = async () => {
    const querySnapshot = await getDocs(collection(db, "invoices"));
    const invoicesData: Invoice[] = [];
    querySnapshot.forEach((doc) => {
      invoicesData.push({ id: doc.id, ...doc.data() } as Invoice);
    });
    setInvoices(invoicesData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCurrentInvoice({ ...currentInvoice, [name]: value });
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSelectChange = (e: any) => {
    const { name, value } = e.target;
    setCurrentInvoice({ ...currentInvoice, [name]: value });
  };

  const addInvoiceItem = () => {
    const newItem: InvoiceItem = {
      id: generateId(),
      description: "",
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
    };
    setCurrentInvoice({
      ...currentInvoice,
      items: [...(currentInvoice.items || []), newItem],
    });
  };

  const updateInvoiceItem = (itemId: string, field: keyof InvoiceItem, value: string | number) => {
    const updatedItems = currentInvoice.items?.map(item => {
      if (item.id === itemId) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          updatedItem.totalPrice = updatedItem.quantity * updatedItem.unitPrice;
        }
        return updatedItem;
      }
      return item;
    }) || [];
    
    const totalAmount = updatedItems.reduce((sum, item) => sum + item.totalPrice, 0);
    
    setCurrentInvoice({
      ...currentInvoice,
      items: updatedItems,
      totalAmount,
    });
  };

  const removeInvoiceItem = (itemId: string) => {
    const updatedItems = currentInvoice.items?.filter(item => item.id !== itemId) || [];
    const totalAmount = updatedItems.reduce((sum, item) => sum + item.totalPrice, 0);
    
    setCurrentInvoice({
      ...currentInvoice,
      items: updatedItems,
      totalAmount,
    });
  };

  const handleSubmit = async () => {
    if (!user || !currentInvoice.eventId || !currentInvoice.items?.length) return;

    const invoiceData = {
      ...currentInvoice,
      createdBy: user.uid,
      totalAmount: currentInvoice.totalAmount || 0,
    };

    if (isEdit && currentInvoice.id) {
      await updateDoc(doc(db, "invoices", currentInvoice.id), invoiceData);
    } else {
      await addDoc(collection(db, "invoices"), invoiceData);
    }

    // Update event's amount spent
    const eventInvoices = invoices.filter(inv => inv.eventId === currentInvoice.eventId);
    const totalAmount = eventInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0) + (currentInvoice.totalAmount || 0);
    
    await updateDoc(doc(db, "events", currentInvoice.eventId), {
      amountSpent: totalAmount,
    });

    setOpen(false);
    fetchInvoices();
    fetchEvents();
    setCurrentInvoice({
      eventId: "",
      items: [],
      totalAmount: 0,
      date: new Date().toISOString().split("T")[0],
      invoiceNumber: "",
      vendor: "",
      notes: "",
    });
  };

  const handleEdit = (invoice: Invoice) => {
    setCurrentInvoice(invoice);
    setIsEdit(true);
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, "invoices", id));
    fetchInvoices();
  };

  const getEventName = (eventId: string) => {
    const event = events.find((e) => e.id === eventId);
    return event ? event.name : "Unknown Event";
  };

  const getTotalSpending = () => {
    return invoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
  };

  return (
    <ProtectedRoute>
      <RoleGuard allowedRoles="finance-manager">
        <Box sx={{ display: 'flex' }}>
          <NavigationDrawer />
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              p: { xs: 1, sm: 2, md: 3 },
              backgroundColor: "#f5f5f5",
              minHeight: "100vh",
              ml: { xs: 0, md: "56px" },
              maxWidth: { xs: "100%", sm: "100%" },
            }}
          >
            <Typography
              variant="h4"
              color="black"
              gutterBottom
              sx={{ fontSize: { xs: "1.5rem", md: "2rem" } }}
            >
              Finance Management
            </Typography>

            {/* Summary Cards */}
            <Box sx={{ 
              maxWidth: { xs: "95%", sm: "100%" },
              mx: { xs: "auto", sm: 0 }
            }}>
              <Grid container spacing={{ xs: 1, sm: 2 }} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Card sx={{ height: "100%" }}>
                    <CardContent sx={{ p: { xs: 1, sm: 2 } }}>
                      <Typography color="textSecondary" gutterBottom sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                        Total Invoices
                      </Typography>
                      <Typography variant="h5" component="div" sx={{ fontSize: { xs: "1.25rem", sm: "1.5rem" } }}>
                        {invoices.length}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Card sx={{ height: "100%" }}>
                    <CardContent sx={{ p: { xs: 1, sm: 2 } }}>
                      <Typography color="textSecondary" gutterBottom sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                        Total Spending
                      </Typography>
                      <Typography variant="h5" component="div" color="primary" sx={{ fontSize: { xs: "1.25rem", sm: "1.5rem" } }}>
                        ₦{getTotalSpending().toLocaleString()}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Card sx={{ height: "100%" }}>
                    <CardContent sx={{ p: { xs: 1, sm: 2 } }}>
                      <Typography color="textSecondary" gutterBottom sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                        Events with Spending
                      </Typography>
                      <Typography variant="h5" component="div" sx={{ fontSize: { xs: "1.25rem", sm: "1.5rem" } }}>
                        {new Set(invoices.map(inv => inv.eventId)).size}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <Card sx={{ height: "100%" }}>
                    <CardContent sx={{ p: { xs: 1, sm: 2 } }}>
                      <Typography color="textSecondary" gutterBottom sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                        Average per Invoice
                      </Typography>
                      <Typography variant="h5" component="div" sx={{ fontSize: { xs: "1.25rem", sm: "1.5rem" } }}>
                        ₦{invoices.length > 0 ? Math.round(getTotalSpending() / invoices.length).toLocaleString() : "0"}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>

            <Box sx={{ 
              maxWidth: { xs: "95%", sm: "100%" },
              mx: { xs: "auto", sm: 0 },
              mb: 3
            }}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => {
                  setOpen(true);
                  setIsEdit(false);
                }}
                sx={{
                  backgroundColor: "#144404",
                  "&:hover": { backgroundColor: "#0d3002" },
                  width: { xs: "100%", sm: "auto" }
                }}
              >
                Add Invoice
              </Button>
            </Box>

            <Box sx={{ 
              maxWidth: { xs: "95%", sm: "100%" },
              mx: { xs: "auto", sm: 0 }
            }}>
              <TableContainer component={Paper} sx={{ overflowX: "auto" }}>
                <Table sx={{ minWidth: 650 }} size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: "#f0f0f0" }}>
                    <TableCell>Invoice #</TableCell>
                    <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>Event</TableCell>
                    <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>Vendor</TableCell>
                    <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>Items</TableCell>
                    <TableCell>Total Amount</TableCell>
                    <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>Date</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {invoice.invoiceNumber || `INV-${invoice.id?.slice(-6)}`}
                        </Typography>
                        {isMobile && (
                          <Box sx={{ mt: 0.5 }}>
                            <Chip
                              label={getEventName(invoice.eventId)}
                              color="primary"
                              size="small"
                              sx={{ fontSize: "0.7rem", height: "20px" }}
                            />
                          </Box>
                        )}
                      </TableCell>
                      <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                        <Chip
                          label={getEventName(invoice.eventId)}
                          color="primary"
                          size="small"
                        />
                      </TableCell>
                      <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                        {invoice.vendor || "N/A"}
                      </TableCell>
                      <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>
                        <Typography variant="body2">
                          {invoice.items?.length || 0} item(s)
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <AttachMoney color="success" sx={{ fontSize: { xs: "1rem", sm: "1.25rem" } }} />
                          <Typography variant="body2" sx={{ fontSize: { xs: "0.8rem", sm: "0.875rem" } }}>
                            ₦{invoice.totalAmount.toLocaleString()}
                          </Typography>
                        </Box>
                        {isMobile && (
                          <Box sx={{ mt: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">
                              {invoice.vendor || "N/A"} • {invoice.date}
                            </Typography>
                          </Box>
                        )}
                      </TableCell>
                      <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                        {invoice.date}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", gap: 0.5 }}>
                          <IconButton 
                            onClick={() => handleEdit(invoice)}
                            size="small"
                            sx={{ p: { xs: 0.5, sm: 1 } }}
                          >
                            <Edit color="primary" sx={{ fontSize: { xs: "1rem", sm: "1.25rem" } }} />
                          </IconButton>
                          <IconButton 
                            onClick={() => handleDelete(invoice.id!)}
                            size="small"
                            sx={{ p: { xs: 0.5, sm: 1 } }}
                          >
                            <Delete color="error" sx={{ fontSize: { xs: "1rem", sm: "1.25rem" } }} />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            </Box>

            <Dialog
              open={open}
              onClose={() => setOpen(false)}
              fullWidth
              maxWidth="md"
              fullScreen={isMobile}
            >
              <DialogTitle>{isEdit ? "Edit Invoice" : "Add New Invoice"}</DialogTitle>
              <DialogContent>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <FormControl fullWidth>
                        <InputLabel>Event</InputLabel>
                        <Select
                          name="eventId"
                          value={currentInvoice.eventId || ""}
                          onChange={handleSelectChange}
                          label="Event"
                        >
                          {events.map((event) => (
                            <MenuItem key={event.id} value={event.id}>
                              {event.name} - {event.date}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        name="invoiceNumber"
                        label="Invoice Number"
                        value={currentInvoice.invoiceNumber || ""}
                        onChange={handleInputChange}
                        fullWidth
                        size="small"
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        name="vendor"
                        label="Vendor"
                        value={currentInvoice.vendor || ""}
                        onChange={handleInputChange}
                        fullWidth
                        size="small"
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        name="date"
                        label="Date"
                        type="date"
                        value={currentInvoice.date || ""}
                        onChange={handleInputChange}
                        fullWidth
                        size="small"
                        InputLabelProps={{
                          shrink: true,
                        }}
                      />
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: 2 }} />

                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="h6">Invoice Items</Typography>
                    <Button
                      variant="outlined"
                      startIcon={<Add />}
                      onClick={addInvoiceItem}
                      size="small"
                    >
                      Add Item
                    </Button>
                  </Box>

                  {currentInvoice.items?.map((item) => (
                    <Paper key={item.id} sx={{ p: { xs: 1.5, sm: 2 }, border: "1px solid #e0e0e0" }}>
                      <Grid container spacing={{ xs: 1, sm: 2 }} alignItems="center">
                        <Grid size={{ xs: 12, md: 4 }}>
                          <TextField
                            label="Description"
                            value={item.description}
                            onChange={(e) => updateInvoiceItem(item.id, 'description', e.target.value)}
                            fullWidth
                            size="small"
                            sx={{ 
                              '& .MuiInputBase-input': { 
                                fontSize: { xs: '0.875rem', sm: '1rem' } 
                              } 
                            }}
                          />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 6, md: 2 }}>
                          <TextField
                            label="Quantity"
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateInvoiceItem(item.id, 'quantity', Number(e.target.value))}
                            fullWidth
                            size="small"
                            sx={{ 
                              '& .MuiInputBase-input': { 
                                fontSize: { xs: '0.875rem', sm: '1rem' } 
                              } 
                            }}
                          />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 6, md: 2 }}>
                          <TextField
                            label="Unit Price (₦)"
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => updateInvoiceItem(item.id, 'unitPrice', Number(e.target.value))}
                            fullWidth
                            size="small"
                            sx={{ 
                              '& .MuiInputBase-input': { 
                                fontSize: { xs: '0.875rem', sm: '1rem' } 
                              } 
                            }}
                          />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 6, md: 2 }}>
                          <TextField
                            label="Total (₦)"
                            value={item.totalPrice.toLocaleString()}
                            fullWidth
                            size="small"
                            InputProps={{ readOnly: true }}
                            sx={{ 
                              '& .MuiInputBase-input': { 
                                fontSize: { xs: '0.875rem', sm: '1rem' } 
                              } 
                            }}
                          />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 6, md: 2 }}>
                          <Box sx={{ display: "flex", justifyContent: { xs: "flex-end", sm: "center" } }}>
                            <IconButton
                              onClick={() => removeInvoiceItem(item.id)}
                              color="error"
                              size="small"
                              sx={{ p: { xs: 0.5, sm: 1 } }}
                            >
                              <Delete sx={{ fontSize: { xs: "1rem", sm: "1.25rem" } }} />
                            </IconButton>
                          </Box>
                        </Grid>
                      </Grid>
                    </Paper>
                  ))}

                  {(!currentInvoice.items || currentInvoice.items.length === 0) && (
                    <Typography color="textSecondary" sx={{ textAlign: "center", py: 2 }}>
                      No items added yet. Click "Add Item" to start.
                    </Typography>
                  )}

                  <Divider sx={{ my: 2 }} />

                  <TextField
                    name="notes"
                    label="Notes"
                    value={currentInvoice.notes || ""}
                    onChange={handleInputChange}
                    fullWidth
                    multiline
                    rows={3}
                    size="small"
                  />

                  <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
                    <Typography variant="h6" color="primary">
                      Total: ₦{(currentInvoice.totalAmount || 0).toLocaleString()}
                    </Typography>
                  </Box>
                </Box>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setOpen(false)}>Cancel</Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!currentInvoice.eventId || !currentInvoice.items?.length}
                  sx={{ backgroundColor: "#144404", color: "white" }}
                >
                  {isEdit ? "Update" : "Add"}
                </Button>
              </DialogActions>
            </Dialog>
          </Box>
        </Box>
      </RoleGuard>
    </ProtectedRoute>
  );
}
