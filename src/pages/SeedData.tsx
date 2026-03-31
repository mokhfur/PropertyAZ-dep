import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, writeBatch, doc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Property, User } from '../types';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';

const SeedData: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const divisions = [
    { name: 'Barisal', count: 10 },
    { name: 'Chittagong', count: 25 },
    { name: 'Dhaka', count: 50 },
    { name: 'Khulna', count: 35 },
    { name: 'Rajshahi', count: 25 },
    { name: 'Sylhet', count: 25 },
    { name: 'Rangpur', count: 5 },
  ];

  const propertyTypes = ['Apartment', 'House', 'Duplex', 'Studio', 'Commercial'];
  const statuses: ('occupied' | 'vacant' | 'repair')[] = ['occupied', 'vacant', 'repair'];

  const seedTenants = async () => {
    setLoading(true);
    setStatus('Seeding random tenants...');
    try {
      const firstNames = ['John', 'Jane', 'Michael', 'Emily', 'David', 'Sarah', 'Robert', 'Linda', 'William', 'Elizabeth'];
      const lastNames = ['Doe', 'Smith', 'Brown', 'Davis', 'Wilson', 'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White'];
      
      const tenants: User[] = Array.from({ length: 10 }).map((_, i) => ({
        uid: `tenant-${i + 1}`,
        email: `tenant${i + 1}@example.com`,
        userType: 'tenant',
        createdAt: new Date().toISOString(),
        firstName: firstNames[Math.floor(Math.random() * firstNames.length)],
        lastName: lastNames[Math.floor(Math.random() * lastNames.length)],
        phoneNumber: `017000000${i.toString().padStart(2, '0')}`
      }));

      const batch = writeBatch(db);
      tenants.forEach(tenant => {
        const docRef = doc(db, 'users', tenant.uid);
        batch.set(docRef, tenant);
      });

      await batch.commit().catch(err => handleFirestoreError(err, OperationType.WRITE, 'users'));
      setStatus('Successfully seeded 10 random tenants!');
    } catch (err) {
      console.error(err);
      setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const seedAll = async () => {
    setLoading(true);
    try {
      setStatus('1/3: Creating mock users...');
      await createMockUsers();
      setStatus('2/3: Seeding tenants...');
      await seedTenants();
      setStatus('3/3: Seeding properties...');
      await seedProperties();
      setStatus('All data seeded successfully!');
    } catch (err) {
      console.error(err);
      setStatus(`Error during seed all: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const createMockUsers = async () => {
    setLoading(true);
    setStatus('Creating mock users...');
    try {
      const mockLandlord: User = {
        uid: 'mock-landlord-id',
        email: 'landlord@example.com',
        userType: 'landlord',
        createdAt: new Date().toISOString(),
        firstName: 'Rahim',
        lastName: 'Uddin',
        phoneNumber: '01711111111'
      };

      const mockManager: User = {
        uid: 'mock-manager-id',
        email: 'manager@example.com',
        userType: 'manager',
        createdAt: new Date().toISOString(),
        firstName: 'Karim',
        lastName: 'Ahmed',
        phoneNumber: '01811111111'
      };

      await Promise.all([
        setDoc(doc(db, 'users', mockLandlord.uid), mockLandlord).catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${mockLandlord.uid}`)),
        setDoc(doc(db, 'users', mockManager.uid), mockManager).catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${mockManager.uid}`))
      ]);

      setStatus('Mock users created successfully!');
    } catch (err) {
      console.error(err);
      setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const seedProperties = async () => {
    setLoading(true);
    setStatus('Fetching users...');
    try {
      // 1. Fetch Landlords and Managers
      const landlordQ = query(collection(db, 'users'), where('userType', '==', 'landlord'));
      const managerQ = query(collection(db, 'users'), where('userType', '==', 'manager'));

      const [landlordSnap, managerSnap] = await Promise.all([
        getDocs(landlordQ).catch(err => handleFirestoreError(err, OperationType.GET, 'users')),
        getDocs(managerQ).catch(err => handleFirestoreError(err, OperationType.GET, 'users'))
      ]);

      if (!landlordSnap || !managerSnap) {
        setStatus('Error: Failed to fetch users. Check console for details.');
        setLoading(false);
        return;
      }

      const landlords = landlordSnap.docs.map(d => d.data() as User);
      const managers = managerSnap.docs.map(d => d.data() as User);

      if (landlords.length === 0) {
        setStatus('Error: No landlords found in database. Please create a landlord user first.');
        setLoading(false);
        return;
      }
      if (managers.length === 0) {
        setStatus('Error: No managers found in database. Please create a manager user first.');
        setLoading(false);
        return;
      }

      setStatus(`Found ${landlords.length} landlords and ${managers.length} managers. Seeding 175 properties...`);

      let totalCreated = 0;
      const batchSize = 50;
      let currentBatch = writeBatch(db);
      let batchCount = 0;

      for (const division of divisions) {
        for (let i = 0; i < division.count; i++) {
          const isManaged = Math.random() < 0.4; // 40% managed by manager
          const type = propertyTypes[Math.floor(Math.random() * propertyTypes.length)];
          const statusVal = statuses[Math.floor(Math.random() * statuses.length)];
          const landlord = landlords[Math.floor(Math.random() * landlords.length)];
          const manager = managers[Math.floor(Math.random() * managers.length)];

          const propertyData: Omit<Property, 'id'> = {
            address: `${type} ${i + 1}, Road ${Math.floor(Math.random() * 50) + 1}, Sector ${Math.floor(Math.random() * 20) + 1}, ${division.name}`,
            propertyType: type,
            createdAt: new Date().toISOString(),
            landlordOrManager: isManaged ? manager.uid : landlord.uid,
            ownerId: landlord.uid,
            description: `A beautiful ${type.toLowerCase()} located in the heart of ${division.name}. Features modern amenities and great connectivity.`,
            numberOfBedrooms: Math.floor(Math.random() * 5) + 1,
            numberOfBathrooms: Math.floor(Math.random() * 3) + 1,
            rentAmount: (Math.floor(Math.random() * 50) + 10) * 1000,
            district: division.name,
            status: statusVal,
            images: [`https://picsum.photos/seed/${division.name}${i}/800/600`]
          };

          const newDocRef = doc(collection(db, 'properties'));
          currentBatch.set(newDocRef, propertyData);
          
          batchCount++;
          totalCreated++;

          if (batchCount >= batchSize) {
            await currentBatch.commit().catch(err => handleFirestoreError(err, OperationType.WRITE, 'properties'));
            currentBatch = writeBatch(db);
            batchCount = 0;
            setStatus(`Seeded ${totalCreated} properties...`);
          }
        }
      }

      if (batchCount > 0) {
        await currentBatch.commit().catch(err => handleFirestoreError(err, OperationType.WRITE, 'properties'));
      }

      setStatus(`Successfully seeded ${totalCreated} properties!`);
    } catch (err) {
      console.error(err);
      setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteAllProperties = async () => {
    if (!window.confirm('Are you sure you want to delete ALL properties?')) return;
    setLoading(true);
    setStatus('Deleting all properties...');
    try {
      const snap = await getDocs(collection(db, 'properties'));
      const batchSize = 50;
      let currentBatch = writeBatch(db);
      let count = 0;
      let totalDeleted = 0;

      for (const doc of snap.docs) {
        currentBatch.delete(doc.ref);
        count++;
        totalDeleted++;
        if (count >= batchSize) {
          await currentBatch.commit();
          currentBatch = writeBatch(db);
          count = 0;
          setStatus(`Deleted ${totalDeleted} properties...`);
        }
      }
      if (count > 0) await currentBatch.commit();
      setStatus(`Successfully deleted ${totalDeleted} properties!`);
    } catch (err) {
      console.error(err);
      setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8 bg-white rounded-3xl border border-slate-200 shadow-sm mt-10">
      <h2 className="text-2xl font-bold text-slate-900 mb-4">Seed Property Data</h2>
      <p className="text-slate-500 mb-6">
        This will add 175 random properties across various divisions in Bangladesh.
        40% will be assigned to property managers.
        <br />
        <span className="text-amber-600 font-semibold">Note: You must be logged in as an administrator to perform this action.</span>
      </p>
      
      <div className="bg-slate-50 p-4 rounded-xl mb-6 min-h-[60px] flex items-center justify-center text-sm font-medium text-slate-700">
        {status || 'Ready to seed'}
      </div>

      <div className="flex flex-col gap-4">
        <button
          onClick={seedAll}
          disabled={loading}
          className="w-full py-4 bg-blue-900 text-white rounded-xl font-bold hover:bg-blue-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : 'Seed All (Users, Tenants, Properties)'}
        </button>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={createMockUsers}
            disabled={loading}
            className="py-3 border border-blue-900 text-blue-900 rounded-xl font-bold hover:bg-blue-50 transition-all disabled:opacity-50 text-sm"
          >
            Mock Landlord & Manager
          </button>

          <button
            onClick={seedTenants}
            disabled={loading}
            className="py-3 border border-blue-900 text-blue-900 rounded-xl font-bold hover:bg-blue-50 transition-all disabled:opacity-50 text-sm"
          >
            Seed 10 Tenants
          </button>
        </div>

        <button
          onClick={seedProperties}
          disabled={loading}
          className="w-full py-4 border border-blue-900 text-blue-900 rounded-xl font-bold hover:bg-blue-50 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          Seed 175 Properties
        </button>

        <button
          onClick={deleteAllProperties}
          disabled={loading}
          className="w-full py-4 border border-red-200 text-red-600 rounded-xl font-bold hover:bg-red-50 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          Delete All Properties
        </button>
        
        <button
          onClick={() => navigate('/dashboard')}
          className="w-full py-4 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default SeedData;
