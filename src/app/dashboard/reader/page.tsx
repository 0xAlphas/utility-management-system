'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { showToast } from '@/lib/toast';

interface UtilityType {
  id: string;
  name: string;
  unit: string;
}

interface Customer {
  id: string;
  name: string;
  type: string;
  contact: string;
  address: string;
}

interface MeterReading {
  id: string;
  readingValue: number;
  readingDate: string;
  recordedBy: string | null;
}

interface Meter {
  id: string;
  meterNumber: string;
  installationDate: string;
  lastReadingDate: string | null;
  status: string;
  customer: Customer;
  utilityType: UtilityType;
  readings: MeterReading[];
}

interface ReadingFormData {
  meterId: string;
  readingValue: string;
  readingDate: string;
  remarks: string;
}

export default function MeterReaderDashboard() {
  const [meters, setMeters] = useState<Meter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReadingForm, setShowReadingForm] = useState(false);
  const [selectedMeter, setSelectedMeter] = useState<Meter | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [todayReadings, setTodayReadings] = useState(0);

  const [formData, setFormData] = useState<ReadingFormData>({
    meterId: '',
    readingValue: '',
    readingDate: new Date().toISOString().split('T')[0],
    remarks: '',
  });

  const [formErrors, setFormErrors] = useState<{
    readingValue?: string;
  }>({});

  useEffect(() => {
    fetchMeters();
  }, []);

  const fetchMeters = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/meters?status=ACTIVE&limit=100', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch meters');
      }

      const data = await response.json();
      setMeters(data.data || []);

      // Calculate today's readings
      const today = new Date().toISOString().split('T')[0];
      const todayCount = (data.data || []).reduce((count: number, meter: Meter) => {
        const hasReadingToday = meter.readings.some(
          (reading) => reading.readingDate.split('T')[0] === today
        );
        return count + (hasReadingToday ? 1 : 0);
      }, 0);
      setTodayReadings(todayCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch meters');
    } finally {
      setLoading(false);
    }
  };

  const openReadingForm = (meter: Meter) => {
    setSelectedMeter(meter);
    setFormData({
      meterId: meter.id,
      readingValue: '',
      readingDate: new Date().toISOString().split('T')[0],
      remarks: '',
    });
    setFormErrors({});
    setShowReadingForm(true);
    setSuccessMessage(null);
  };

  const closeReadingForm = () => {
    setShowReadingForm(false);
    setSelectedMeter(null);
    setFormData({
      meterId: '',
      readingValue: '',
      readingDate: new Date().toISOString().split('T')[0],
      remarks: '',
    });
    setFormErrors({});
  };

  const validateReading = (): boolean => {
    const errors: { readingValue?: string } = {};

    if (!formData.readingValue || formData.readingValue.trim() === '') {
      errors.readingValue = 'Reading value is required';
    } else {
      const value = parseFloat(formData.readingValue);
      if (isNaN(value) || value < 0) {
        errors.readingValue = 'Reading value must be a positive number';
      } else if (selectedMeter && selectedMeter.readings.length > 0) {
        const lastReading = selectedMeter.readings[0].readingValue;
        if (value < lastReading) {
          errors.readingValue = `Reading must be higher than or equal to the previous reading (${lastReading})`;
        }
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitReading = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateReading()) {
      showToast.warning('Please check the reading value');
      return;
    }

    const toastId = showToast.loading('Submitting reading...');

    try {
      setSubmitting(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/readings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          meterId: formData.meterId,
          readingValue: parseFloat(formData.readingValue),
          readingDate: formData.readingDate,
          remarks: formData.remarks || undefined,
        }),
      });

      const data = await response.json();

      showToast.dismiss(toastId);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit reading');
      }

      showToast.success('Reading submitted successfully!');
      closeReadingForm();
      fetchMeters(); // Refresh the meters list
    } catch (err) {
      showToast.dismiss(toastId);
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit reading';
      showToast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const getLastReading = (meter: Meter): MeterReading | null => {
    return meter.readings.length > 0 ? meter.readings[0] : null;
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <DashboardLayout allowedRoles={['METER_READER']}>
      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Meter Reader Dashboard</h1>
        <p className="text-gray-600 mt-2">Record and manage meter readings</p>
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
            <div className="flex-shrink-0 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-3 shadow-sm">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Today's Readings</p>
              <p className="text-2xl font-bold text-gray-900">{todayReadings}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 p-6 border border-gray-100">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-3 shadow-sm">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Meters</p>
              <p className="text-2xl font-bold text-gray-900">{meters.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 p-6 border border-gray-100">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-3 shadow-sm">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{meters.length - todayReadings}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Meters Table */}
      <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <h2 className="text-lg font-semibold text-gray-900">All Active Meters</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading meters...</p>
          </div>
        ) : meters.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <p className="mt-2">No active meters found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Meter Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Utility Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Reading
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Reading Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {meters.map((meter) => {
                  const lastReading = getLastReading(meter);
                  return (
                    <tr key={meter.id} className="hover:bg-orange-50 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{meter.meterNumber}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{meter.customer.name}</div>
                        <div className="text-sm text-gray-500">{meter.customer.address}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{meter.utilityType.name}</div>
                        <div className="text-sm text-gray-500">{meter.utilityType.unit}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {lastReading ? `${lastReading.readingValue} ${meter.utilityType.unit}` : 'No readings'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDate(meter.lastReadingDate)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => openReadingForm(meter)}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 transform hover:scale-105 transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                        >
                          <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Add Reading
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reading Form Modal */}
      {showReadingForm && selectedMeter && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Submit New Reading</h3>
              <button
                onClick={closeReadingForm}
                className="text-gray-400 hover:text-gray-600"
                disabled={submitting}
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Meter Info */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Meter Number</p>
              <p className="font-semibold text-gray-900">{selectedMeter.meterNumber}</p>
              <p className="text-sm text-gray-600 mt-2">Customer</p>
              <p className="font-semibold text-gray-900">{selectedMeter.customer.name}</p>
              <p className="text-sm text-gray-600 mt-2">Utility Type</p>
              <p className="font-semibold text-gray-900">{selectedMeter.utilityType.name}</p>
              {selectedMeter.readings.length > 0 && (
                <>
                  <p className="text-sm text-gray-600 mt-2">Previous Reading</p>
                  <p className="font-semibold text-gray-900">
                    {selectedMeter.readings[0].readingValue} {selectedMeter.utilityType.unit}
                  </p>
                </>
              )}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitReading}>
              <div className="mb-4">
                <label htmlFor="readingValue" className="block text-sm font-medium text-gray-700 mb-2">
                  Reading Value <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="readingValue"
                  step="0.01"
                  value={formData.readingValue}
                  onChange={(e) => setFormData({ ...formData, readingValue: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                    formErrors.readingValue ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder={`Enter reading in ${selectedMeter.utilityType.unit}`}
                  disabled={submitting}
                />
                {formErrors.readingValue && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.readingValue}</p>
                )}
              </div>

              <div className="mb-4">
                <label htmlFor="readingDate" className="block text-sm font-medium text-gray-700 mb-2">
                  Reading Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="readingDate"
                  value={formData.readingDate}
                  onChange={(e) => setFormData({ ...formData, readingDate: e.target.value })}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
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
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Add any notes about this reading"
                  disabled={submitting}
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={closeReadingForm}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Submit Reading'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
