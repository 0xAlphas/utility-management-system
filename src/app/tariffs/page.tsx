'use client';


import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { showToast } from '@/lib/toast';

interface Tariff {
  id: string;
  name: string;
  rate: number;
  fixedCharge: number;
  minUsage: number;
  maxUsage: number | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  utilityType: {
    id: string;
    name: string;
    unit: string;
  };
}

interface UtilityType {
  id: string;
  name: string;
  unit: string;
}

export default function TariffsPage() {
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [utilityTypes, setUtilityTypes] = useState<UtilityType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [utilityTypeFilter, setUtilityTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedTariff, setSelectedTariff] = useState<Tariff | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    utilityTypeId: '',
    minUsage: '0',
    maxUsage: '',
    rate: '',
    fixedCharge: '0',
    effectiveFrom: new Date().toISOString().split('T')[0],
    effectiveTo: '',
  });

  useEffect(() => {
    fetchTariffs();
    fetchUtilityTypes();
  }, []);

  const fetchTariffs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/tariffs', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tariffs');
      }

      const data = await response.json();
      setTariffs(data.data || []);
    } catch (error) {
      showToast.error('Failed to load tariffs');
      console.error('Error fetching tariffs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUtilityTypes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/utility-types', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch utility types');
      }

      const data = await response.json();
      setUtilityTypes(data.data || []);
    } catch (error) {
      console.error('Error fetching utility types:', error);
    }
  };

  const handleAddTariff = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.utilityTypeId || !formData.rate) {
      showToast.error('Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem('token');

      const payload = {
        name: formData.name,
        utilityTypeId: formData.utilityTypeId,
        minUsage: parseFloat(formData.minUsage) || 0,
        maxUsage: formData.maxUsage ? parseFloat(formData.maxUsage) : null,
        rate: parseFloat(formData.rate),
        fixedCharge: parseFloat(formData.fixedCharge) || 0,
        effectiveFrom: formData.effectiveFrom,
        effectiveTo: formData.effectiveTo || null,
      };

      const response = await fetch('/api/tariffs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create tariff');
      }

      showToast.success('Tariff created successfully');
      setShowAddModal(false);
      setFormData({
        name: '',
        utilityTypeId: '',
        minUsage: '0',
        maxUsage: '',
        rate: '',
        fixedCharge: '0',
        effectiveFrom: new Date().toISOString().split('T')[0],
        effectiveTo: '',
      });
      fetchTariffs();
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : 'Failed to create tariff');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleDeleteTariff = async (tariffId: string) => {
    if (!confirm('Are you sure you want to delete this tariff? This will deactivate it.')) {
      return;
    }

    try {
      setDeleting(tariffId);
      const token = localStorage.getItem('token');

      const response = await fetch(`/api/tariffs/${tariffId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete tariff');
      }

      showToast.success('Tariff deleted successfully');
      fetchTariffs();
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : 'Failed to delete tariff');
    } finally {
      setDeleting(null);
    }
  };

  const filteredTariffs = tariffs.filter(tariff => {
    const matchesSearch =
      tariff.name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesUtilityType = utilityTypeFilter === 'ALL' || tariff.utilityType.name === utilityTypeFilter;
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && tariff.isActive) ||
      (statusFilter === 'INACTIVE' && !tariff.isActive);

    return matchesSearch && matchesUtilityType && matchesStatus;
  });

  const stats = {
    total: tariffs.length,
    active: tariffs.filter(t => t.isActive).length,
    inactive: tariffs.filter(t => !t.isActive).length,
    electricity: tariffs.filter(t => t.utilityType.name.toLowerCase() === 'electricity').length,
    water: tariffs.filter(t => t.utilityType.name.toLowerCase() === 'water').length,
  };

  const viewTariffDetails = (tariff: Tariff) => {
    setSelectedTariff(tariff);
    setShowDetailsModal(true);
  };

  const getUtilityTypeColor = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType === 'electricity' || lowerType === 'electric') return 'bg-blue-100 text-blue-800';
    if (lowerType === 'water') return 'bg-cyan-100 text-cyan-800';
    if (lowerType === 'gas') return 'bg-orange-100 text-orange-800';
    return 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <DashboardLayout allowedRoles={['ADMIN']}>
      <div className="space-y-6">
        {/* Page Title */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tariffs</h1>
            <p className="text-gray-600 mt-2">Manage utility pricing and tariff structures</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transform hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Tariff
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Tariffs</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
              </div>
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-3 shadow-sm">
                <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{stats.active}</p>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-3 shadow-sm">
                <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Inactive</p>
                <p className="text-3xl font-bold text-gray-600 mt-2">{stats.inactive}</p>
              </div>
              <div className="bg-gradient-to-br from-gray-500 to-gray-600 rounded-lg p-3 shadow-sm">
                <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Electricity</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">{stats.electricity}</p>
              </div>
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-3 shadow-sm">
                <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 p-6 border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <input
                type="text"
                placeholder="Search tariffs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Utility Type
              </label>
              <select
                value={utilityTypeFilter}
                onChange={(e) => setUtilityTypeFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Types</option>
                <option value="Electricity">Electricity</option>
                <option value="Water">Water</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tariffs Table */}
        <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <h2 className="text-lg font-semibold text-gray-900">All Tariffs</h2>
            <p className="text-sm text-gray-600 mt-1">Showing {filteredTariffs.length} of {tariffs.length} tariffs</p>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredTariffs.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No tariffs found</h3>
                <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filters.</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Tariff Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Utility Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Usage Range
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Fixed Charge
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Rate/Unit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Effective From
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTariffs.map((tariff) => (
                    <tr key={tariff.id} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{tariff.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getUtilityTypeColor(tariff.utilityType.name)}`}>
                          {tariff.utilityType.name}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {tariff.minUsage} - {tariff.maxUsage ? tariff.maxUsage : '∞'} {tariff.utilityType.unit}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">${tariff.fixedCharge.toFixed(2)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-blue-600">${tariff.rate.toFixed(4)}/{tariff.utilityType.unit}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(tariff.effectiveFrom)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          tariff.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {tariff.isActive ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => viewTariffDetails(tariff)}
                            className="text-blue-600 hover:text-blue-900 transition-colors duration-150"
                          >
                            View Details
                          </button>
                          <button
                            onClick={() => handleDeleteTariff(tariff.id)}
                            disabled={deleting === tariff.id}
                            className="text-red-600 hover:text-red-900 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {deleting === tariff.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Tariff Details Modal */}
        {showDetailsModal && selectedTariff && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-900">Tariff Details</h3>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Tariff Name</label>
                  <p className="text-lg font-semibold text-gray-900">{selectedTariff.name}</p>
                </div>

                <div className="border-t pt-4">
                  <label className="text-sm font-medium text-gray-600">Utility Type</label>
                  <p>
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getUtilityTypeColor(selectedTariff.utilityType.name)}`}>
                      {selectedTariff.utilityType.name}
                    </span>
                  </p>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Usage Range</h4>
                  <p className="text-gray-900">
                    {selectedTariff.minUsage} - {selectedTariff.maxUsage ? selectedTariff.maxUsage : '∞'} {selectedTariff.utilityType.unit}
                  </p>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Pricing Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Fixed Charge</label>
                      <p className="text-xl font-bold text-gray-900">${selectedTariff.fixedCharge.toFixed(2)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Rate per {selectedTariff.utilityType.unit}</label>
                      <p className="text-xl font-bold text-blue-600">${selectedTariff.rate.toFixed(4)}</p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Validity Period</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Effective From</label>
                      <p className="text-gray-900">{formatDate(selectedTariff.effectiveFrom)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Effective To</label>
                      <p className="text-gray-900">
                        {selectedTariff.effectiveTo
                          ? formatDate(selectedTariff.effectiveTo)
                          : 'No end date'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <label className="text-sm font-medium text-gray-600">Status</label>
                  <p>
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      selectedTariff.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedTariff.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Tariff Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-900">Add New Tariff</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleAddTariff}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tariff Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter tariff name"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Utility Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="utilityTypeId"
                      value={formData.utilityTypeId}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select utility type</option>
                      {utilityTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name} ({type.unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Usage <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="minUsage"
                      value={formData.minUsage}
                      onChange={handleInputChange}
                      required
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maximum Usage (leave empty for unlimited)
                    </label>
                    <input
                      type="number"
                      name="maxUsage"
                      value={formData.maxUsage}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Unlimited"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rate per Unit <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="rate"
                      value={formData.rate}
                      onChange={handleInputChange}
                      required
                      min="0"
                      step="0.0001"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fixed Charge
                    </label>
                    <input
                      type="number"
                      name="fixedCharge"
                      value={formData.fixedCharge}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Effective From <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="effectiveFrom"
                      value={formData.effectiveFrom}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Effective To (optional)
                    </label>
                    <input
                      type="date"
                      name="effectiveTo"
                      value={formData.effectiveTo}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-md hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Creating...' : 'Create Tariff'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
