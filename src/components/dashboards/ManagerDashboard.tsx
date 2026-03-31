import React from 'react';
import LandlordDashboard from './LandlordDashboard';

const ManagerDashboard: React.FC = () => {
  // Property Manager dashboard is very similar to Landlord dashboard
  // but with additional features for managing multiple portfolios.
  return (
    <div className="space-y-6">
      <div className="bg-blue-900 text-white p-6 rounded-3xl flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Property Manager Portal</h2>
          <p className="text-white/60 text-sm">Managing 3 portfolios for 2 landlords</p>
        </div>
        <button className="bg-white text-blue-900 px-6 py-2.5 rounded-xl font-bold hover:bg-slate-100 transition-colors">
          View Management Requests
        </button>
      </div>
      <LandlordDashboard />
    </div>
  );
};

export default ManagerDashboard;
