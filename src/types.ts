export type UserType = 'tenant' | 'landlord' | 'manager' | 'vendor' | 'admin';
export type AdminRole = 'super_admin' | 'admin';

export interface User {
  uid: string;
  email: string;
  userType: UserType;
  adminRole?: AdminRole;
  createdAt: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  companyName?: string;
  photoUrl?: string;
  blocked?: boolean;
  lastLogin?: string;
  lastIp?: string;
  deviceInfo?: string;
  internalNotes?: string;
  verified?: boolean;
}

export interface Property {
  id: string;
  address: string;
  title?: string;
  location?: string;
  type?: string;
  price?: number;
  isVerified?: boolean;
  landlordId?: string;
  propertyType: string;
  createdAt: string;
  landlordOrManager: string; // User UID (The one who manages it)
  ownerId?: string; // Actual owner UID
  description?: string;
  numberOfBedrooms?: number;
  numberOfBathrooms?: number;
  rentAmount: number;
  district?: string;
  status?: 'occupied' | 'vacant' | 'repair';
  images?: string[];
  latitude?: number;
  longitude?: number;
}

export interface Lease {
  id: string;
  startDate: string;
  endDate: string;
  rentAmount: number;
  status: 'pending_tenant' | 'active' | 'expired' | 'terminated';
  createdAt: string;
  tenant: string; // User UID
  property: string; // Property ID
  landlordOrManager: string; // User UID
  depositAmount?: number;
  termsAndConditions?: string;
  otpSigned?: boolean;
  signedAt?: string;
  reminderSent?: boolean;
}

export interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  tenant: string; // User UID
  propertyId: string; // Property ID
  landlordOrManager: string; // User UID
  assignedToVendorId?: string; // User UID
  urgency?: string;
  attachedPhotos?: string[];
}

export interface Message {
  id: string;
  sender: string; // User UID
  receiver: string; // User UID
  content: string;
  createdAt: string;
  relatedMaintenanceRequest?: string; // MaintenanceRequest ID
  relatedLease?: string; // Lease ID
}

export interface Payment {
  id: string;
  leaseId: string;
  tenant: string;
  landlordOrManager: string; // User UID
  amount: number;
  status: string;
  date: string;
  type: string;
  method: string;
  propertyId?: string;
}

export type UserRole = UserType;
export type UserProfile = User;

export interface Inspection {
  id: string;
  propertyId: string;
  performedBy: string;
  date: string;
  type: 'move-in' | 'move-out' | 'routine';
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
  images?: string[];
}

export interface BlogPost {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt?: string;
  image?: string;
  tags?: string[];
}

export interface AuditLog {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  targetId: string;
  targetType: 'user' | 'property' | 'lease' | 'payment' | 'maintenance' | 'blog' | 'system';
  previousValue?: any;
  newValue?: any;
  details?: string;
  createdAt: string;
  ipAddress?: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  subject: string;
  description: string;
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'technical' | 'billing' | 'property' | 'other';
  createdAt: string;
  updatedAt: string;
  assignedTo?: string; // Admin UID
  internalComments?: string[];
}

export interface BroadcastMessage {
  id: string;
  title: string;
  content: string;
  type: 'popup' | 'warning' | 'announcement' | 'emergency';
  target?: string;
  targetRoles: UserType[] | 'all';
  targetProperties?: string[]; // Property IDs
  targetUserGroups?: string[];
  targetIndividualUsers?: string[]; // User UIDs
  createdAt: string;
  expiresAt?: string;
  createdBy: string; // Admin UID
  senderId?: string;
  senderName?: string;
  acknowledgedBy?: string[]; // User UIDs
  readBy?: string[];
}

export interface SystemHealth {
  lastBackup?: string;
  status: 'healthy' | 'degraded' | 'down';
  activeUsers: number;
  serverLoad?: number;
  updatedAt: string;
}
