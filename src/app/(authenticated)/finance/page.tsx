"use client";
import { useState, useEffect } from "react";
import RoleGuard from "@/components/auth/RoleGuard";
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
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import MetricCard from "@/components/common/MetricCard";
import ComponentCard from "@/components/common/ComponentCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import InvoiceForm from "./_component/InvoiceForm";

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

  const handleTextAreaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCurrentInvoice({ ...currentInvoice, [name]: value });
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
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
    
    let totalAmount;
    if (isEdit && currentInvoice.id) {
      // For editing: exclude the current invoice from the sum, then add the new amount
      const otherInvoices = eventInvoices.filter(inv => inv.id !== currentInvoice.id);
      totalAmount = otherInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0) + (currentInvoice.totalAmount || 0);
    } else {
      // For new invoices: sum all existing invoices plus the new one
      totalAmount = eventInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0) + (currentInvoice.totalAmount || 0);
    }
    
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
    // Find the invoice to get its eventId before deleting
    const invoiceToDelete = invoices.find(inv => inv.id === id);
    
    await deleteDoc(doc(db, "invoices", id));
    
    // Update event's amount spent after deletion
    if (invoiceToDelete) {
      const eventInvoices = invoices.filter(inv => inv.eventId === invoiceToDelete.eventId && inv.id !== id);
      const totalAmount = eventInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
      
      await updateDoc(doc(db, "events", invoiceToDelete.eventId), {
        amountSpent: totalAmount,
      });
    }
    
    fetchInvoices();
    fetchEvents();
  };

  const getEventName = (eventId: string) => {
    const event = events.find((e) => e.id === eventId);
    return event ? event.name : "Unknown Event";
  };

  const getTotalSpending = () => {
    return invoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
  };

  return (
    <RoleGuard allowedRoles={['finance-manager']}>
      <div className="w-full">
        <h1 className="mb-4 text-2xl font-semibold text-gray-900 sm:text-3xl md:text-4xl">
          Finance Management
        </h1>

        {/* Summary Cards */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Invoices"
            value={invoices.length}
          />
          <MetricCard
            title="Total Spending"
            value={`₦${getTotalSpending().toLocaleString()}`}
          />
          <MetricCard
            title="Events with Spending"
            value={new Set(invoices.map(inv => inv.eventId)).size}
          />
          <MetricCard
            title="Average per Invoice"
            value={`₦${invoices.length > 0 ? Math.round(getTotalSpending() / invoices.length).toLocaleString() : "0"}`}
          />
        </div>

        <div className="mb-6">
          <Button
            variant="primary"
            startIcon={<Add />}
            onClick={() => {
              setOpen(true);
              setIsEdit(false);
            }}
            className="w-full sm:w-auto"
          >
            Add Invoice
          </Button>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-4">
          {invoices.map((invoice) => (
            <ComponentCard
              key={invoice.id}
              title={invoice.invoiceNumber || `INV-${invoice.id?.slice(-6)}`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Event</span>
                  <Badge
                    color="primary"
                    variant="light"
                    size="sm"
                  >
                    {getEventName(invoice.eventId)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Vendor</span>
                  <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {invoice.vendor || "N/A"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Items</span>
                  <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {invoice.items?.length || 0} item(s)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Total Amount</span>
                  <div className="flex items-center gap-1">
                    <AttachMoney className="!h-4 !w-4 text-success-500" />
                    <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                      ₦{invoice.totalAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Date</span>
                  <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {invoice.date}
                  </span>
                </div>
                <div className="flex items-center justify-end gap-1 pt-2">
                  <button
                    onClick={() => handleEdit(invoice)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20"
                    aria-label="Edit invoice"
                  >
                    <Edit fontSize="small" />
                  </button>
                  <button
                    onClick={() => handleDelete(invoice.id!)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-error-500 hover:bg-error-50 dark:hover:bg-error-900/20"
                    aria-label="Delete invoice"
                  >
                    <Delete fontSize="small" />
                  </button>
                </div>
              </div>
            </ComponentCard>
          ))}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-hidden rounded-xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="max-w-full overflow-x-auto">
            <div className="min-w-[650px]">
              <Table>
                <TableHeader className="border-b border-gray-100 bg-gray-50 dark:bg-gray-800/50">
                  <TableRow>
                    <TableCell
                      isHeader
                      className="text-theme-xs px-5 py-3 text-start font-semibold text-gray-700 dark:text-white/90"
                    >
                      Invoice #
                    </TableCell>
                    <TableCell
                      isHeader
                      className="text-theme-xs px-5 py-3 text-start font-semibold text-gray-700 dark:text-white/90"
                    >
                      Event
                    </TableCell>
                    <TableCell
                      isHeader
                      className="text-theme-xs px-5 py-3 text-start font-semibold text-gray-700 dark:text-white/90"
                    >
                      Vendor
                    </TableCell>
                    <TableCell
                      isHeader
                      className="text-theme-xs px-5 py-3 text-start font-semibold text-gray-700 dark:text-white/90"
                    >
                      Items
                    </TableCell>
                    <TableCell
                      isHeader
                      className="text-theme-xs px-5 py-3 text-start font-semibold text-gray-700 dark:text-white/90"
                    >
                      Total Amount
                    </TableCell>
                    <TableCell
                      isHeader
                      className="text-theme-xs px-5 py-3 text-start font-semibold text-gray-700 dark:text-white/90"
                    >
                      Date
                    </TableCell>
                    <TableCell
                      isHeader
                      className="text-theme-xs px-5 py-3 text-start font-semibold text-gray-700 dark:text-white/90"
                    >
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {invoices.map((invoice) => (
                    <TableRow
                      key={invoice.id}
                      className="hover:bg-gray-50 transition-colors dark:hover:bg-gray-800/50"
                    >
                      <TableCell className="px-5 py-4 text-start">
                        <p className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
                          {invoice.invoiceNumber || `INV-${invoice.id?.slice(-6)}`}
                        </p>
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <Badge
                          color="primary"
                          variant="light"
                          size="sm"
                        >
                          {getEventName(invoice.eventId)}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-600 dark:text-gray-400">
                        {invoice.vendor || "N/A"}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-600 dark:text-gray-400">
                        {invoice.items?.length || 0} item(s)
                      </TableCell>
                      <TableCell className="px-5 py-4 text-start">
                        <div className="flex items-center gap-1">
                          <AttachMoney className="!h-4 !w-4 text-success-500" />
                          <p className="text-theme-sm font-medium text-gray-800 dark:text-white/90">
                            ₦{invoice.totalAmount.toLocaleString()}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-start text-theme-sm text-gray-600 dark:text-gray-400">
                        {invoice.date}
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEdit(invoice)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20"
                            aria-label="Edit invoice"
                          >
                            <Edit fontSize="small" />
                          </button>
                          <button
                            onClick={() => handleDelete(invoice.id!)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-error-500 hover:bg-error-50 dark:hover:bg-error-900/20"
                            aria-label="Delete invoice"
                          >
                            <Delete fontSize="small" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <InvoiceForm
          isOpen={open}
          onClose={() => setOpen(false)}
          currentInvoice={currentInvoice}
          events={events}
          onInputChange={handleInputChange}
          onTextAreaChange={handleTextAreaChange}
          onSelectChange={handleSelectChange}
          onAddItem={addInvoiceItem}
          onUpdateItem={updateInvoiceItem}
          onRemoveItem={removeInvoiceItem}
          onSubmit={handleSubmit}
          isEdit={isEdit}
        />
      </div>
    </RoleGuard>
  );
}
