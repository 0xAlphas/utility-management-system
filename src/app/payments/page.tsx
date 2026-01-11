'use client';


import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { showToast } from '@/lib/toast';

interface Bill {
  id: string;
  billNumber: string;
  totalAmount: number;
  outstandingAmount: number;
  status: string;
  customer: {
    id: string;
    name: string;
    type: string;
  };
}

interface Payment {
  id: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  referenceNumber?: string;
  remarks?: string;
  recordedBy?: string;
  createdAt: string;
  bill: Bill;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchPayments();
  }, []);

  useEffect(() => {
    filterPayments();
  }, [payments, searchTerm, methodFilter, dateFilter]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/payments?limit=100', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch payments');
      }

      const data = await response.json();
      setPayments(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch payments');
      showToast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const filterPayments = () => {
    let filtered = [...payments];

    // Filter by payment method
    if (methodFilter !== 'ALL') {
      filtered = filtered.filter(payment => payment.paymentMethod === methodFilter);
    }

    // Filter by date
    if (dateFilter !== 'ALL') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      filtered = filtered.filter(payment => {
        const paymentDate = new Date(payment.paymentDate);
        const paymentDay = new Date(paymentDate.getFullYear(), paymentDate.getMonth(), paymentDate.getDate());

        if (dateFilter === 'TODAY') {
          return paymentDay.getTime() === today.getTime();
        } else if (dateFilter === 'WEEK') {
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return paymentDay >= weekAgo;
        } else if (dateFilter === 'MONTH') {
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          return paymentDay >= monthAgo;
        }
        return true;
      });
    }

    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(payment =>
        payment.bill.billNumber.toLowerCase().includes(search) ||
        payment.bill.customer.name.toLowerCase().includes(search) ||
        payment.referenceNumber?.toLowerCase().includes(search) ||
        payment.paymentMethod.toLowerCase().includes(search)
      );
    }

    setFilteredPayments(filtered);
  };

  const viewPaymentDetails = (payment: Payment) => {
    setSelectedPayment(payment);
    setShowDetailsModal(true);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string): string => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number): string => {
    return `$${amount.toFixed(2)}`;
  };

  const paymentMethods = [
    { value: 'CASH', label: 'Cash' },
    { value: 'CARD', label: 'Card' },
    { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
    { value: 'ONLINE', label: 'Online' },
    { value: 'CHEQUE', label: 'Cheque' },
    { value: 'MOBILE_PAYMENT', label: 'Mobile Payment' },
  ];

  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  const todayPayments = payments.filter(p => {
    const paymentDate = new Date(p.paymentDate);
    const today = new Date();
    return paymentDate.toDateString() === today.toDateString();
  }).length;
  const todayAmount = payments.filter(p => {
    const paymentDate = new Date(p.paymentDate);
    const today = new Date();
    return paymentDate.toDateString() === today.toDateString();
  }).reduce((sum, p) => sum + p.amount, 0);

  return (
    <DashboardLayout allowedRoles={['ADMIN', 'CLERK', 'MANAGER']}>
      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Payments Management</h1>
        <p className="text-gray-600 mt-2">View and track all payment transactions</p>
      </div>

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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 p-6 border border-gray-100">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-3 shadow-sm">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Payments</p>
              <p className="text-2xl font-bold text-gray-900">{payments.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 p-6 border border-gray-100">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-3 shadow-sm">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Amount</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalAmount)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 p-6 border border-gray-100">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-3 shadow-sm">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Today's Payments</p>
              <p className="text-2xl font-bold text-gray-900">{todayPayments}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 p-6 border border-gray-100">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg p-3 shadow-sm">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 8h6m-5 0a3 3 0 110 6H9l3 3m-3-6h6m6 1a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Today's Amount</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(todayAmount)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8 border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
              Search Payments
            </label>
            <input
              type="text"
              id="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by bill number, customer, reference..."
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="method" className="block text-sm font-medium text-gray-700 mb-2">
              Payment Method
            </label>
            <select
              id="method"
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Methods</option>
              {paymentMethods.map(method => (
                <option key={method.value} value={method.value}>{method.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
              Date Range
            </label>
            <select
              id="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Today</option>
              <option value="WEEK">Last 7 Days</option>
              <option value="MONTH">Last 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <h2 className="text-lg font-semibold text-gray-900">All Payments</h2>
          <p className="text-sm text-gray-600 mt-1">
            Showing {filteredPayments.length} of {payments.length} payments
          </p>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading payments...</p>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="mt-2">No payments found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bill Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reference
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-blue-50 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDate(payment.paymentDate)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{payment.bill.billNumber}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{payment.bill.customer.name}</div>
                      <div className="text-sm text-gray-500">{payment.bill.customer.type}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-green-600">{formatCurrency(payment.amount)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 ring-1 ring-blue-600">
                        {payment.paymentMethod.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{payment.referenceNumber || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => viewPaymentDetails(payment)}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 transform hover:scale-105 transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                      >
                        <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment Details Modal */}
      {showDetailsModal && selectedPayment && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Payment Details</h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Payment Date</p>
                  <p className="font-semibold text-gray-900">{formatDate(selectedPayment.paymentDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Amount Paid</p>
                  <p className="font-semibold text-green-600 text-lg">{formatCurrency(selectedPayment.amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Payment Method</p>
                  <p className="font-semibold text-gray-900">{selectedPayment.paymentMethod.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Reference Number</p>
                  <p className="font-semibold text-gray-900">{selectedPayment.referenceNumber || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Bill Number</p>
                  <p className="font-semibold text-gray-900">{selectedPayment.bill.billNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Bill Status</p>
                  <p className="font-semibold text-gray-900">{selectedPayment.bill.status.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Customer</p>
                  <p className="font-semibold text-gray-900">{selectedPayment.bill.customer.name}</p>
                  <p className="text-sm text-gray-500">{selectedPayment.bill.customer.type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Bill Total</p>
                  <p className="font-semibold text-gray-900">{formatCurrency(selectedPayment.bill.totalAmount)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Outstanding Amount</p>
                  <p className="font-semibold text-red-600">{formatCurrency(selectedPayment.bill.outstandingAmount)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Recorded By</p>
                  <p className="font-semibold text-gray-900">{selectedPayment.recordedBy || 'System'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Created At</p>
                  <p className="font-semibold text-gray-900">{formatDateTime(selectedPayment.createdAt)}</p>
                </div>
              </div>

              {selectedPayment.remarks && (
                <div className="col-span-2">
                  <p className="text-sm text-gray-600">Remarks</p>
                  <p className="font-semibold text-gray-900 bg-gray-50 p-3 rounded-md">{selectedPayment.remarks}</p>
                </div>
              )}

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
