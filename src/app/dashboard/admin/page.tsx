'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Modal from '@/components/Modal';

interface Customer {
  id: string;
  name: string;
  type: string;
  contact: string;
  email: string | null;
  address: string;
  isActive: boolean;
}

interface Meter {
  id: string;
  meterNumber: string;
  status: string;
  installationDate: string;
  customer: { name: string };
  utilityType: { name: string };
}

interface Tariff {
  id: string;
  name: string;
  rate: number;
  minUsage: number;
  maxUsage: number | null;
  fixedCharge: number;
  isActive: boolean;
  utilityType: { name: string };
}

interface UtilityType {
  id: string;
  name: string;
  unit: string;
}

export default function AdminDashboard() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [meters, setMeters] = useState<Meter[]>([]);
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [utilityTypes, setUtilityTypes] = useState<UtilityType[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showMeterModal, setShowMeterModal] = useState(false);
  const [showTariffModal, setShowTariffModal] = useState(false);

  // Form states
  const [customerForm, setCustomerForm] = useState({
    name: '',
    type: 'HOUSEHOLD',
    contact: '',
    email: '',
    address: '',
    city: '',
    postalCode: '',
  });

  const [meterForm, setMeterForm] = useState({
    meterNumber: '',
    customerId: '',
    utilityTypeId: '',
  });

  const [tariffForm, setTariffForm] = useState({
    name: '',
    utilityTypeId: '',
    rate: '',
    minUsage: '',
    maxUsage: '',
    fixedCharge: '',
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const [customersRes, metersRes, tariffsRes, utilityTypesRes] = await Promise.all([
        fetch('/api/customers', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/meters', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/tariffs', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/utility-types', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (customersRes.ok) {
        const data = await customersRes.json();
        setCustomers(data.data || []);
      }

      if (metersRes.ok) {
        const data = await metersRes.json();
        setMeters(data.data || []);
      }

      if (tariffsRes.ok) {
        const data = await tariffsRes.json();
        setTariffs(data.data || []);
      }

      if (utilityTypesRes.ok) {
        const data = await utilityTypesRes.json();
        setUtilityTypes(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Add Customer
  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(customerForm),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add customer');
      }

      setSuccess('Customer added successfully!');
      setShowCustomerModal(false);
      setCustomerForm({
        name: '',
        type: 'HOUSEHOLD',
        contact: '',
        email: '',
        address: '',
        city: '',
        postalCode: '',
      });
      fetchData(); // Refresh data
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Add Meter
  const handleAddMeter = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/meters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(meterForm),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add meter');
      }

      setSuccess('Meter added successfully!');
      setShowMeterModal(false);
      setMeterForm({
        meterNumber: '',
        customerId: '',
        utilityTypeId: '',
      });
      fetchData(); // Refresh data
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Add Tariff
  const handleAddTariff = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...tariffForm,
        rate: parseFloat(tariffForm.rate),
        minUsage: parseFloat(tariffForm.minUsage),
        maxUsage: tariffForm.maxUsage ? parseFloat(tariffForm.maxUsage) : null,
        fixedCharge: parseFloat(tariffForm.fixedCharge),
      };

      const response = await fetch('/api/tariffs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add tariff');
      }

      setSuccess('Tariff added successfully!');
      setShowTariffModal(false);
      setTariffForm({
        name: '',
        utilityTypeId: '',
        rate: '',
        minUsage: '',
        maxUsage: '',
        fixedCharge: '',
      });
      fetchData(); // Refresh data
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <DashboardLayout allowedRoles={['ADMIN']}>
      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">Manage customers, meters, and tariffs</p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Customers</p>
              <p className="text-2xl font-semibold text-gray-900">{customers.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Meters</p>
              <p className="text-2xl font-semibold text-gray-900">{meters.filter(m => m.status === 'ACTIVE').length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-purple-500 rounded-md p-3">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Tariffs</p>
              <p className="text-2xl font-semibold text-gray-900">{tariffs.filter(t => t.isActive).length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Customers</h2>
          <button
            onClick={() => setShowCustomerModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center"
          >
            <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Customer
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">Loading...</td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">No customers found</td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{customer.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.type}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.contact}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.email || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{customer.address}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${customer.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {customer.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Meters Table */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Meters</h2>
          <button
            onClick={() => setShowMeterModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center"
          >
            <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Meter
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Meter Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utility Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Installation Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">Loading...</td>
                </tr>
              ) : meters.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">No meters found</td>
                </tr>
              ) : (
                meters.map((meter) => (
                  <tr key={meter.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{meter.meterNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{meter.customer.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{meter.utilityType.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(meter.installationDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        meter.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                        meter.status === 'INACTIVE' ? 'bg-gray-100 text-gray-800' :
                        meter.status === 'FAULTY' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {meter.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tariffs Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Tariffs</h2>
          <button
            onClick={() => setShowTariffModal(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center"
          >
            <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Tariff
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utility Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usage Range</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fixed Charge</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">Loading...</td>
                </tr>
              ) : tariffs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">No tariffs found</td>
                </tr>
              ) : (
                tariffs.map((tariff) => (
                  <tr key={tariff.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{tariff.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tariff.utilityType.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${tariff.rate.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {tariff.minUsage} - {tariff.maxUsage || '∞'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${tariff.fixedCharge.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${tariff.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {tariff.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Customer Modal */}
      <Modal isOpen={showCustomerModal} onClose={() => setShowCustomerModal(false)} title="Add New Customer">
        <form onSubmit={handleAddCustomer}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                required
                value={customerForm.name}
                onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
              <select
                required
                value={customerForm.type}
                onChange={(e) => setCustomerForm({ ...customerForm, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="HOUSEHOLD">Household</option>
                <option value="BUSINESS">Business</option>
                <option value="GOVERNMENT">Government</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact *</label>
              <input
                type="text"
                required
                value={customerForm.contact}
                onChange={(e) => setCustomerForm({ ...customerForm, contact: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={customerForm.email}
                onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
              <textarea
                required
                value={customerForm.address}
                onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  value={customerForm.city}
                  onChange={(e) => setCustomerForm({ ...customerForm, city: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                <input
                  type="text"
                  value={customerForm.postalCode}
                  onChange={(e) => setCustomerForm({ ...customerForm, postalCode: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setShowCustomerModal(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Add Customer
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Meter Modal */}
      <Modal isOpen={showMeterModal} onClose={() => setShowMeterModal(false)} title="Add New Meter">
        <form onSubmit={handleAddMeter}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Meter Number *</label>
              <input
                type="text"
                required
                value={meterForm.meterNumber}
                onChange={(e) => setMeterForm({ ...meterForm, meterNumber: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="e.g., MTR-001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
              <select
                required
                value={meterForm.customerId}
                onChange={(e) => setMeterForm({ ...meterForm, customerId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Select a customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} ({customer.type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Utility Type *</label>
              <select
                required
                value={meterForm.utilityTypeId}
                onChange={(e) => setMeterForm({ ...meterForm, utilityTypeId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Select utility type</option>
                {utilityTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name} ({type.unit})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setShowMeterModal(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              Add Meter
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Tariff Modal */}
      <Modal isOpen={showTariffModal} onClose={() => setShowTariffModal(false)} title="Add New Tariff">
        <form onSubmit={handleAddTariff}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tariff Name *</label>
              <input
                type="text"
                required
                value={tariffForm.name}
                onChange={(e) => setTariffForm({ ...tariffForm, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="e.g., Slab 1 - Low Usage"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Utility Type *</label>
              <select
                required
                value={tariffForm.utilityTypeId}
                onChange={(e) => setTariffForm({ ...tariffForm, utilityTypeId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Select utility type</option>
                {utilityTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rate (per unit) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={tariffForm.rate}
                  onChange={(e) => setTariffForm({ ...tariffForm, rate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fixed Charge *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={tariffForm.fixedCharge}
                  onChange={(e) => setTariffForm({ ...tariffForm, fixedCharge: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Usage *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={tariffForm.minUsage}
                  onChange={(e) => setTariffForm({ ...tariffForm, minUsage: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Usage</label>
                <input
                  type="number"
                  step="0.01"
                  value={tariffForm.maxUsage}
                  onChange={(e) => setTariffForm({ ...tariffForm, maxUsage: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Leave empty for unlimited"
                />
              </div>
            </div>

            <p className="text-xs text-gray-500">
              * Leave Max Usage empty for unlimited upper range
            </p>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setShowTariffModal(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
            >
              Add Tariff
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
