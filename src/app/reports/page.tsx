'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { showToast } from '@/lib/toast';
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

export default function ReportsPage() {
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [defaultersData, setDefaultersData] = useState<DefaultersData | null>(null);
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('month');
  const [activeTab, setActiveTab] = useState<'revenue' | 'usage' | 'defaulters'>('revenue');

  useEffect(() => {
    fetchReports();
  }, [dateRange]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const endDate = new Date();
      const startDate = new Date();

      if (dateRange === 'month') {
        startDate.setMonth(startDate.getMonth() - 1);
      } else if (dateRange === 'week') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (dateRange === 'year') {
        startDate.setFullYear(startDate.getFullYear() - 1);
      }

      const [revenueRes, defaultersRes, usageRes] = await Promise.all([
        fetch(`/api/reports/revenue?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&groupBy=month`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch('/api/reports/defaulters?limit=50', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`/api/reports/usage?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
      ]);

      if (!revenueRes.ok || !defaultersRes.ok || !usageRes.ok) {
        throw new Error('Failed to fetch one or more reports');
      }

      const [revenue, defaulters, usage] = await Promise.all([
        revenueRes.json(),
        defaultersRes.json(),
        usageRes.json(),
      ]);

      setRevenueData(revenue.data);
      setDefaultersData(defaulters);
      setUsageData(usage.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch reports');
      showToast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return `$${amount.toFixed(2)}`;
  };

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
      <DashboardLayout allowedRoles={['ADMIN', 'MANAGER']}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading reports...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout allowedRoles={['ADMIN', 'MANAGER']}>
      {/* Page Title */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-2">Comprehensive business insights and statistics</p>
        </div>
        <div>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
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

      {/* Tabs */}
      <div className="mb-8 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('revenue')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
              activeTab === 'revenue'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Revenue Analytics
          </button>
          <button
            onClick={() => setActiveTab('usage')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
              activeTab === 'usage'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Usage Analytics
          </button>
          <button
            onClick={() => setActiveTab('defaulters')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
              activeTab === 'defaulters'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Defaulters Report
          </button>
        </nav>
      </div>

      {/* Revenue Tab */}
      {activeTab === 'revenue' && revenueData && (
        <>
          {/* Revenue Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 p-6 border border-gray-100">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-3 shadow-sm">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(revenueData.summary.totalRevenue)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 p-6 border border-gray-100">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-3 shadow-sm">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Payments</p>
                  <p className="text-2xl font-bold text-gray-900">{revenueData.summary.totalPayments}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 p-6 border border-gray-100">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg p-3 shadow-sm">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Outstanding</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(revenueData.summary.totalOutstanding)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 p-6 border border-gray-100">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-gradient-to-br from-red-500 to-red-600 rounded-lg p-3 shadow-sm">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Unpaid Bills</p>
                  <p className="text-2xl font-bold text-gray-900">{revenueData.summary.outstandingBillsCount}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Revenue Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 p-6 border border-gray-100">
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

            <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 p-6 border border-gray-100">
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

            <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 p-6 border border-gray-100 lg:col-span-2">
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
          </div>
        </>
      )}

      {/* Usage Tab */}
      {activeTab === 'usage' && usageData && (
        <>
          {/* Usage Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 p-6 border border-gray-100">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-3 shadow-sm">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Consumption</p>
                  <p className="text-2xl font-bold text-gray-900">{usageData.summary.totalConsumption.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 p-6 border border-gray-100">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-3 shadow-sm">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Average</p>
                  <p className="text-2xl font-bold text-gray-900">{usageData.summary.avgConsumption.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 p-6 border border-gray-100">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-3 shadow-sm">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Maximum</p>
                  <p className="text-2xl font-bold text-gray-900">{usageData.summary.maxConsumption.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 p-6 border border-gray-100">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg p-3 shadow-sm">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Minimum</p>
                  <p className="text-2xl font-bold text-gray-900">{usageData.summary.minConsumption.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Usage Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 p-6 border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Consumption by Customer Type</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getUsageByCustomerTypeChart()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="consumption" fill="#3b82f6" name="Total" />
                  <Bar dataKey="average" fill="#f59e0b" name="Average" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 p-6 border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Consumption Trend</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={getUsageByMonthChart()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="consumption" stroke="#3b82f6" strokeWidth={2} name="Total" />
                  <Line type="monotone" dataKey="average" stroke="#f59e0b" strokeWidth={2} name="Average" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Consumers Table */}
          {usageData.topConsumers.length > 0 && (
            <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden mb-8 border border-gray-100">
              <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                <h2 className="text-lg font-semibold text-gray-900">Top Consumers</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Consumption</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {usageData.topConsumers.slice(0, 10).map((consumer) => (
                      <tr key={consumer.customerId} className="hover:bg-blue-50 transition-colors duration-150">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{consumer.customerName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{consumer.customerType}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{consumer.period}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{consumer.consumption.toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(consumer.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Defaulters Tab */}
      {activeTab === 'defaulters' && defaultersData && (
        <>
          {/* Defaulters Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 p-6 border border-gray-100">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-gradient-to-br from-red-500 to-red-600 rounded-lg p-3 shadow-sm">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Defaulters</p>
                  <p className="text-2xl font-bold text-gray-900">{defaultersData.summary.totalDefaulters}</p>
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
                  <p className="text-sm font-medium text-gray-600">Total Outstanding</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(defaultersData.summary.totalOutstanding)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 p-6 border border-gray-100">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-3 shadow-sm">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Average Outstanding</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(defaultersData.summary.avgOutstanding)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Defaulters Chart */}
          <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 p-6 mb-8 border border-gray-100">
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

          {/* Defaulters Table */}
          {defaultersData.data.length > 0 && (
            <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden border border-gray-100">
              <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                <h2 className="text-lg font-semibold text-gray-900">Defaulters List</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bill Number</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Outstanding</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days Overdue</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {defaultersData.data.map((defaulter) => (
                      <tr key={defaulter.id} className="hover:bg-red-50 transition-colors duration-150">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{defaulter.billNumber}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{defaulter.customer.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{defaulter.customer.type}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600">{formatCurrency(defaulter.outstandingAmount)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-3 py-1 text-xs font-semibold rounded-full ring-1 ${
                              defaulter.daysOverdue > 90
                                ? 'bg-red-100 text-red-800 ring-red-600'
                                : defaulter.daysOverdue > 30
                                ? 'bg-yellow-100 text-yellow-800 ring-yellow-600'
                                : 'bg-green-100 text-green-800 ring-green-600'
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
        </>
      )}
    </DashboardLayout>
  );
}
