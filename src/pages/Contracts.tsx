import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, orderBy } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../AuthContext';
import { Lease, Property, User, ManagementAgreement } from '../types';
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Download, 
  ShieldCheck,
  Smartphone,
  Check,
  Plus,
  X,
  Calendar,
  Mail,
  User as UserIcon,
  Building,
  Upload,
  Copy,
  FileStack,
  Search,
  FileUp,
  Edit3,
  Signature
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const Contracts: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [leases, setLeases] = useState<Lease[]>([]);
  const [selectedLease, setSelectedLease] = useState<Lease | null>(null);
  const [mgmtAgreements, setMgmtAgreements] = useState<ManagementAgreement[]>([]);
  const [selectedMgmt, setSelectedMgmt] = useState<ManagementAgreement | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'contracts' | 'templates' | 'management'>('contracts');
  const [signingStep, setSigningStep] = useState(0); // 0: Review, 1: OTP, 2: Success
  const [mgmtSigningStep, setMgmtSigningStep] = useState(0);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  
  // Template states
  const [templates, setTemplates] = useState<any[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const defaultTemplates = [
    {
      id: 'template-residential',
      name: 'Standard Residential Lease',
      category: 'public',
      content: 'This Lease Agreement ("Lease") is entered into between Landlord and Tenant...\n\n1. PROPERTY: The Landlord agrees to rent to the Tenant the property at [PROPERTY_ADDRESS]...\n2. TERM: The lease shall begin on [START_DATE] and end on [END_DATE].\n3. RENT: Tenant agrees to pay [RENT_AMOUNT] per month.'
    },
    {
      id: 'template-commercial',
      name: 'Commercial Shop Rental',
      category: 'public',
      content: 'COMMERCIAL LEASE AGREEMENT\n\nThis Commercial Lease Agreement ("Lease") is made between Landlord and Tenant for the commercial space at [PROPERTY_ADDRESS].\n\n1. USE OF PREMISES: The premises shall be used only for retail/business purposes...\n2. MAINTENANCE: Tenant is responsible for internal maintenance of the shop...'
    }
  ];

  const handleResendOtp = () => {
    setResendStatus('OTP Resent! (Demo: 123456)');
    setTimeout(() => setResendStatus(null), 5000);
  };
  
  // Landlord specific states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [myProperties, setMyProperties] = useState<Property[]>([]);
  const [allTenants, setAllTenants] = useState<User[]>([]);
  const [newLease, setNewLease] = useState({
    property: '',
    tenant: '',
    startDate: '',
    endDate: '',
    rentAmount: 0,
    depositAmount: 0,
    termsAndConditions: ''
  });

  const sendEmail = async (to: string, subject: string, html: string) => {
    try {
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, html }),
      });
    } catch (err) {
      console.error('Failed to send email:', err);
    }
  };

  const isNearingEnd = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 60;
  };

  const handleRenew = (lease: Lease) => {
    setNewLease({
      property: lease.property,
      tenant: lease.tenant,
      startDate: lease.endDate,
      endDate: '',
      rentAmount: lease.rentAmount,
      depositAmount: lease.depositAmount || 0,
      termsAndConditions: lease.termsAndConditions || ''
    });
    setShowCreateModal(true);
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!profile) return;
      try {
        // Fetch Leases
        const field = profile.userType === 'tenant' ? 'tenant' : 'landlordOrManager';
        const q = query(collection(db, 'leases'), where(field, '==', profile.uid), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q).catch(err => handleFirestoreError(err, OperationType.GET, 'leases'));
        
        let fetchedLeases: Lease[] = [];
        if (snap) {
          fetchedLeases = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lease));
          setLeases(fetchedLeases);
        }

        // Fetch Management Agreements
        const mgmtField = profile.userType === 'landlord' ? 'landlordId' : 'managerId';
        const mgmtQ = query(collection(db, 'managementAgreements'), where(mgmtField, '==', profile.uid), orderBy('createdAt', 'desc'));
        const mgmtSnap = await getDocs(mgmtQ).catch(err => handleFirestoreError(err, OperationType.GET, 'managementAgreements'));
        if (mgmtSnap) {
          setMgmtAgreements(mgmtSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ManagementAgreement)));
        }

        // Fetch properties
        if (profile.userType === 'landlord' || profile.userType === 'manager') {
          const propQ = query(collection(db, 'properties'), where('landlordOrManager', '==', profile.uid));
          const propSnap = await getDocs(propQ).catch(err => handleFirestoreError(err, OperationType.GET, 'properties'));
          if (propSnap) {
            setMyProperties(propSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Property)));
          }

          const tenantQ = query(collection(db, 'users'), where('userType', '==', 'tenant'));
          const tenantSnap = await getDocs(tenantQ).catch(err => handleFirestoreError(err, OperationType.GET, 'users'));
          if (tenantSnap) {
            setAllTenants(tenantSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User)));
          }
        } else if (profile.userType === 'tenant' && fetchedLeases.length > 0) {
          // For tenants, fetch only properties they have leases for
          const propertyIds = [...new Set(fetchedLeases.map(l => l.property))];
          if (propertyIds.length > 0) {
            // Note: 'in' query has a limit of 10-30 depending on version, but usually fine for this app
            const propQ = query(collection(db, 'properties'), where('__name__', 'in', propertyIds));
            const propSnap = await getDocs(propQ).catch(err => handleFirestoreError(err, OperationType.GET, 'properties'));
            if (propSnap) {
              setMyProperties(propSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Property)));
            }
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [profile]);

  useEffect(() => {
    const fetchTemplates = async () => {
      if (!profile) return;
      try {
        const q = query(collection(db, 'contractTemplates'), where('createdBy', '==', profile.uid));
        const snap = await getDocs(q);
        const userTemplates = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setTemplates([...defaultTemplates, ...userTemplates]);
      } catch (err) {
        console.error('Failed to fetch templates:', err);
        setTemplates(defaultTemplates);
      }
    };
    fetchTemplates();
  }, [profile]);

  const handleUploadContract = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDoc(true);
    // Simulate reading file and extracting text
    setTimeout(() => {
      const fileName = file.name.replace(/\.[^/.]+$/, "");
      setNewLease({
        ...newLease,
        termsAndConditions: `[EXTRACTED FROM ${file.name}]\n\nLEASE AGREEMENT\n\nThis contract was uploaded on ${new Date().toLocaleDateString()}.\n\nFILENAME: ${fileName}\n\n1. PARTIES: This agreement is made between...`
      });
      setUploadingDoc(false);
      setShowCreateModal(true);
    }, 1500);
  };

  const saveTemplate = async (templateData: any) => {
    if (!profile) return;
    try {
      const data = {
        ...templateData,
        createdBy: profile.uid,
        createdAt: new Date().toISOString()
      };
      if (editingTemplate?.id && !editingTemplate.id.startsWith('template-')) {
        await updateDoc(doc(db, 'contractTemplates', editingTemplate.id), data);
      } else {
        await addDoc(collection(db, 'contractTemplates'), data);
      }
      setShowTemplateModal(false);
      setEditingTemplate(null);
      // Refresh templates
      const q = query(collection(db, 'contractTemplates'), where('createdBy', '==', profile.uid));
      const snap = await getDocs(q);
      const userTemplates = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTemplates([...defaultTemplates, ...userTemplates]);
    } catch (err) {
      console.error('Failed to save template:', err);
    }
  };

  const useTemplate = (template: any) => {
    setNewLease({
      ...newLease,
      termsAndConditions: template.content
    });
    setActiveTab('contracts');
    setShowCreateModal(true);
  };

  const handleSendReminder = async (lease: Lease) => {
    if (!profile) return;
    const tenant = allTenants.find(t => t.uid === lease.tenant);
    const property = myProperties.find(p => p.id === lease.property);
    
    if (tenant && property) {
      await sendEmail(
        tenant.email,
        "Reminder: Lease Agreement Awaiting Your Signature",
        `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #0f2a4a; padding: 24px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 24px;">PropertyAZ</h1>
          </div>
          <div style="padding: 32px;">
            <h2 style="color: #0f2a4a; margin-top: 0;">Signature Required</h2>
            <p>Hello ${tenant.firstName},</p>
            <p>This is a friendly reminder that a lease agreement for the property at <strong>${property.address}</strong> is awaiting your signature.</p>
            <p>Please log in to your dashboard to review the terms and sign the contract using your secure OTP.</p>
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 24px 0;">
              <p style="margin: 4px 0;"><strong>Monthly Rent:</strong> ৳${lease.rentAmount.toLocaleString()}</p>
              <p style="margin: 4px 0;"><strong>Start Date:</strong> ${lease.startDate}</p>
            </div>
            <a href="${window.location.origin}/contracts" style="display: inline-block; background-color: #0f2a4a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 16px;">View & Sign Contract</a>
            <p style="margin-top: 32px; font-size: 12px; color: #64748b;">If you have already signed this contract, please ignore this email.</p>
          </div>
          <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8;">
            &copy; ${new Date().getFullYear()} PropertyAZ. All rights reserved.
          </div>
        </div>
        `
      );
      alert('Reminder sent successfully to ' + tenant.email);
    }
  };

  const handleSendExpiryReminder = async (lease: Lease) => {
    if (!profile) return;
    const tenant = allTenants.find(t => t.uid === lease.tenant);
    const property = myProperties.find(p => p.id === lease.property);
    
    if (tenant && property) {
      await sendEmail(
        tenant.email,
        "Reminder: Your Lease Agreement is Nearing its End Date",
        `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #0f2a4a; padding: 24px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 24px;">PropertyAZ</h1>
          </div>
          <div style="padding: 32px;">
            <h2 style="color: #0f2a4a; margin-top: 0;">Lease Expiry Reminder</h2>
            <p>Hello ${tenant.firstName},</p>
            <p>We are writing to remind you that your lease agreement for the property at <strong>${property.address}</strong> is set to expire on <strong>${lease.endDate}</strong>.</p>
            <p>If you would like to renew your lease or discuss next steps, please log in to your dashboard or contact us directly.</p>
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 24px 0;">
              <p style="margin: 4px 0;"><strong>Property:</strong> ${property.address}</p>
              <p style="margin: 4px 0;"><strong>Expiry Date:</strong> ${lease.endDate}</p>
              <p style="margin: 4px 0;"><strong>Current Rent:</strong> ৳${lease.rentAmount.toLocaleString()}/mo</p>
            </div>
            <a href="${window.location.origin}/contracts" style="display: inline-block; background-color: #0f2a4a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 16px;">View Lease Details</a>
            <p style="margin-top: 32px; font-size: 12px; color: #64748b;">Thank you for choosing PropertyAZ.</p>
          </div>
          <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8;">
            &copy; ${new Date().getFullYear()} PropertyAZ. All rights reserved.
          </div>
        </div>
        `
      );
      alert('Expiry reminder sent successfully to ' + tenant.email);
    }
  };

  const handleCreateLease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    try {
      const leaseData: Omit<Lease, 'id'> = {
        ...newLease,
        status: 'pending_tenant',
        createdAt: new Date().toISOString(),
        landlordOrManager: profile.uid,
        reminderSent: false
      };
      const docRef = await addDoc(collection(db, 'leases'), leaseData).catch(err => handleFirestoreError(err, OperationType.WRITE, 'leases'));
      if (docRef) {
        const createdLease = { id: docRef.id, ...leaseData } as Lease;
        setLeases([createdLease, ...leases]);
        setShowCreateModal(false);

        // Send Email Notifications
        const tenant = allTenants.find(t => t.uid === leaseData.tenant);
        const property = myProperties.find(p => p.id === leaseData.property);
        
        if (tenant && property) {
          // Notify Tenant
          await sendEmail(
            tenant.email,
            "Action Required: New Lease Agreement Ready for Signing",
            `
            <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
              <div style="background-color: #0f2a4a; padding: 24px; text-align: center; color: white;">
                <h1 style="margin: 0; font-size: 24px;">PropertyAZ</h1>
              </div>
              <div style="padding: 32px;">
                <h2 style="color: #0f2a4a; margin-top: 0;">New Lease Agreement</h2>
                <p>Hello ${tenant.firstName},</p>
                <p>A new lease agreement has been initiated for the property at <strong>${property.address}</strong>.</p>
                <p>Please log in to your PropertyAZ dashboard to review and sign the contract using your secure OTP.</p>
                <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 24px 0;">
                  <p style="margin: 4px 0;"><strong>Monthly Rent:</strong> ৳${leaseData.rentAmount.toLocaleString()}</p>
                  <p style="margin: 4px 0;"><strong>Start Date:</strong> ${leaseData.startDate}</p>
                </div>
                <a href="${window.location.origin}/contracts" style="display: inline-block; background-color: #0f2a4a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 16px;">Review & Sign Contract</a>
                <p style="margin-top: 32px; font-size: 12px; color: #64748b;">This is a legally binding document. Please review all terms carefully before signing.</p>
              </div>
              <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8;">
                &copy; ${new Date().getFullYear()} PropertyAZ. All rights reserved.
              </div>
            </div>
            `
          );

          // Notify Landlord (Confirmation)
          await sendEmail(
            profile.email,
            "Lease Agreement Initiated",
            `
            <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
              <div style="background-color: #0f2a4a; padding: 24px; text-align: center; color: white;">
                <h1 style="margin: 0; font-size: 24px;">PropertyAZ</h1>
              </div>
              <div style="padding: 32px;">
                <h2 style="color: #0f2a4a; margin-top: 0;">Lease Initiated</h2>
                <p>Hello ${profile.firstName},</p>
                <p>You have successfully initiated a lease agreement for <strong>${property.address}</strong> with tenant <strong>${tenant.firstName} ${tenant.lastName}</strong>.</p>
                <p>We have notified the tenant to review and sign the contract. You will receive another notification once they have signed.</p>
                <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 24px 0;">
                  <p style="margin: 4px 0;"><strong>Tenant:</strong> ${tenant.firstName} ${tenant.lastName}</p>
                  <p style="margin: 4px 0;"><strong>Monthly Rent:</strong> ৳${leaseData.rentAmount.toLocaleString()}</p>
                </div>
                <a href="${window.location.origin}/contracts" style="display: inline-block; background-color: #0f2a4a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 16px;">View Contract Status</a>
              </div>
              <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8;">
                &copy; ${new Date().getFullYear()} PropertyAZ. All rights reserved.
              </div>
            </div>
            `
          );
        }

        setNewLease({
          property: '',
          tenant: '',
          startDate: '',
          endDate: '',
          rentAmount: 0,
          depositAmount: 0,
          termsAndConditions: ''
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSign = async () => {
    if (!selectedLease) return;
    // Simulate OTP validation
    if (otp.join('').length < 6) {
      alert('Please enter the full 6-digit OTP');
      return;
    }

    try {
      const leaseRef = doc(db, 'leases', selectedLease.id);
      await updateDoc(leaseRef, {
        status: 'active',
        otpSigned: true,
        signedAt: new Date().toISOString()
      }).catch(err => handleFirestoreError(err, OperationType.UPDATE, `leases/${selectedLease.id}`));
      
      setSigningStep(2);
      // Refresh list
      setLeases(leases.map(l => l.id === selectedLease.id ? { ...l, status: 'active', otpSigned: true, signedAt: new Date().toISOString() } as Lease : l));

      // Send Email Notifications for successful signing
      const property = myProperties.find(p => p.id === selectedLease.property);
      const landlordRef = await getDocs(query(collection(db, 'users'), where('uid', '==', selectedLease.landlordOrManager))).catch(err => handleFirestoreError(err, OperationType.GET, 'users'));
      const landlord = landlordRef && !landlordRef.empty ? landlordRef.docs[0].data() as User : null;

      if (profile && property && landlord) {
        // Notify Tenant
        await sendEmail(
          profile.email,
          "Lease Agreement Signed Successfully",
          `
          <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
            <div style="background-color: #0f2a4a; padding: 24px; text-align: center; color: white;">
              <h1 style="margin: 0; font-size: 24px;">PropertyAZ</h1>
            </div>
            <div style="padding: 32px;">
              <h2 style="color: #0f2a4a; margin-top: 0;">Congratulations!</h2>
              <p>Hello ${profile.firstName},</p>
              <p>You have successfully signed the lease agreement for <strong>${property.address}</strong>.</p>
              <p>The contract is now active. You can download your copy from the dashboard at any time.</p>
              <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 24px 0;">
                <p style="margin: 4px 0;"><strong>Property:</strong> ${property.address}</p>
                <p style="margin: 4px 0;"><strong>Status:</strong> Active</p>
                <p style="margin: 4px 0;"><strong>Signed Date:</strong> ${new Date().toLocaleDateString()}</p>
              </div>
              <a href="${window.location.origin}/contracts" style="display: inline-block; background-color: #0f2a4a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 16px;">View Active Contract</a>
            </div>
            <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8;">
              &copy; ${new Date().getFullYear()} PropertyAZ. All rights reserved.
            </div>
          </div>
          `
        );

        // Notify Landlord
        await sendEmail(
          landlord.email,
          "Lease Agreement Signed by Tenant",
          `
          <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
            <div style="background-color: #0f2a4a; padding: 24px; text-align: center; color: white;">
              <h1 style="margin: 0; font-size: 24px;">PropertyAZ</h1>
            </div>
            <div style="padding: 32px;">
              <h2 style="color: #0f2a4a; margin-top: 0;">Lease Signed</h2>
              <p>Hello ${landlord.firstName},</p>
              <p>The tenant <strong>${profile.firstName} ${profile.lastName}</strong> has signed the lease agreement for <strong>${property.address}</strong>.</p>
              <p>The lease is now active. You can view the signed document in your dashboard.</p>
              <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 24px 0;">
                <p style="margin: 4px 0;"><strong>Property:</strong> ${property.address}</p>
                <p style="margin: 4px 0;"><strong>Tenant:</strong> ${profile.firstName} ${profile.lastName}</p>
              </div>
              <a href="${window.location.origin}/contracts" style="display: inline-block; background-color: #0f2a4a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 16px;">View Signed Contract</a>
            </div>
            <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8;">
              &copy; ${new Date().getFullYear()} PropertyAZ. All rights reserved.
            </div>
          </div>
          `
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAcceptMgmt = async () => {
    if (!selectedMgmt || !profile) return;
    try {
      const agreementRef = doc(db, 'managementAgreements', selectedMgmt.id);
      await updateDoc(agreementRef, {
        status: 'active',
        signedAt: new Date().toISOString()
      }).catch(err => handleFirestoreError(err, OperationType.UPDATE, `managementAgreements/${selectedMgmt.id}`));
      
      // Also update the property's landlordOrManager to the manager
      const propertyRef = doc(db, 'properties', selectedMgmt.propertyId);
      await updateDoc(propertyRef, {
        landlordOrManager: profile.uid
      }).catch(err => handleFirestoreError(err, OperationType.UPDATE, `properties/${selectedMgmt.propertyId}`));

      setMgmtAgreements(mgmtAgreements.map(a => a.id === selectedMgmt.id ? { ...a, status: 'active', signedAt: new Date().toISOString() } as ManagementAgreement : a));
      setMgmtSigningStep(2);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeclineMgmt = async () => {
    if (!selectedMgmt) return;
    try {
      const agreementRef = doc(db, 'managementAgreements', selectedMgmt.id);
      await updateDoc(agreementRef, {
        status: 'declined'
      }).catch(err => handleFirestoreError(err, OperationType.UPDATE, `managementAgreements/${selectedMgmt.id}`));
      
      setMgmtAgreements(mgmtAgreements.map(a => a.id === selectedMgmt.id ? { ...a, status: 'declined' } as ManagementAgreement : a));
      setSelectedMgmt(null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">Initiate New Lease</h3>
                <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleCreateLease} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Property</label>
                    <select 
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-900 focus:ring-0"
                      value={newLease.property}
                      onChange={e => setNewLease({...newLease, property: e.target.value})}
                    >
                      <option value="">Choose a property</option>
                      {myProperties.map(p => (
                        <option key={p.id} value={p.id}>{p.address}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Tenant</label>
                    <select 
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-900 focus:ring-0"
                      value={newLease.tenant}
                      onChange={e => setNewLease({...newLease, tenant: e.target.value})}
                    >
                      <option value="">Choose a tenant</option>
                      {allTenants.map(t => (
                        <option key={t.uid} value={t.uid}>{t.firstName} {t.lastName} ({t.email})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Start Date</label>
                    <input 
                      type="date" 
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-900 focus:ring-0"
                      value={newLease.startDate}
                      onChange={e => setNewLease({...newLease, startDate: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">End Date</label>
                    <input 
                      type="date" 
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-900 focus:ring-0"
                      value={newLease.endDate}
                      onChange={e => setNewLease({...newLease, endDate: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Monthly Rent (৳)</label>
                    <input 
                      type="number" 
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-900 focus:ring-0"
                      value={newLease.rentAmount}
                      onChange={e => setNewLease({...newLease, rentAmount: Number(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Security Deposit (৳)</label>
                    <input 
                      type="number" 
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-900 focus:ring-0"
                      value={newLease.depositAmount}
                      onChange={e => setNewLease({...newLease, depositAmount: Number(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Terms & Conditions</label>
                  <textarea 
                    rows={4}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-900 focus:ring-0"
                    placeholder="Enter specific lease terms..."
                    value={newLease.termsAndConditions}
                    onChange={e => setNewLease({...newLease, termsAndConditions: e.target.value})}
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full py-4 bg-blue-900 text-white rounded-xl font-bold hover:bg-black transition-colors"
                >
                  Create & Send for Signing
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Lease Agreements</h2>
          <p className="text-slate-500 text-sm">Manage and sign your digital contracts securely</p>
        </div>
        {(profile?.userType === 'landlord' || profile?.userType === 'manager') && (
          <div className="flex items-center gap-3">
            <label className="bg-white border-2 border-slate-200 text-slate-600 px-6 py-2.5 rounded-xl font-bold hover:bg-slate-50 transition-colors flex items-center gap-2 cursor-pointer">
              <Upload className="w-4 h-4" />
              {uploadingDoc ? 'Extracting...' : 'Upload Contract'}
              <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={handleUploadContract} disabled={uploadingDoc} />
            </label>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="bg-[#0f2a4a] text-white px-6 py-2.5 rounded-xl font-bold hover:bg-[#0a1e36] transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create New Contract
            </button>
          </div>
        )}
      </div>

      {(profile?.userType === 'landlord' || profile?.userType === 'manager') && (
        <div className="flex border-b border-slate-200">
          <button 
            onClick={() => setActiveTab('contracts')}
            className={cn(
              "px-8 py-4 text-sm font-bold tracking-widest uppercase border-b-2 transition-all",
              activeTab === 'contracts' ? "border-blue-900 text-blue-900" : "border-transparent text-slate-400 hover:text-slate-600"
            )}
          >
            Manage Contracts
          </button>
          <button 
            onClick={() => setActiveTab('templates')}
            className={cn(
              "px-8 py-4 text-sm font-bold tracking-widest uppercase border-b-2 transition-all",
              activeTab === 'templates' ? "border-blue-900 text-blue-900" : "border-transparent text-slate-400 hover:text-slate-600"
            )}
          >
            Contract Templates
          </button>
          {(profile?.userType === 'landlord' || profile?.userType === 'manager') && (
            <button 
              onClick={() => setActiveTab('management')}
              className={cn(
                "px-8 py-4 text-sm font-bold tracking-widest uppercase border-b-2 transition-all",
                activeTab === 'management' ? "border-blue-900 text-blue-900" : "border-transparent text-slate-400 hover:text-slate-600"
              )}
            >
              Management Agreements
            </button>
          )}
        </div>
      )}

      {activeTab === 'templates' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div 
            onClick={() => { setEditingTemplate({ name: '', content: '', category: 'custom' }); setShowTemplateModal(true); }}
            className="p-8 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center group hover:border-blue-900 transition-all cursor-pointer bg-slate-50/50"
          >
            <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center text-slate-400 group-hover:text-blue-900 group-hover:scale-110 transition-all mb-4 shadow-sm">
              <Plus className="w-8 h-8" />
            </div>
            <h4 className="font-bold text-slate-900">Create New Template</h4>
            <p className="text-xs text-slate-500 mt-2">Design your own reusable agreement</p>
          </div>

          {templates.map((template) => (
            <div key={template.id} className="bg-white rounded-3xl border border-slate-200 p-6 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-900">
                  <FileStack className="w-6 h-6" />
                </div>
                <span className={cn(
                  "text-[9px] font-bold uppercase px-2 py-0.5 rounded-full",
                  template.category === 'public' ? "bg-slate-100 text-slate-500" : "bg-blue-100 text-blue-700"
                )}>
                  {template.category}
                </span>
              </div>
              <h4 className="font-bold text-slate-900 mb-2">{template.name}</h4>
              <p className="text-xs text-slate-500 line-clamp-3 mb-6 flex-1">
                {template.content}
              </p>
              <div className="flex gap-2">
                <button 
                  onClick={() => useTemplate(template)}
                  className="flex-1 py-2.5 bg-blue-900 text-white rounded-xl text-xs font-bold hover:bg-blue-800 transition-colors flex items-center justify-center gap-2"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Use
                </button>
                {template.category !== 'public' && (
                  <button 
                    onClick={() => { setEditingTemplate(template); setShowTemplateModal(true); }}
                    className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : activeTab === 'management' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="lg:col-span-1 space-y-4">
            {mgmtAgreements.length > 0 ? mgmtAgreements.map((agreement) => {
              const property = myProperties.find(p => p.id === agreement.propertyId);
              return (
                <div 
                  key={agreement.id}
                  onClick={() => { setSelectedMgmt(agreement); setMgmtSigningStep(0); }}
                  className={cn(
                    "p-4 rounded-2xl border-2 cursor-pointer transition-all",
                    selectedMgmt?.id === agreement.id ? "border-blue-900 bg-blue-50/50" : "border-slate-100 hover:border-slate-200 bg-white"
                  )}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <span className={cn(
                      "text-[9px] font-bold uppercase px-2 py-0.5 rounded-full",
                      agreement.status === 'active' ? "bg-green-50 text-green-600" : 
                      agreement.status === 'pending' ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"
                    )}>
                      {agreement.status}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 truncate">
                    {property?.address || 'Property Details'}
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-1">Management Contract</p>
                  <div className="flex items-center gap-2 mt-4 text-[10px] text-slate-400">
                    <Clock className="w-3 h-3" />
                    Requested {new Date(agreement.createdAt).toLocaleDateString()}
                  </div>
                </div>
              );
            }) : (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
                <p className="text-xs text-slate-400 italic">No management agreements found.</p>
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {selectedMgmt ? (
                <motion.div 
                  key={selectedMgmt.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
                >
                  {mgmtSigningStep === 0 && (
                    <div className="p-8">
                      <h3 className="text-xl font-bold text-slate-900 mb-8">Management Agreement</h3>
                      <div className="bg-slate-50 rounded-2xl p-6 mb-8 border border-slate-100">
                        <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
                          <p>Agreement between Owner and Property Manager for the property at <span className="font-bold text-slate-900">{myProperties.find(p => p.id === selectedMgmt.propertyId)?.address || 'Selected Property'}</span>.</p>
                          <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-200">
                            <div>
                              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Commission Rate</p>
                              <p className="font-bold text-slate-900">{selectedMgmt.commissionRate}% of gross rent</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Status</p>
                              <p className="font-bold text-slate-900 capitalize">{selectedMgmt.status}</p>
                            </div>
                          </div>
                          <div className="pt-2">
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">Contract Terms</p>
                            <p className="text-xs whitespace-pre-line">{selectedMgmt.terms}</p>
                          </div>
                        </div>
                      </div>

                      {selectedMgmt.status === 'pending' && profile?.userType === 'manager' && (
                        <div className="flex gap-4">
                          <button 
                            onClick={handleDeclineMgmt}
                            className="flex-1 py-4 border border-red-200 text-red-600 rounded-xl font-bold hover:bg-red-50 transition-colors"
                          >
                            Decline
                          </button>
                          <button 
                            onClick={() => setMgmtSigningStep(1)}
                            className="flex-1 py-4 bg-blue-900 text-white rounded-xl font-bold hover:bg-black transition-colors flex items-center justify-center gap-2"
                          >
                            Proceed to Sign
                            <Signature className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {mgmtSigningStep === 1 && (
                    <div className="p-8 text-center max-w-sm mx-auto">
                      <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Smartphone className="w-8 h-8 text-blue-900" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">Secure Signature</h3>
                      <p className="text-sm text-slate-500 mb-8">Please enter the 6-digit OTP sent to your registered phone to sign this management agreement.</p>
                      
                      <div className="flex gap-2 justify-center mb-8">
                        {otp.map((digit, idx) => (
                          <input
                            key={idx}
                            id={`otp-${idx}`}
                            type="text"
                            maxLength={1}
                            className="w-10 h-10 border border-slate-200 rounded-lg text-center font-bold text-lg focus:border-blue-900 focus:ring-0 outline-none"
                            value={digit}
                            onChange={(e) => {
                              const newOtp = [...otp];
                              newOtp[idx] = e.target.value;
                              setOtp(newOtp);
                              if (e.target.value && idx < 5) {
                                document.getElementById(`otp-${idx + 1}`)?.focus();
                              }
                            }}
                          />
                        ))}
                      </div>

                      <button 
                        onClick={handleAcceptMgmt}
                        className="w-full py-4 bg-blue-900 text-white rounded-xl font-bold hover:bg-black transition-colors mb-4"
                      >
                        Sign Agreement
                      </button>
                      <button onClick={handleResendOtp} className="text-xs text-slate-400 font-bold hover:text-blue-900">Resend Code</button>
                    </div>
                  )}

                  {mgmtSigningStep === 2 && (
                    <div className="p-12 text-center">
                      <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Check className="w-10 h-10 text-green-600" />
                      </div>
                      <h3 className="text-2xl font-bold text-slate-900 mb-2">Contract Signed!</h3>
                      <p className="text-sm text-slate-500 mb-8">The management agreement is now active. You have been assigned as the manager for this property.</p>
                      <button 
                        onClick={() => navigate('/properties')}
                        className="px-8 py-3 bg-blue-900 text-white rounded-xl font-bold hover:bg-black transition-colors"
                      >
                        Go to Properties
                      </button>
                    </div>
                  )}
                </motion.div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-200 mb-4 shadow-sm">
                    <ShieldCheck className="w-8 h-8" />
                  </div>
                  <h4 className="font-bold text-slate-400 tracking-wide">Select an agreement to view details</h4>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contract List */}
          <div className="lg:col-span-1 space-y-4">
          {leases.length > 0 ? leases.map((lease) => {
            const property = myProperties.find(p => p.id === lease.property);
            const tenant = allTenants.find(t => t.uid === lease.tenant);
            
            return (
              <div 
                key={lease.id}
                onClick={() => { setSelectedLease(lease); setSigningStep(0); }}
                className={cn(
                  "p-4 rounded-2xl border-2 cursor-pointer transition-all",
                  selectedLease?.id === lease.id ? "border-blue-900 bg-blue-50/50" : "border-slate-100 hover:border-slate-200 bg-white"
                )}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                    <FileText className="w-5 h-5" />
                  </div>
                  <span className={cn(
                    "text-[9px] font-bold uppercase px-2 py-0.5 rounded-full",
                    lease.status === 'active' ? "bg-green-50 text-green-600" : 
                    lease.status === 'pending_tenant' ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-500"
                  )}>
                    {lease.status.replace('_', ' ')}
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 truncate">
                  {property?.address || 'Property Details'}
                </h4>
                <p className="text-[10px] text-slate-500 mt-1">
                  {profile?.userType === 'tenant' ? 'Landlord/Manager' : `Tenant: ${tenant?.firstName || 'Unknown'}`}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">Rent: ৳{lease.rentAmount.toLocaleString()} · {lease.startDate} to {lease.endDate}</p>
                <div className="flex items-center gap-2 mt-4 text-[10px] text-slate-400">
                  <Clock className="w-3 h-3" />
                  Created {new Date(lease.createdAt).toLocaleDateString()}
                </div>
              </div>
            );
          }) : (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
              <p className="text-xs text-slate-400 italic">No contracts found.</p>
            </div>
          )}
        </div>

        {/* Contract Details / Signing Flow */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {selectedLease ? (
              <motion.div 
                key={selectedLease.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
              >
                {signingStep === 0 && (
                  <div className="p-8">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-xl font-bold text-slate-900">Contract Details</h3>
                      <button className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1">
                        <Download className="w-3 h-3" />
                        Download Draft
                      </button>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-6 mb-8 border border-slate-100">
                      <h4 className="font-bold text-slate-900 mb-4">Lease Agreement</h4>
                      <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
                        <p>This agreement is made between the Landlord/Manager and the Tenant for the property at <span className="font-bold text-slate-900">{myProperties.find(p => p.id === selectedLease.property)?.address || 'Selected Property'}</span>.</p>
                        <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-200">
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Monthly Rent</p>
                            <p className="font-bold text-slate-900">৳{selectedLease.rentAmount.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Security Deposit</p>
                            <p className="font-bold text-slate-900">৳{selectedLease.depositAmount?.toLocaleString() || '0'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Start Date</p>
                            <p className="font-bold text-slate-900">{selectedLease.startDate}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">End Date</p>
                            <p className="font-bold text-slate-900">{selectedLease.endDate}</p>
                          </div>
                        </div>
                        <div className="pt-2">
                          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">Terms & Conditions</p>
                          <p className="text-xs">{selectedLease.termsAndConditions || 'Standard lease terms apply.'}</p>
                        </div>
                      </div>
                    </div>

                    {selectedLease.status === 'pending_tenant' && profile?.userType === 'tenant' ? (
                      <button 
                        onClick={() => setSigningStep(1)}
                        className="w-full py-4 bg-blue-900 text-white rounded-xl font-bold hover:bg-black transition-colors flex items-center justify-center gap-2"
                      >
                        Proceed to Sign Contract
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : selectedLease.status === 'pending_tenant' && (profile?.userType === 'landlord' || profile?.userType === 'manager') ? (
                      <button 
                        onClick={() => handleSendReminder(selectedLease)}
                        className="w-full py-4 border-2 border-blue-900 text-blue-900 rounded-xl font-bold hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                      >
                        <Mail className="w-4 h-4" />
                        Send Signature Reminder
                      </button>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 border border-green-100 text-green-700">
                          <CheckCircle2 className="w-5 h-5" />
                          <p className="text-sm font-medium">This contract is active and signed via OTP.</p>
                        </div>
                        
                        {selectedLease.status === 'active' && 
                         (profile?.userType === 'landlord' || profile?.userType === 'manager') && 
                         isNearingEnd(selectedLease.endDate) && (
                          <div className="space-y-4">
                            <button 
                              onClick={() => handleSendExpiryReminder(selectedLease)}
                              className="w-full py-4 border-2 border-blue-900 text-blue-900 rounded-xl font-bold hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                            >
                              <Mail className="w-4 h-4" />
                              Send Expiry Reminder
                            </button>
                            <button 
                              onClick={() => handleRenew(selectedLease)}
                              className="w-full py-4 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 transition-colors flex items-center justify-center gap-2"
                            >
                              <Plus className="w-4 h-4" />
                              Renew Lease Agreement
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {signingStep === 1 && (
                  <div className="p-12 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-900 mx-auto mb-6">
                      <Smartphone className="w-8 h-8" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">Sign your contract</h3>
                    <p className="text-slate-500 text-sm mb-8">
                      Enter the 6-digit OTP sent to your registered phone <br />
                      <span className="text-blue-900 font-bold">{profile?.phoneNumber || "+880 ••• ••• ••••"}</span>
                      <br />
                      <span className="text-[10px] text-amber-600 font-bold uppercase mt-2 block">
                        Demo Mode: Use any 6 digits (e.g. 123456)
                      </span>
                    </p>

                    {resendStatus && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6 p-3 bg-green-50 text-green-700 text-xs font-bold rounded-xl border border-green-100 flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {resendStatus}
                      </motion.div>
                    )}

                    <div className="flex justify-center gap-3 mb-8">
                      {otp.map((digit, i) => (
                        <input
                          key={i}
                          type="text"
                          maxLength={1}
                          className="w-12 h-14 bg-slate-50 border-2 border-slate-200 rounded-xl text-center text-xl font-bold text-blue-900 focus:border-blue-900 focus:ring-0"
                          value={digit}
                          onChange={(e) => {
                            const newOtp = [...otp];
                            newOtp[i] = e.target.value;
                            setOtp(newOtp);
                            if (e.target.value && i < 5) {
                              (e.target.nextSibling as HTMLInputElement)?.focus();
                            }
                          }}
                        />
                      ))}
                    </div>

                    <div className="mb-8">
                      <button 
                        onClick={handleResendOtp}
                        className="text-xs font-bold text-blue-900 hover:text-blue-700 uppercase tracking-widest"
                      >
                        Didn't receive code? Resend OTP
                      </button>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-4 mb-8 text-left">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-2">By signing you confirm:</p>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        You have read and agree to the lease agreement for <span className="font-bold text-slate-900">{myProperties.find(p => p.id === selectedLease.property)?.address || 'this property'}</span>. Rent: <span className="font-bold text-slate-900">৳{selectedLease.rentAmount.toLocaleString()}/mo</span> starting <span className="font-bold text-slate-900">{selectedLease.startDate}</span>.
                      </p>
                    </div>

                    <button 
                      onClick={handleSign}
                      className="w-full py-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors"
                    >
                      Confirm & Sign Contract
                    </button>
                    <button 
                      onClick={() => setSigningStep(0)}
                      className="mt-4 text-sm text-slate-400 hover:text-slate-600"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {signingStep === 2 && (
                  <div className="p-12 text-center">
                    <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center text-green-600 mx-auto mb-6">
                      <Check className="w-10 h-10 stroke-[3]" />
                    </div>
                    <h3 className="text-3xl font-bold text-slate-900 mb-2">Contract Signed!</h3>
                    <p className="text-slate-500 mb-10">Your lease for <span className="font-bold text-slate-900">{myProperties.find(p => p.id === selectedLease.property)?.address || 'this property'}</span> is now active and stored securely.</p>
                    
                    <div className="bg-slate-50 rounded-2xl p-6 text-left mb-8">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-4">Audit Record</p>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Signed by</span>
                          <span className="font-bold text-slate-900">{profile?.firstName} {profile?.lastName}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Date</span>
                          <span className="font-bold text-slate-900">{new Date().toLocaleDateString('en-BD')}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Ref ID</span>
                          <span className="font-bold text-slate-900 uppercase">CTR-{selectedLease.id.slice(0, 8)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">OTP Hash</span>
                          <span className="font-mono text-[10px] text-slate-400">{otp.join('').slice(0, 4)}…{otp.join('').slice(-2)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <button className="flex-1 py-4 bg-blue-900 text-white rounded-xl font-bold hover:bg-black transition-colors flex items-center justify-center gap-2">
                        <Download className="w-4 h-4" />
                        Download PDF
                      </button>
                      <button 
                        onClick={() => { setSelectedLease(null); setSigningStep(0); }}
                        className="flex-1 py-4 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center bg-white rounded-3xl border border-slate-200 border-dashed p-12 text-center">
                <FileText className="w-16 h-16 text-slate-200 mb-4" />
                <h3 className="text-xl font-bold text-slate-900">Select a contract</h3>
                <p className="text-slate-500 max-w-xs mx-auto mt-2">Choose a contract from the list to view details or sign.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
      )}

      <TemplateModal 
        show={showTemplateModal} 
        onClose={() => { setShowTemplateModal(false); setEditingTemplate(null); }}
        onSave={saveTemplate}
        initialData={editingTemplate}
      />
    </div>
  );
};

const TemplateModal: React.FC<{ 
  show: boolean; 
  onClose: () => void; 
  onSave: (data: any) => void;
  initialData?: any;
}> = ({ show, onClose, onSave, initialData }) => {
  const [data, setData] = useState({
    name: initialData?.name || '',
    content: initialData?.content || '',
    category: initialData?.category || 'custom'
  });

  useEffect(() => {
    if (initialData) {
      setData({
        name: initialData.name || '',
        content: initialData.content || '',
        category: initialData.category || 'custom'
      });
    }
  }, [initialData]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900">{initialData?.id ? 'Edit Template' : 'New Contract Template'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Template Name</label>
            <input 
              type="text"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-900 focus:ring-0"
              placeholder="e.g. Premium Residential Lease"
              value={data.name}
              onChange={e => setData({...data, name: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contract Content</label>
            <textarea 
              rows={12}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:border-blue-900 focus:ring-0 leading-relaxed"
              placeholder="Enter contract text. Use placeholders like [PROPERTY_ADDRESS]..."
              value={data.content}
              onChange={e => setData({...data, content: e.target.value})}
            />
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => onSave(data)}
              className="flex-1 py-4 bg-blue-900 text-white rounded-xl font-bold hover:bg-black transition-colors"
            >
              Save Template
            </button>
            <button 
              onClick={onClose}
              className="flex-1 py-4 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Contracts;
