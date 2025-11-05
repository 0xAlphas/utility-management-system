'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { showToast, toastMessages } from '@/lib/toast';

interface Customer {
  id: string;
  name: string;
  type: string;
  contact: string;
}

interface Payment {
  id: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
}

interface Bill {
  id: string;
  billNumber: string;
  billingMonth: number;
  billingYear: number;
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  status: string;
  customer: Customer;
  payments: Payment[];
}

interface CustomerOption {
  id: string;
  name: string;
  type: string;
  contact: string;
}

interface BillFormData {
  customerId: string;
  billingMonth: string;
  billingYear: string;
  dueDate: string;
}

interface PaymentFormData {
  billId: string;
  amount: string;
  paymentMethod: string;
  paymentDate: string;
  referenceNumber: string;
  remarks: string;
}

export default function ClerkDashboard() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal states
  const [showBillModal, setShowBillModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedBillForPayment, setSelectedBillForPayment] = useState<Bill | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    pendingBills: 0,
    todayPayments: 0,
    totalOutstanding: 0,
  });

  // Form data
  const [billFormData, setBillFormData] = useState<BillFormData>({
    customerId: '',
    billingMonth: '',
    billingYear: new Date().getFullYear().toString(),
    dueDate: '',
  });

  const [paymentFormData, setPaymentFormData] = useState<PaymentFormData>({
    billId: '',
    amount: '',
    paymentMethod: 'CASH',
    paymentDate: new Date().toISOString().split('T')[0],
    referenceNumber: '',
    remarks: '',
  });

  const [formErrors, setFormErrors] = useState<{
    customerId?: string;
    billingMonth?: string;
    amount?: string;
    paymentMethod?: string;
  }>({});

  useEffect(() => {
    fetchBills();
    fetchCustomers();
  }, []);

  const fetchBills = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Fetch bills with status filter for outstanding bills
      const response = await fetch('/api/bills?limit=100', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch bills');
      }

      const data = await response.json();
      setBills(data.data || []);

      // Calculate stats
      const today = new Date().toISOString().split('T')[0];
      const unpaidBills = (data.data || []).filter(
        (bill: Bill) => bill.status === 'UNPAID' || bill.status === 'PARTIALLY_PAID' || bill.status === 'OVERDUE'
      );

      const todayPaymentCount = (data.data || []).reduce((count: number, bill: Bill) => {
        const todayPayments = bill.payments.filter(
          (payment) => payment.paymentDate.split('T')[0] === today
        );
        return count + todayPayments.length;
      }, 0);

      const totalOutstanding = unpaidBills.reduce(
        (sum: number, bill: Bill) => sum + bill.outstandingAmount,
        0
      );

      setStats({
        pendingBills: unpaidBills.length,
        todayPayments: todayPaymentCount,
        totalOutstanding,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch bills');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/customers?isActive=true&limit=100', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) return;

      const data = await response.json();
      setCustomers(data.data || []);
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    }
  };

  const openBillModal = () => {
    setBillFormData({
      customerId: '',
      billingMonth: '',
      billingYear: new Date().getFullYear().toString(),
      dueDate: '',
    });
    setFormErrors({});
    setShowBillModal(true);
    setSuccessMessage(null);
  };

  const closeBillModal = () => {
    setShowBillModal(false);
    setBillFormData({
      customerId: '',
      billingMonth: '',
      billingYear: new Date().getFullYear().toString(),
      dueDate: '',
    });
    setFormErrors({});
  };

  const openPaymentModal = (bill: Bill) => {
    setSelectedBillForPayment(bill);
    setPaymentFormData({
      billId: bill.id,
      amount: bill.outstandingAmount.toString(),
      paymentMethod: 'CASH',
      paymentDate: new Date().toISOString().split('T')[0],
      referenceNumber: '',
      remarks: '',
    });
    setFormErrors({});
    setShowPaymentModal(true);
    setSuccessMessage(null);
  };

  const closePaymentModal = () => {
    setShowPaymentModal(false);
    setSelectedBillForPayment(null);
    setPaymentFormData({
      billId: '',
      amount: '',
      paymentMethod: 'CASH',
      paymentDate: new Date().toISOString().split('T')[0],
      referenceNumber: '',
      remarks: '',
    });
    setFormErrors({});
  };

  const downloadBillPDF = async (billId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/bills/${billId}/pdf`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'bill.pdf';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Convert response to blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showToast('success', 'PDF downloaded successfully');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      showToast('error', 'Failed to download PDF');
    }
  };

  const validateBillForm = (): boolean => {
    const errors: { customerId?: string; billingMonth?: string } = {};

    if (!billFormData.customerId) {
      errors.customerId = 'Customer is required';
    }
    if (!billFormData.billingMonth) {
      errors.billingMonth = 'Billing month is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validatePaymentForm = (): boolean => {
    const errors: { amount?: string; paymentMethod?: string } = {};

    if (!paymentFormData.amount || paymentFormData.amount.trim() === '') {
      errors.amount = 'Amount is required';
    } else {
      const amount = parseFloat(paymentFormData.amount);
      if (isNaN(amount) || amount <= 0) {
        errors.amount = 'Amount must be greater than 0';
      } else if (selectedBillForPayment && amount > selectedBillForPayment.outstandingAmount) {
        errors.amount = `Amount cannot exceed outstanding amount (${selectedBillForPayment.outstandingAmount.toFixed(2)})`;
      }
    }

    if (!paymentFormData.paymentMethod) {
      errors.paymentMethod = 'Payment method is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleGenerateBill = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateBillForm()) {
      showToast.warning('Please fill in all required fields');
      return;
    }

    const toastId = showToast.loading('Generating bill...');

    try {
      setSubmitting(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/bills', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: billFormData.customerId,
          billingMonth: parseInt(billFormData.billingMonth),
          billingYear: parseInt(billFormData.billingYear),
          dueDate: billFormData.dueDate || undefined,
        }),
      });

      const data = await response.json();

      showToast.dismiss(toastId);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate bill');
      }

      showToast.success(`Bill ${data.data.billNumber} generated successfully!`);
      closeBillModal();
      fetchBills();
    } catch (err) {
      showToast.dismiss(toastId);
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate bill';
      showToast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePaymentForm()) {
      showToast.warning('Please check the payment amount');
      return;
    }

    const toastId = showToast.loading('Recording payment...');

    try {
      setSubmitting(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          billId: paymentFormData.billId,
          amount: parseFloat(paymentFormData.amount),
          paymentMethod: paymentFormData.paymentMethod,
          paymentDate: paymentFormData.paymentDate,
          referenceNumber: paymentFormData.referenceNumber || undefined,
          remarks: paymentFormData.remarks || undefined,
        }),
      });

      const data = await response.json();

      showToast.dismiss(toastId);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to record payment');
      }

      showToast.success('Payment recorded successfully! Bill status updated.');
      closePaymentModal();
      fetchBills();
    } catch (err) {
      showToast.dismiss(toastId);
      const errorMessage = err instanceof Error ? err.message : 'Failed to record payment';
      showToast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number): string => {
    return `$${amount.toFixed(2)}`;
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      UNPAID: 'bg-red-100 text-red-800',
      PARTIALLY_PAID: 'bg-yellow-100 text-yellow-800',
      PAID: 'bg-green-100 text-green-800',
      OVERDUE: 'bg-red-100 text-red-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
    };

    return (
      <span
        className={`px-3 py-1 text-xs font-semibold rounded-full ring-1 ${
          status === 'PAID' ? 'bg-green-100 text-green-800 ring-green-600' :
          status === 'PARTIALLY_PAID' ? 'bg-yellow-100 text-yellow-800 ring-yellow-600' :
          status === 'UNPAID' || status === 'OVERDUE' ? 'bg-red-100 text-red-800 ring-red-600' :
          'bg-gray-100 text-gray-800 ring-gray-600'
        }`}
      >
        {status.replace('_', ' ')}
      </span>
    );
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const paymentMethods = [
    { value: 'CASH', label: 'Cash' },
    { value: 'CARD', label: 'Card' },
    { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
    { value: 'ONLINE', label: 'Online' },
    { value: 'CHEQUE', label: 'Cheque' },
    { value: 'MOBILE_PAYMENT', label: 'Mobile Payment' },
  ];

  return (
    <DashboardLayout allowedRoles={['CLERK']}>
      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Billing Clerk Dashboard</h1>
        <p className="text-gray-600 mt-2">Manage billing and customer payments</p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{successMessage}</span>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-green-600 hover:text-green-800"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-800"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 p-6 border border-gray-100">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-3 shadow-sm">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Bills</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingBills}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 p-6 border border-gray-100">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-3 shadow-sm">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Today's Payments</p>
              <p className="text-2xl font-bold text-gray-900">{stats.todayPayments}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 p-6 border border-gray-100">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg p-3 shadow-sm">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Outstanding</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalOutstanding)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 p-6 mb-8 border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={openBillModal}
            className="p-6 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-gradient-to-br hover:from-green-50 hover:to-green-100 hover:shadow-md transform hover:scale-105 transition-all duration-200 text-left"
          >
            <div className="text-green-600 mb-2">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900">Generate Bill</h3>
            <p className="text-sm text-gray-600">Create customer bills</p>
          </button>

          <button
            onClick={() => {
              if (bills.length > 0) {
                const unpaidBill = bills.find(b => b.outstandingAmount > 0);
                if (unpaidBill) {
                  openPaymentModal(unpaidBill);
                } else {
                  setError('No bills with outstanding amounts found');
                }
              } else {
                setError('No bills available');
              }
            }}
            className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-gradient-to-br hover:from-blue-50 hover:to-blue-100 hover:shadow-md transform hover:scale-105 transition-all duration-200 text-left"
          >
            <div className="text-blue-600 mb-2">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900">Record Payment</h3>
            <p className="text-sm text-gray-600">Process customer payments</p>
          </button>
        </div>
      </div>

      {/* Outstanding Bills Table */}
      <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <h2 className="text-lg font-semibold text-gray-900">All Bills</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading bills...</p>
          </div>
        ) : bills.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="mt-2">No bills found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bill Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Outstanding
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {bills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-green-50 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{bill.billNumber}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{bill.customer.name}</div>
                      <div className="text-sm text-gray-500">{bill.customer.type}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {monthNames[bill.billingMonth - 1]} {bill.billingYear}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDate(bill.dueDate)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatCurrency(bill.totalAmount)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        {formatCurrency(bill.outstandingAmount)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(bill.status)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => downloadBillPDF(bill.id)}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transform hover:scale-105 transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          title="Download PDF"
                        >
                          <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          PDF
                        </button>
                        {bill.outstandingAmount > 0 && bill.status !== 'CANCELLED' && (
                          <button
                            onClick={() => openPaymentModal(bill)}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 transform hover:scale-105 transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                          >
                            <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Payment
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Generate Bill Modal */}
      {showBillModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Generate New Bill</h3>
              <button
                onClick={closeBillModal}
                className="text-gray-400 hover:text-gray-600"
                disabled={submitting}
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleGenerateBill}>
              <div className="mb-4">
                <label htmlFor="customerId" className="block text-sm font-medium text-gray-700 mb-2">
                  Customer <span className="text-red-500">*</span>
                </label>
                <select
                  id="customerId"
                  value={billFormData.customerId}
                  onChange={(e) => setBillFormData({ ...billFormData, customerId: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                    formErrors.customerId ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={submitting}
                >
                  <option value="">Select a customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} - {customer.type}
                    </option>
                  ))}
                </select>
                {formErrors.customerId && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.customerId}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="billingMonth" className="block text-sm font-medium text-gray-700 mb-2">
                    Month <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="billingMonth"
                    value={billFormData.billingMonth}
                    onChange={(e) => setBillFormData({ ...billFormData, billingMonth: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      formErrors.billingMonth ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={submitting}
                  >
                    <option value="">Select month</option>
                    {monthNames.map((month, index) => (
                      <option key={index + 1} value={index + 1}>
                        {month}
                      </option>
                    ))}
                  </select>
                  {formErrors.billingMonth && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.billingMonth}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="billingYear" className="block text-sm font-medium text-gray-700 mb-2">
                    Year <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    id="billingYear"
                    value={billFormData.billingYear}
                    onChange={(e) => setBillFormData({ ...billFormData, billingYear: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    disabled={submitting}
                    min="2000"
                    max="2100"
                  />
                </div>
              </div>

              <div className="mb-6">
                <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date (Optional)
                </label>
                <input
                  type="date"
                  id="dueDate"
                  value={billFormData.dueDate}
                  onChange={(e) => setBillFormData({ ...billFormData, dueDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  disabled={submitting}
                />
                <p className="mt-1 text-xs text-gray-500">Leave empty for default (15 days from now)</p>
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={closeBillModal}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  disabled={submitting}
                >
                  {submitting ? 'Generating...' : 'Generate Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Payment Modal */}
      {showPaymentModal && selectedBillForPayment && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Record Payment</h3>
              <button
                onClick={closePaymentModal}
                className="text-gray-400 hover:text-gray-600"
                disabled={submitting}
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Bill Info */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Bill Number</p>
              <p className="font-semibold text-gray-900">{selectedBillForPayment.billNumber}</p>
              <p className="text-sm text-gray-600 mt-2">Customer</p>
              <p className="font-semibold text-gray-900">{selectedBillForPayment.customer.name}</p>
              <p className="text-sm text-gray-600 mt-2">Outstanding Amount</p>
              <p className="font-semibold text-gray-900 text-lg">
                {formatCurrency(selectedBillForPayment.outstandingAmount)}
              </p>
            </div>

            <form onSubmit={handleAddPayment}>
              <div className="mb-4">
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Amount <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="amount"
                  step="0.01"
                  value={paymentFormData.amount}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                    formErrors.amount ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter payment amount"
                  disabled={submitting}
                />
                {formErrors.amount && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.amount}</p>
                )}
              </div>

              <div className="mb-4">
                <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method <span className="text-red-500">*</span>
                </label>
                <select
                  id="paymentMethod"
                  value={paymentFormData.paymentMethod}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentMethod: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                    formErrors.paymentMethod ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={submitting}
                >
                  {paymentMethods.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
                {formErrors.paymentMethod && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.paymentMethod}</p>
                )}
              </div>

              <div className="mb-4">
                <label htmlFor="paymentDate" className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="paymentDate"
                  value={paymentFormData.paymentDate}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentDate: e.target.value })}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  disabled={submitting}
                />
              </div>

              <div className="mb-4">
                <label htmlFor="referenceNumber" className="block text-sm font-medium text-gray-700 mb-2">
                  Reference Number (Optional)
                </label>
                <input
                  type="text"
                  id="referenceNumber"
                  value={paymentFormData.referenceNumber}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, referenceNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Transaction/cheque number"
                  disabled={submitting}
                />
              </div>

              <div className="mb-6">
                <label htmlFor="remarks" className="block text-sm font-medium text-gray-700 mb-2">
                  Remarks (Optional)
                </label>
                <textarea
                  id="remarks"
                  rows={3}
                  value={paymentFormData.remarks}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, remarks: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Add any notes about this payment"
                  disabled={submitting}
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={closePaymentModal}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  disabled={submitting}
                >
                  {submitting ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
