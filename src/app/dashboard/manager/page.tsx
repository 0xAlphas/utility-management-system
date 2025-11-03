'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface DashboardStats {
  overview: {
    customers: {
      total: number;
      active: number;
      byType: Array<{ type: string; _count: { type: number } }>;
    };
    meters: {
      total: number;
      active: number;
    };
    bills: {
      total: number;
      unpaid: number;
      totalOutstanding: number;
    };
    revenue: {
      period: string;
      amount: number;
      paymentsCount: number;
      byPaymentMethod: Record<string, { count: number; amount: number }>;
    };
    complaints: {
      open: number;
    };
  };
}

interface RevenueData {
  summary: {
    totalRevenue: number;
    totalPayments: number;
    totalOutstanding: number;
    outstandingBillsCount: number;
  };
  byPaymentMethod: Record<string, { count: number; amount: number }>;
  byCustomerType: Record<string, { count: number; amount: number }>;
  byPeriod: Record<string, { count: number; amount: number }>;
}

interface DefaultersData {
  data: Array<{
    id: string;
    billNumber: string;
    customer: {
      name: string;
      type: string;
    };
    outstandingAmount: number;
    daysOverdue: number;
  }>;
  summary: {
    totalDefaulters: number;
    totalOutstanding: number;
    avgOutstanding: number;
    byAgeGroup: Record<string, { count: number; totalOutstanding: number }>;
  };
}

interface UsageData {
  summary: {
    totalBills: number;
    totalConsumption: number;
    avgConsumption: number;
    maxConsumption: number;
    minConsumption: number;
  };
  byCustomerType: Record<string, { count: number; totalConsumption: number; avgConsumption: number }>;
  byMonth: Record<string, { count: number; totalConsumption: number; avgConsumption: number }>;
  topConsumers: Array<{
    customerId: string;
    customerName: string;
    customerType: string;
    consumption: number;
    amount: number;
    period: string;
  }>;
}

const COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#ec4899'];

