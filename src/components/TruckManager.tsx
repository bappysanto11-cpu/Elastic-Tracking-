import React, { useState, useEffect } from 'react';
import { Truck, Plus, Check, MapPin, Loader2 } from 'lucide-react';
import { TruckDispatch, ChallanDetail } from '../types/schedule';
import { collection, getDocs, updateDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../utils/firebase';

export const TruckManager: React.FC = () => {
  const [trucks, setTrucks] = useState<TruckDispatch[]>([]);
  const [challans, setChallans] = useState<ChallanDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChallan, setSelectedChallan] = useState<string>('');
  const [editingDriver, setEditingDriver] = useState<{ [key: string]: { driver: string; phone: string } }>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Get Challans
      const challanSnapshot = await getDocs(collection(db, 'challanDetails'));
      const challanList: ChallanDetail[] = [];
      challanSnapshot.forEach((doc) => {
        challanList.push({ id: doc.id, ...doc.data() } as ChallanDetail);
      });
      setChallans(challanList);
      if (challanList.length > 0) {
        try {
          localStorage.setItem('cached_challan_details', JSON.stringify(challanList));
        } catch {}
      }

      // Get Trucks
      const truckSnapshot = await getDocs(collection(db, 'truckDispatch'));
      const truckList: TruckDispatch[] = [];
      truckSnapshot.forEach((doc) => {
        truckList.push({ id: doc.id, ...doc.data() } as TruckDispatch);
      });
      setTrucks(truckList);
      if (truckList.length > 0) {
        try {
          localStorage.setItem('cached_truck_dispatch', JSON.stringify(truckList));
        } catch {}
      }
    } catch (error) {
      console.warn('Notice loading cloud truck data, using local cache:', error);
      try {
        const cachedChallans = localStorage.getItem('cached_challan_details');
        if (cachedChallans) setChallans(JSON.parse(cachedChallans));
        const cachedTrucks = localStorage.getItem('cached_truck_dispatch');
        if (cachedTrucks) setTrucks(JSON.parse(cachedTrucks));
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTruckStatus = async (truckId: string, newStatus: TruckDispatch['status']) => {
    try {
      const truckRef = doc(db, 'truckDispatch', truckId);
      const updateData: any = { status: newStatus };

      if (newStatus === 'loaded') {
        updateData.departureTime = new Date();
      } else if (newStatus === 'delivered') {
        updateData.deliveryTime = new Date();
      }

      await updateDoc(truckRef, updateData);
      await loadData();
    } catch (error) {
      console.error('Error updating truck:', error);
    }
  };

  const handleAddDriver = async (truckId: string) => {
    const driver = editingDriver[truckId];
    if (!driver || !driver.driver || !driver.phone) {
      alert('Please fill in driver name and phone');
      return;
    }

    try {
      const truckRef = doc(db, 'truckDispatch', truckId);
      await updateDoc(truckRef, {
        driver: driver.driver,
        driverPhone: driver.phone,
        status: 'loading',
      });

      setEditingDriver({ ...editingDriver, [truckId]: { driver: '', phone: '' } });
      await loadData();
    } catch (error) {
      console.error('Error adding driver:', error);
    }
  };

  const filteredTrucks = selectedChallan
    ? trucks.filter((t) => t.challanId === selectedChallan)
    : trucks;

  const totalDispatched = trucks.filter((t) => t.status !== 'waiting').length;
  const totalDelivered = trucks.filter((t) => t.status === 'delivered').length;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">🚚 Truck Manager</h1>
        <p className="text-gray-600 mt-1">Manage truck dispatch and delivery tracking</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-lg">
          <p className="text-sm opacity-90">Total Trucks</p>
          <p className="text-3xl font-bold">{trucks.length}</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white p-4 rounded-lg">
          <p className="text-sm opacity-90">Waiting</p>
          <p className="text-3xl font-bold">{trucks.filter((t) => t.status === 'waiting').length}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-4 rounded-lg">
          <p className="text-sm opacity-90">In Transit</p>
          <p className="text-3xl font-bold">{trucks.filter((t) => t.status === 'in_transit').length}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-4 rounded-lg">
          <p className="text-sm opacity-90">Delivered</p>
          <p className="text-3xl font-bold">{totalDelivered}</p>
        </div>
      </div>

      {/* Filter */}
      {challans.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Filter by Challan:</label>
          <select
            value={selectedChallan}
            onChange={(e) => setSelectedChallan(e.target.value)}
            className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          >
            <option value="">All Challans</option>
            {challans.map((challan) => (
              <option key={challan.id} value={challan.id}>
                {challan.challanNo} - {challan.buyer}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Trucks List */}
      <div className="space-y-4">
        {filteredTrucks.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">No trucks available</p>
          </div>
        ) : (
          filteredTrucks.map((truck) => (
            <div key={truck.id} className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
              {/* Truck Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600">Truck #</p>
                  <p className="text-2xl font-bold text-blue-600">#{truck.truckNo}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Cartons</p>
                  <p className="text-2xl font-bold text-gray-800">{truck.cartons}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Weight</p>
                  <p className="text-2xl font-bold text-gray-800">{truck.weight} Kg</p>
                </div>
              </div>

              {/* Driver Assignment */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
                {truck.driver ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Driver</p>
                      <p className="font-semibold text-gray-800">{truck.driver}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Phone</p>
                      <p className="font-semibold text-gray-800">{truck.driverPhone}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <p
                        className={`font-semibold ${
                          truck.status === 'delivered'
                            ? 'text-green-600'
                            : truck.status === 'in_transit'
                            ? 'text-orange-600'
                            : 'text-blue-600'
                        }`}
                      >
                        {truck.status.replace('_', ' ').toUpperCase()}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                      type="text"
                      placeholder="Driver Name"
                      value={editingDriver[truck.id]?.driver || ''}
                      onChange={(e) =>
                        setEditingDriver({
                          ...editingDriver,
                          [truck.id]: {
                            ...editingDriver[truck.id],
                            driver: e.target.value,
                          },
                        })
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                    />
                    <input
                      type="tel"
                      placeholder="Driver Phone"
                      value={editingDriver[truck.id]?.phone || ''}
                      onChange={(e) =>
                        setEditingDriver({
                          ...editingDriver,
                          [truck.id]: {
                            ...editingDriver[truck.id],
                            phone: e.target.value,
                          },
                        })
                      }
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                    />
                    <button
                      onClick={() => handleAddDriver(truck.id)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
                    >
                      Assign Driver
                    </button>
                  </div>
                )}
              </div>

              {/* Status Buttons */}
              {truck.driver && (
                <div className="flex gap-2 flex-wrap">
                  {truck.status === 'waiting' && (
                    <button
                      onClick={() => handleUpdateTruckStatus(truck.id, 'loading')}
                      className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-semibold transition"
                    >
                      <Plus className="w-4 h-4" />
                      Load Truck
                    </button>
                  )}
                  {truck.status === 'loading' && (
                    <button
                      onClick={() => handleUpdateTruckStatus(truck.id, 'loaded')}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition"
                    >
                      <Check className="w-4 h-4" />
                      Mark Loaded
                    </button>
                  )}
                  {truck.status === 'loaded' && (
                    <button
                      onClick={() => handleUpdateTruckStatus(truck.id, 'in_transit')}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold transition"
                    >
                      <MapPin className="w-4 h-4" />
                      In Transit
                    </button>
                  )}
                  {truck.status === 'in_transit' && (
                    <button
                      onClick={() => handleUpdateTruckStatus(truck.id, 'delivered')}
                      className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition"
                    >
                      <Check className="w-4 h-4" />
                      Delivered
                    </button>
                  )}
                  {truck.status === 'delivered' && (
                    <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-semibold">
                      ✅ Delivered
                    </span>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
