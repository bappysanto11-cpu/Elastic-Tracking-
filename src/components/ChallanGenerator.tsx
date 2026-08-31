import React, { useState, useEffect } from 'react';
import { FileText, Download, Mail, Printer, Loader2 } from 'lucide-react';
import { ScheduleItem, ChallanDetail, TruckDispatch } from '../types/schedule';
import { onScheduleUpdate } from '../utils/scheduleStorage';
import {
  calculateTrucksNeeded,
  generateChallanNo,
  createTruckDispatchList,
  formatChallanForDisplay,
} from '../utils/challanCalculator';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../utils/firebase';

export const ChallanGenerator: React.FC = () => {
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatedChallans, setGeneratedChallans] = useState<ChallanDetail[]>([]);

  useEffect(() => {
    const unsubscribe = onScheduleUpdate((items) => {
      setScheduleItems(items.filter((item) => item.status === 'completed'));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const generateChallan = async (item: ScheduleItem) => {
    setGenerating(true);
    try {
      const { trucksNeeded, distribution } = calculateTrucksNeeded(item.completedQty);
      const challanNo = generateChallanNo();
      const weightPerCarton = 2; // Default 2 Kg per carton
      const totalWeight = item.completedQty * weightPerCarton;

      // Create Challan Detail
      const challan: ChallanDetail = {
        id: `challan-${Date.now()}`,
        challanNo,
        date: new Date().toISOString().split('T')[0],
        scheduleItemId: item.id,
        buyer: item.buyer,
        customerRefPO: item.customerRefPO,
        totalCartons: item.completedQty,
        totalWeight,
        weightPerCarton,
        truckRequired: trucksNeeded,
        truckCapacity: 120,
        truckDistribution: distribution,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Save Challan to Firestore
      const challanRef = collection(db, 'challanDetails');
      const challanDoc = await addDoc(challanRef, {
        ...challan,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Create Truck Dispatch Entries
      const trucks = createTruckDispatchList(challanDoc.id, distribution, weightPerCarton);
      const truckRef = collection(db, 'truckDispatch');

      for (const truck of trucks) {
        await addDoc(truckRef, {
          ...truck,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      setGeneratedChallans([...generatedChallans, challan]);

      // Download challan
      downloadChallan(challan);
    } catch (error) {
      console.error('Error generating challan:', error);
      alert('Error generating challan: ' + (error as any).message);
    } finally {
      setGenerating(false);
    }
  };

  const downloadChallan = (challan: ChallanDetail) => {
    const content = formatChallanForDisplay(challan);
    const element = document.createElement('a');
    element.setAttribute('href', `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`);
    element.setAttribute('download', `${challan.challanNo}.txt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const sendEmail = async (challan: ChallanDetail) => {
    const content = formatChallanForDisplay(challan);
    // In a real app, call backend email service
    alert('Email feature coming soon!\n\n' + content);
  };

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
        <h1 className="text-3xl font-bold text-gray-800">📋 Challan Generator</h1>
        <p className="text-gray-600 mt-1">Auto-generate delivery challans with truck distribution</p>
      </div>

      {/* Ready for Challan */}
      {scheduleItems.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600 text-lg">No completed orders ready for challan.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {scheduleItems.map((item) => {
            const { trucksNeeded, distribution } = calculateTrucksNeeded(item.completedQty);
            const totalWeight = item.completedQty * 2;

            return (
              <div key={item.id} className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
                {/* Order Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <p className="text-sm text-gray-600">Buyer</p>
                    <p className="text-lg font-bold text-gray-800">{item.buyer}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Reference</p>
                    <p className="text-lg font-bold text-gray-800">{item.customerRefPO}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Cartons</p>
                    <p className="text-lg font-bold text-blue-600">{item.completedQty}</p>
                  </div>
                </div>

                {/* Truck Calculation */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <h3 className="font-bold text-gray-800 mb-3">🚚 Truck Distribution</h3>
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                    {distribution.map((cartons, idx) => (
                      <div key={idx} className="bg-white p-2 rounded border border-blue-300 text-center">
                        <p className="text-xs text-gray-600">Truck {idx + 1}</p>
                        <p className="text-lg font-bold text-blue-600">{cartons}</p>
                        <p className="text-xs text-gray-500">{cartons * 2} Kg</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-blue-200">
                    <p className="font-bold text-gray-800">
                      Total: {trucksNeeded} Trucks | {totalWeight} Kg
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => generateChallan(item)}
                    disabled={generating}
                    className={`flex items-center gap-2 px-6 py-2 rounded-lg font-semibold text-white transition ${
                      generating
                        ? 'bg-blue-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4" />
                        Generate Challan
                      </>
                    )}
                  </button>

                  {generatedChallans.some((c) => c.scheduleItemId === item.id) && (
                    <>
                      <button
                        onClick={() => {
                          const challan = generatedChallans.find((c) => c.scheduleItemId === item.id);
                          if (challan) downloadChallan(challan);
                        }}
                        className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                      <button
                        onClick={() => {
                          const challan = generatedChallans.find((c) => c.scheduleItemId === item.id);
                          if (challan) sendEmail(challan);
                        }}
                        className="flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition"
                      >
                        <Mail className="w-4 h-4" />
                        Email
                      </button>
                      <button className="flex items-center gap-2 px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition">
                        <Printer className="w-4 h-4" />
                        Print
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Generated Challans List */}
      {generatedChallans.length > 0 && (
        <div className="mt-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Generated Challans</h2>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Challan No</th>
                  <th className="px-4 py-3 text-left font-semibold">Buyer</th>
                  <th className="px-4 py-3 text-right font-semibold">Cartons</th>
                  <th className="px-4 py-3 text-right font-semibold">Trucks</th>
                  <th className="px-4 py-3 text-center font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {generatedChallans.map((challan) => (
                  <tr key={challan.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-bold text-blue-600">{challan.challanNo}</td>
                    <td className="px-4 py-3">{challan.buyer}</td>
                    <td className="px-4 py-3 text-right font-semibold">{challan.totalCartons}</td>
                    <td className="px-4 py-3 text-right font-semibold text-green-600">
                      {challan.truckRequired}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                        {challan.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