export default function ManagerDashboard() {
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [defaultersData, setDefaultersData] = useState<DefaultersData | null>(null);
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('month');

  useEffect(() => {
    fetchAllReports();
  }, [period]);

  const fetchAllReports = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Calculate date range based on period
      const endDate = new Date();
      const startDate = new Date();

      if (period === 'month') {
        startDate.setMonth(startDate.getMonth() - 1);
      } else if (period === 'week') {
        startDate.setDate(startDate.getDate() - 7);
      } else {
        startDate.setFullYear(startDate.getFullYear() - 1);
      }

      const [dashboardRes, revenueRes, defaultersRes, usageRes] = await Promise.all([
        fetch(`/api/reports/dashboard?period=${period}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`/api/reports/revenue?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&groupBy=month`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch('/api/reports/defaulters?limit=10', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`/api/reports/usage?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
      ]);

      if (!dashboardRes.ok || !revenueRes.ok || !defaultersRes.ok || !usageRes.ok) {
        throw new Error('Failed to fetch reports');
      }

      const [dashboard, revenue, defaulters, usage] = await Promise.all([
        dashboardRes.json(),
        revenueRes.json(),
        defaultersRes.json(),
        usageRes.json(),
      ]);

      setDashboardStats(dashboard.data);
      setRevenueData(revenue.data);
      setDefaultersData(defaulters);
      setUsageData(usage.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return `$${amount.toFixed(2)}`;
  };

  // Transform data for charts
  const getRevenueByPeriodChart = () => {
    if (!revenueData) return [];
    return Object.entries(revenueData.byPeriod)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([period, data]) => ({
        period,
        revenue: data.amount,
        payments: data.count,
      }));
  };

  const getRevenueByPaymentMethodChart = () => {
    if (!revenueData) return [];
    return Object.entries(revenueData.byPaymentMethod).map(([method, data]) => ({
      name: method.replace('_', ' '),
      value: data.amount,
      count: data.count,
    }));
  };

  const getRevenueByCustomerTypeChart = () => {
    if (!revenueData) return [];
    return Object.entries(revenueData.byCustomerType).map(([type, data]) => ({
      name: type,
      value: data.amount,
      count: data.count,
    }));
  };

  const getUsageByCustomerTypeChart = () => {
    if (!usageData) return [];
    return Object.entries(usageData.byCustomerType).map(([type, data]) => ({
      name: type,
      consumption: data.totalConsumption,
      average: data.avgConsumption,
    }));
  };

  const getUsageByMonthChart = () => {
    if (!usageData) return [];
    return Object.entries(usageData.byMonth)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, data]) => ({
        month,
        consumption: data.totalConsumption,
        average: data.avgConsumption,
      }));
  };

  const getDefaultersByAgeChart = () => {
    if (!defaultersData) return [];
    const order = ['Not Yet Due', '0-30 days', '31-60 days', '61-90 days', '90+ days'];
    return order
      .filter(group => defaultersData.summary.byAgeGroup[group])
      .map(group => ({
        name: group,
        count: defaultersData.summary.byAgeGroup[group].count,
        amount: defaultersData.summary.byAgeGroup[group].totalOutstanding,
      }));
  };

  if (loading) {
    return (
      <DashboardLayout allowedRoles={['MANAGER']}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout allowedRoles={['MANAGER']}>
      {/* Page Title */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manager Dashboard</h1>
          <p className="text-gray-600 mt-2">Analytics and performance insights</p>
        </div>
        <div>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="year">Last Year</option>
          </select>
        </div>
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
      {dashboardStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-purple-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Period Revenue</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatCurrency(dashboardStats.overview.revenue.amount)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Payments</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {dashboardStats.overview.revenue.paymentsCount}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-yellow-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Outstanding</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatCurrency(dashboardStats.overview.bills.totalOutstanding)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-red-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Unpaid Bills</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {dashboardStats.overview.bills.unpaid}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Revenue Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue by Period */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={getRevenueByPeriodChart()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={2} name="Revenue" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue by Payment Method */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Payment Method</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={getRevenueByPaymentMethodChart()}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {getRevenueByPaymentMethodChart().map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Revenue by Customer Type & Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue by Customer Type */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Customer Type</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={getRevenueByCustomerTypeChart()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Legend />
              <Bar dataKey="value" fill="#10b981" name="Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Usage by Customer Type */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Consumption by Customer Type</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={getUsageByCustomerTypeChart()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="consumption" fill="#3b82f6" name="Total Consumption" />
              <Bar dataKey="average" fill="#f59e0b" name="Average" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Usage Trend & Defaulters */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Usage Trend */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Consumption Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={getUsageByMonthChart()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="consumption" stroke="#3b82f6" strokeWidth={2} name="Total Consumption" />
              <Line type="monotone" dataKey="average" stroke="#f59e0b" strokeWidth={2} name="Average" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Defaulters by Age */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Defaulters by Age Group</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={getDefaultersByAgeChart()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value, name) => name === 'amount' ? formatCurrency(Number(value)) : value} />
              <Legend />
              <Bar dataKey="count" fill="#ef4444" name="Count" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Consumers Table */}
      {usageData && usageData.topConsumers.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Top Consumers</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Consumption
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {usageData.topConsumers.slice(0, 10).map((consumer) => (
                  <tr key={consumer.customerId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{consumer.customerName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{consumer.customerType}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{consumer.period}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">{consumer.consumption.toFixed(2)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatCurrency(consumer.amount)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Defaulters Table */}
      {defaultersData && defaultersData.data.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Defaulters</h2>
          </div>
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
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Outstanding
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Days Overdue
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {defaultersData.data.slice(0, 10).map((defaulter) => (
                  <tr key={defaulter.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{defaulter.billNumber}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{defaulter.customer.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{defaulter.customer.type}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-red-600">
                        {formatCurrency(defaulter.outstandingAmount)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          defaulter.daysOverdue > 90
                            ? 'bg-red-100 text-red-800'
                            : defaulter.daysOverdue > 30
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {defaulter.daysOverdue} days
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary Stats Cards */}
      {revenueData && usageData && defaultersData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Revenue Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Revenue:</span>
                <span className="text-sm font-semibold text-gray-900">
                  {formatCurrency(revenueData.summary.totalRevenue)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Payments:</span>
                <span className="text-sm font-semibold text-gray-900">
                  {revenueData.summary.totalPayments}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Outstanding:</span>
                <span className="text-sm font-semibold text-red-600">
                  {formatCurrency(revenueData.summary.totalOutstanding)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Usage Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Consumption:</span>
                <span className="text-sm font-semibold text-gray-900">
                  {usageData.summary.totalConsumption.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Average:</span>
                <span className="text-sm font-semibold text-gray-900">
                  {usageData.summary.avgConsumption.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Max:</span>
                <span className="text-sm font-semibold text-blue-600">
                  {usageData.summary.maxConsumption.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Defaulters Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Defaulters:</span>
                <span className="text-sm font-semibold text-gray-900">
                  {defaultersData.summary.totalDefaulters}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Outstanding:</span>
                <span className="text-sm font-semibold text-red-600">
                  {formatCurrency(defaultersData.summary.totalOutstanding)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Average:</span>
                <span className="text-sm font-semibold text-gray-900">
                  {formatCurrency(defaultersData.summary.avgOutstanding)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <p className="text-sm text-purple-800">
          <strong>Manager Access:</strong> You have access to all reports, analytics, revenue tracking,
          and can view system-wide statistics and performance metrics.
        </p>
      </div>
    </DashboardLayout>
  );
}
