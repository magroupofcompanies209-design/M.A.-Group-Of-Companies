import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { safeJsonResponse } from '../utils/api';
import {
  supabase,
  isFrontendSupabaseConfigured,
  upsertCustomerAccountInSupabase,
  fetchCustomerAccountsFromSupabase,
  fetchOrdersFromSupabase,
} from '../lib/supabaseClient';
import { Order, CustomerAccount, CustomerSavedAddress } from '../types';
import { ProductCard } from '../components/common/ProductCard';
import {
  User,
  Package,
  MapPin,
  Heart,
  Settings,
  LogOut,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Truck,
  Plus,
  Trash2,
  Eye,
  ArrowRight,
  KeyRound,
  Clock,
  FileText,
} from 'lucide-react';

const PAKISTAN_CITIES = [
  'Lahore',
  'Karachi',
  'Islamabad',
  'Rawalpindi',
  'Faisalabad',
  'Multan',
  'Gujranwala',
  'Sialkot',
  'Peshawar',
  'Quetta',
  'Hyderabad',
  'Abbottabad',
  'Bahawalpur',
  'Sargodha',
  'Sukkur',
];

const PROVINCES = [
  'Punjab',
  'Sindh',
  'Khyber Pakhtunkhwa',
  'Balochistan',
  'Islamabad Capital Territory',
  'Azad Jammu & Kashmir',
  'Gilgit-Baltistan',
];

export const CustomerAccountPage: React.FC = () => {
  const {
    customerAccount,
    setCustomerAccount,
    syncCustomerProfile,
    logoutCustomer,
    wishlist,
    visibleProducts,
    navigate,
    showToast,
  } = useStore();

  // Auth mode when not logged in
  const [authView, setAuthView] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  // Sign In fields
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');

  // Sign Up fields
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPhone, setSignUpPhone] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirm, setSignUpConfirm] = useState('');

  // Forgot Password field
  const [forgotEmail, setForgotEmail] = useState('');

  // Dashboard active tab when logged in
  const [activeTab, setActiveTab] = useState<
    'profile' | 'orders' | 'addresses' | 'wishlist' | 'settings'
  >('orders');

  // Customer Orders state
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<Order | null>(null);

  // Profile Edit state
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // New Address Form state
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState<Partial<CustomerSavedAddress>>({
    label: 'Home',
    fullName: '',
    phone: '',
    addressLine: '',
    city: 'Lahore',
    province: 'Punjab',
    postalCode: '',
    landmark: '',
    isDefault: false,
  });

  // Password update state in Account Settings
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  useEffect(() => {
    if (customerAccount) {
      setProfileName(customerAccount.fullName || '');
      setProfilePhone(customerAccount.phone || '');
      loadCustomerOrders(customerAccount);
    }
  }, [customerAccount?.id, customerAccount?.email]);

  const loadCustomerOrders = async (acc: CustomerAccount) => {
    setOrdersLoading(true);
    try {
      const params = new URLSearchParams();
      if (acc.id) params.set('customerId', acc.id);
      if (acc.email) params.set('email', acc.email);
      if (acc.phone) params.set('phone', acc.phone);

      const [apiOrders, supaOrders] = await Promise.all([
        fetch(`/api/customers/orders?${params.toString()}`)
          .then((r) => safeJsonResponse(r, []))
          .catch(() => []),
        fetchOrdersFromSupabase().catch(() => []),
      ]);

      const cleanEmail = (acc.email || '').trim().toLowerCase();
      const cleanPhone = (acc.phone || '').replace(/[^0-9]/g, '');

      const matchedSupa = Array.isArray(supaOrders)
        ? supaOrders.filter((o) => {
            if (acc.id && o.customerId === acc.id) return true;
            if (cleanEmail && o.customer?.email?.trim().toLowerCase() === cleanEmail) return true;
            if (cleanPhone && cleanPhone.length >= 7 && o.customer?.phone) {
              const oPhone = o.customer.phone.replace(/[^0-9]/g, '');
              if (oPhone && (oPhone.includes(cleanPhone) || cleanPhone.includes(oPhone))) return true;
            }
            return false;
          })
        : [];

      const byNum = new Map<string, Order>();
      if (Array.isArray(apiOrders)) {
        apiOrders.forEach((o: Order) => {
          if (o && o.orderNumber) byNum.set(o.orderNumber, o);
        });
      }
      matchedSupa.forEach((o: Order) => {
        if (o && o.orderNumber) byNum.set(o.orderNumber, o);
      });

      const merged = Array.from(byNum.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setMyOrders(merged);
    } catch (e) {
      console.warn('Error loading customer orders:', e);
    } finally {
      setOrdersLoading(false);
    }
  };

  // Sign Up Handler
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    if (!signUpName.trim() || !signUpEmail.trim() || !signUpPhone.trim() || !signUpPassword) {
      setAuthError('Please fill in all required fields.');
      return;
    }
    if (signUpPassword.length < 6) {
      setAuthError('Password must be at least 6 characters long.');
      return;
    }
    if (signUpPassword !== signUpConfirm) {
      setAuthError('Passwords do not match.');
      return;
    }

    setAuthLoading(true);
    try {
      let userId = `cust-${Date.now()}`;
      const cleanEmail = signUpEmail.trim().toLowerCase();

      if (isFrontendSupabaseConfigured && supabase) {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: signUpPassword,
          options: {
            data: {
              full_name: signUpName.trim(),
              phone: signUpPhone.trim(),
            },
          },
        });
        if (error && !error.message.toLowerCase().includes('already registered')) {
          // If Supabase Auth restricts signups or email confirmation is required, we still create the customer profile in Supabase
          console.warn('Supabase Auth signup notice:', error.message);
        }
        if (data?.user?.id) {
          userId = data.user.id;
        }
      }

      const newAccount: CustomerAccount = {
        id: userId,
        fullName: signUpName.trim(),
        email: cleanEmail,
        phone: signUpPhone.trim(),
        savedAddresses: [],
        wishlist,
        accountStatus: 'Active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await upsertCustomerAccountInSupabase(newAccount).catch(() => {});
      await fetch('/api/customers/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAccount),
      }).catch(() => {});

      setCustomerAccount(newAccount);
      showToast(`Welcome to M.A. Group, ${newAccount.fullName}!`, 'success');
    } catch (err: any) {
      setAuthError(err?.message || 'Unable to create account. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Sign In Handler
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    if (!signInEmail.trim() || !signInPassword) {
      setAuthError('Please enter your email address and password.');
      return;
    }

    setAuthLoading(true);
    try {
      const cleanEmail = signInEmail.trim().toLowerCase();
      let authedUser: any = null;

      if (isFrontendSupabaseConfigured && supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: signInPassword,
        });
        if (!error && data?.user) {
          authedUser = data.user;
        }
      }

      // Check existing customer accounts in Supabase table / storage
      const allAccounts = await fetchCustomerAccountsFromSupabase().catch(() => []);
      const existingAcc = allAccounts.find((a) => a.email.toLowerCase() === cleanEmail);

      if (!authedUser && !existingAcc) {
        setAuthError(
          'No customer account found with this email. Please create an account using Sign Up.'
        );
        setAuthLoading(false);
        return;
      }

      const meta = authedUser?.user_metadata || {};
      const profile: CustomerAccount = {
        id: authedUser?.id || existingAcc?.id || `cust-${cleanEmail.replace(/[^a-z0-9]/g, '')}`,
        fullName:
          existingAcc?.fullName || meta.full_name || meta.fullName || cleanEmail.split('@')[0],
        email: cleanEmail,
        phone: existingAcc?.phone || meta.phone || '',
        savedAddresses: existingAcc?.savedAddresses || meta.savedAddresses || [],
        wishlist: existingAcc?.wishlist || wishlist,
        accountStatus: 'Active',
        createdAt: existingAcc?.createdAt || authedUser?.created_at || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await upsertCustomerAccountInSupabase(profile).catch(() => {});
      await fetch('/api/customers/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      }).catch(() => {});

      setCustomerAccount(profile);
      showToast(`Welcome back, ${profile.fullName}!`, 'success');
    } catch (err: any) {
      setAuthError(err?.message || 'Invalid login credentials.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Forgot Password Handler
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    if (!forgotEmail.trim()) {
      setAuthError('Please enter your registered email address.');
      return;
    }

    setAuthLoading(true);
    try {
      if (isFrontendSupabaseConfigured && supabase) {
        await supabase.auth
          .resetPasswordForEmail(forgotEmail.trim(), {
            redirectTo: window.location.origin + '/#/account',
          })
          .catch(() => {});
      }
      setAuthSuccess(
        `If an account is registered for ${forgotEmail.trim()}, password recovery instructions have been dispatched.`
      );
    } catch (err: any) {
      setAuthError(err?.message || 'Unable to process password reset request.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerAccount) return;
    setSavingProfile(true);
    await syncCustomerProfile({
      fullName: profileName.trim() || customerAccount.fullName,
      phone: profilePhone.trim(),
    });
    setSavingProfile(false);
    showToast('Profile information updated.', 'success');
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerAccount) return;
    if (!newAddress.addressLine?.trim() || !newAddress.phone?.trim()) {
      showToast('Please provide address line and contact phone.', 'error');
      return;
    }

    const addr: CustomerSavedAddress = {
      id: 'addr-' + Date.now(),
      label: newAddress.label || 'Home',
      fullName: newAddress.fullName?.trim() || customerAccount.fullName,
      phone: newAddress.phone.trim(),
      addressLine: newAddress.addressLine.trim(),
      city: newAddress.city || 'Lahore',
      province: newAddress.province || 'Punjab',
      postalCode: newAddress.postalCode?.trim(),
      landmark: newAddress.landmark?.trim(),
      isDefault:
        (customerAccount.savedAddresses || []).length === 0 ? true : Boolean(newAddress.isDefault),
    };

    const existing = customerAccount.savedAddresses || [];
    const nextList = addr.isDefault
      ? [...existing.map((a) => ({ ...a, isDefault: false })), addr]
      : [...existing, addr];

    await syncCustomerProfile({ savedAddresses: nextList });
    setShowAddressForm(false);
    setNewAddress({
      label: 'Home',
      fullName: customerAccount.fullName,
      phone: customerAccount.phone,
      addressLine: '',
      city: 'Lahore',
      province: 'Punjab',
      postalCode: '',
      landmark: '',
      isDefault: false,
    });
    showToast('Delivery address saved to your account.', 'success');
  };

  const handleRemoveAddress = async (id: string) => {
    if (!customerAccount) return;
    const nextList = (customerAccount.savedAddresses || []).filter((a) => a.id !== id);
    await syncCustomerProfile({ savedAddresses: nextList });
    showToast('Address removed.', 'info');
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showToast('New password must be at least 6 characters.', 'error');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      showToast('New passwords do not match.', 'error');
      return;
    }
    setUpdatingPassword(true);
    try {
      if (isFrontendSupabaseConfigured && supabase) {
        await supabase.auth.updateUser({ password: newPassword }).catch(() => {});
      }
      setNewPassword('');
      setConfirmNewPassword('');
      showToast('Account password updated.', 'success');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const wishlistedProducts = visibleProducts.filter((p) => wishlist.includes(p.id));

  // ==========================================
  // VIEW 1: NOT LOGGED IN (SIGN IN / SIGN UP / FORGOT PASSWORD)
  // ==========================================
  if (!customerAccount) {
    return (
      <div className="bg-[#F7F3EA] text-[#292B30] py-12 sm:py-20 min-h-[80vh] border-b border-[#B8B9BC]/30">
        <div className="max-w-md mx-auto px-4">
          <div className="bg-[#FCFBF8] rounded-2xl border border-[#B8B9BC]/45 shadow-lg overflow-hidden">
            {/* Luxury Top Header */}
            <div className="bg-[#0D0E10] text-[#FCFBF8] p-7 text-center border-b border-[#C9B27C]/30">
              <div className="w-12 h-12 rounded-xl bg-[#151C2C] border border-[#C9B27C]/50 flex items-center justify-center mx-auto mb-3">
                <span className="font-luxury-serif text-[#C9B27C] font-bold text-lg tracking-wider">
                  M.A
                </span>
              </div>
              <span className="text-[10px] font-semibold text-[#C9B27C] uppercase tracking-[0.24em]">
                M.A. Group of Companies
              </span>
              <h1 className="font-luxury-serif text-2xl font-semibold text-[#FCFBF8] mt-1">
                {authView === 'signin'
                  ? 'Client Account Sign In'
                  : authView === 'signup'
                  ? 'Create Client Account'
                  : 'Password Recovery'}
              </h1>
              <p className="text-xs text-[#B8B9BC] mt-1">
                {authView === 'signin'
                  ? 'Access your orders, delivery tracking, and saved addresses'
                  : authView === 'signup'
                  ? 'Register for seamless checkout and real-time order tracking'
                  : 'Reset your account password securely'}
              </p>
            </div>

            {/* Auth Mode Switcher Tabs */}
            {authView !== 'forgot' && (
              <div className="grid grid-cols-2 bg-[#F7F3EA] p-1.5 m-6 mb-0 rounded-xl border border-[#B8B9BC]/35">
                <button
                  type="button"
                  onClick={() => {
                    setAuthView('signin');
                    setAuthError('');
                    setAuthSuccess('');
                  }}
                  className={`py-2.5 text-xs font-semibold uppercase tracking-[0.14em] rounded-lg transition-all cursor-pointer ${
                    authView === 'signin'
                      ? 'bg-[#151C2C] text-[#FCFBF8] shadow-xs'
                      : 'text-[#292B30]/70 hover:text-[#0D0E10]'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthView('signup');
                    setAuthError('');
                    setAuthSuccess('');
                  }}
                  className={`py-2.5 text-xs font-semibold uppercase tracking-[0.14em] rounded-lg transition-all cursor-pointer ${
                    authView === 'signup'
                      ? 'bg-[#151C2C] text-[#FCFBF8] shadow-xs'
                      : 'text-[#292B30]/70 hover:text-[#0D0E10]'
                  }`}
                >
                  Create Account
                </button>
              </div>
            )}

            <div className="p-6 sm:p-7 space-y-5">
              {authError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}

              {authSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{authSuccess}</span>
                </div>
              )}

              {/* SIGN IN FORM */}
              {authView === 'signin' && (
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#292B30] uppercase tracking-[0.14em] mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#A98B52] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={signInEmail}
                        onChange={(e) => setSignInEmail(e.target.value)}
                        placeholder="client@example.com"
                        className="w-full pl-10 pr-4 py-3 text-xs sm:text-sm rounded-xl bg-[#F7F3EA] border border-[#B8B9BC]/50 text-[#0D0E10] focus:outline-none focus:border-[#C9B27C]"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-semibold text-[#292B30] uppercase tracking-[0.14em]">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthView('forgot');
                          setAuthError('');
                          setAuthSuccess('');
                        }}
                        className="text-[11px] font-semibold text-[#A98B52] hover:text-[#0D0E10] cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#A98B52] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        required
                        value={signInPassword}
                        onChange={(e) => setSignInPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-4 py-3 text-xs sm:text-sm rounded-xl bg-[#F7F3EA] border border-[#B8B9BC]/50 text-[#0D0E10] focus:outline-none focus:border-[#C9B27C]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-3.5 px-6 rounded-xl bg-[#151C2C] hover:bg-[#C9B27C] text-[#FCFBF8] hover:text-[#0D0E10] font-semibold text-xs uppercase tracking-[0.16em] transition-all cursor-pointer disabled:opacity-50"
                  >
                    {authLoading ? 'Signing In...' : 'Sign In to My Account'}
                  </button>
                </form>
              )}

              {/* SIGN UP FORM */}
              {authView === 'signup' && (
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#292B30] uppercase tracking-[0.14em] mb-1.5">
                      Full Name *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-[#A98B52] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={signUpName}
                        onChange={(e) => setSignUpName(e.target.value)}
                        placeholder="e.g. Muhammad Ahmed"
                        className="w-full pl-10 pr-4 py-3 text-xs sm:text-sm rounded-xl bg-[#F7F3EA] border border-[#B8B9BC]/50 text-[#0D0E10] focus:outline-none focus:border-[#C9B27C]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#292B30] uppercase tracking-[0.14em] mb-1.5">
                      Email Address *
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#A98B52] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={signUpEmail}
                        onChange={(e) => setSignUpEmail(e.target.value)}
                        placeholder="client@example.com"
                        className="w-full pl-10 pr-4 py-3 text-xs sm:text-sm rounded-xl bg-[#F7F3EA] border border-[#B8B9BC]/50 text-[#0D0E10] focus:outline-none focus:border-[#C9B27C]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#292B30] uppercase tracking-[0.14em] mb-1.5">
                      Mobile Number (Pakistan) *
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-[#A98B52] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        required
                        value={signUpPhone}
                        onChange={(e) => setSignUpPhone(e.target.value)}
                        placeholder="0300 1234567"
                        className="w-full pl-10 pr-4 py-3 text-xs sm:text-sm rounded-xl bg-[#F7F3EA] border border-[#B8B9BC]/50 text-[#0D0E10] focus:outline-none focus:border-[#C9B27C]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#292B30] uppercase tracking-[0.14em] mb-1.5">
                        Password *
                      </label>
                      <input
                        type="password"
                        required
                        value={signUpPassword}
                        onChange={(e) => setSignUpPassword(e.target.value)}
                        placeholder="Min 6 chars"
                        className="w-full px-3.5 py-3 text-xs sm:text-sm rounded-xl bg-[#F7F3EA] border border-[#B8B9BC]/50 text-[#0D0E10] focus:outline-none focus:border-[#C9B27C]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#292B30] uppercase tracking-[0.14em] mb-1.5">
                        Confirm Password *
                      </label>
                      <input
                        type="password"
                        required
                        value={signUpConfirm}
                        onChange={(e) => setSignUpConfirm(e.target.value)}
                        placeholder="Repeat password"
                        className="w-full px-3.5 py-3 text-xs sm:text-sm rounded-xl bg-[#F7F3EA] border border-[#B8B9BC]/50 text-[#0D0E10] focus:outline-none focus:border-[#C9B27C]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-3.5 px-6 rounded-xl bg-[#151C2C] hover:bg-[#C9B27C] text-[#FCFBF8] hover:text-[#0D0E10] font-semibold text-xs uppercase tracking-[0.16em] transition-all cursor-pointer disabled:opacity-50"
                  >
                    {authLoading ? 'Creating Account...' : 'Create My Account'}
                  </button>
                </form>
              )}

              {/* FORGOT PASSWORD FORM */}
              {authView === 'forgot' && (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#292B30] uppercase tracking-[0.14em] mb-1.5">
                      Registered Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#A98B52] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="client@example.com"
                        className="w-full pl-10 pr-4 py-3 text-xs sm:text-sm rounded-xl bg-[#F7F3EA] border border-[#B8B9BC]/50 text-[#0D0E10] focus:outline-none focus:border-[#C9B27C]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-3.5 px-6 rounded-xl bg-[#151C2C] hover:bg-[#C9B27C] text-[#FCFBF8] hover:text-[#0D0E10] font-semibold text-xs uppercase tracking-[0.16em] transition-all cursor-pointer disabled:opacity-50"
                  >
                    {authLoading ? 'Sending...' : 'Send Recovery Link'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAuthView('signin');
                      setAuthError('');
                      setAuthSuccess('');
                    }}
                    className="w-full py-2 text-xs font-semibold text-[#A98B52] hover:text-[#0D0E10] cursor-pointer"
                  >
                    Back to Sign In
                  </button>
                </form>
              )}

              <div className="pt-4 border-t border-[#B8B9BC]/30 flex items-center justify-between text-[11px] text-[#292B30]/70">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#A98B52]" />
                  <span>Supabase Secured Auth</span>
                </span>
                <button
                  type="button"
                  onClick={() => navigate('admin')}
                  className="text-[#292B30]/60 hover:text-[#0D0E10] underline cursor-pointer"
                >
                  Executive Staff Portal
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: LOGGED IN CUSTOMER MY ACCOUNT DASHBOARD
  // ==========================================
  return (
    <div className="bg-[#F7F3EA] text-[#292B30] py-10 sm:py-14 min-h-screen border-b border-[#B8B9BC]/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
        {/* Top Account Banner */}
        <div className="bg-[#0D0E10] text-[#FCFBF8] rounded-2xl p-6 sm:p-8 border border-[#C9B27C]/35 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#151C2C] border border-[#C9B27C]/50 flex items-center justify-center text-[#C9B27C] font-luxury-serif text-2xl font-bold">
              {customerAccount.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#C9B27C]">
                  Verified Client Account
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {customerAccount.accountStatus}
                </span>
              </div>
              <h1 className="font-luxury-serif text-xl sm:text-3xl font-semibold text-[#FCFBF8] mt-0.5">
                {customerAccount.fullName}
              </h1>
              <p className="text-xs text-[#B8B9BC] mt-0.5">
                {customerAccount.email} {customerAccount.phone ? `• ${customerAccount.phone}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-center">
            <button
              onClick={() => navigate('track-order')}
              className="px-4 py-2.5 rounded-xl bg-[#151C2C] hover:bg-[#C9B27C] text-[#FCFBF8] hover:text-[#0D0E10] border border-[#C9B27C]/40 text-xs font-semibold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer"
            >
              <Truck className="w-4 h-4 text-[#C9B27C]" />
              <span>Track Order</span>
            </button>
            <button
              onClick={logoutCustomer}
              className="px-4 py-2.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-200 border border-rose-500/30 text-xs font-semibold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Account Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left 3 Cols: Account Navigation Sidebar */}
          <aside className="lg:col-span-3 bg-[#FCFBF8] rounded-2xl p-3 border border-[#B8B9BC]/40 shadow-xs space-y-1">
            {[
              { id: 'orders', label: 'My Orders', icon: Package, badge: myOrders.length },
              { id: 'profile', label: 'My Profile', icon: User },
              {
                id: 'addresses',
                label: 'Saved Addresses',
                icon: MapPin,
                badge: (customerAccount.savedAddresses || []).length,
              },
              { id: 'wishlist', label: 'Wishlist', icon: Heart, badge: wishlistedProducts.length },
              { id: 'settings', label: 'Account Settings', icon: Settings },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setSelectedOrderDetail(null);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold uppercase tracking-[0.12em] transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#151C2C] text-[#FCFBF8] shadow-xs'
                      : 'text-[#292B30] hover:bg-[#F7F3EA]'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#C9B27C]' : 'text-[#A98B52]'}`} />
                    <span>{tab.label}</span>
                  </span>
                  {typeof tab.badge === 'number' && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isActive
                          ? 'bg-[#C9B27C] text-[#0D0E10]'
                          : 'bg-[#F7F3EA] text-[#292B30] border border-[#B8B9BC]/40'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </aside>

          {/* Right 9 Cols: Active Section Content */}
          <main className="lg:col-span-9">
            {/* 1. MY ORDERS TAB */}
            {activeTab === 'orders' && (
              <div className="bg-[#FCFBF8] rounded-2xl p-6 sm:p-8 border border-[#B8B9BC]/40 shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#B8B9BC]/30">
                  <div>
                    <span className="text-[10px] font-semibold text-[#A98B52] uppercase tracking-[0.2em]">
                      Order History & Tracking
                    </span>
                    <h2 className="font-luxury-serif text-xl sm:text-2xl font-semibold text-[#0D0E10]">
                      My Orders
                    </h2>
                  </div>
                  <button
                    onClick={() => loadCustomerOrders(customerAccount)}
                    className="text-xs font-semibold text-[#A98B52] hover:text-[#0D0E10] cursor-pointer self-start sm:self-center"
                  >
                    Refresh Orders
                  </button>
                </div>

                {selectedOrderDetail ? (
                  <div className="space-y-6">
                    <button
                      onClick={() => setSelectedOrderDetail(null)}
                      className="text-xs font-semibold text-[#A98B52] hover:text-[#0D0E10] flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>← Back to All Orders</span>
                    </button>

                    <div className="p-5 rounded-xl bg-[#F7F3EA] border border-[#C9B27C]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-widest text-[#A98B52]">
                          Order Reference
                        </span>
                        <h3 className="font-luxury-serif text-xl font-bold text-[#0D0E10]">
                          {selectedOrderDetail.orderNumber}
                        </h3>
                        <p className="text-xs text-[#292B30]/70">
                          Placed on {new Date(selectedOrderDetail.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="px-3.5 py-1.5 rounded-lg bg-[#151C2C] text-[#C9B27C] text-xs font-semibold uppercase tracking-wider">
                          Status: {selectedOrderDetail.status}
                        </span>
                        <button
                          onClick={() =>
                            navigate('track-order', {
                              orderNumber: selectedOrderDetail.orderNumber,
                            })
                          }
                          className="px-4 py-2 rounded-lg bg-[#C9B27C] hover:bg-[#A98B52] text-[#0D0E10] text-xs font-semibold uppercase tracking-wider cursor-pointer"
                        >
                          Live Order Tracker
                        </button>
                      </div>
                    </div>

                    {/* Items Ordered */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-[#0D0E10]">
                        Purchased Items
                      </h4>
                      <div className="divide-y divide-[#B8B9BC]/25 border border-[#B8B9BC]/35 rounded-xl overflow-hidden bg-white">
                        {selectedOrderDetail.items.map((item, idx) => (
                          <div key={idx} className="p-4 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3.5">
                              <img
                                src={item.productImage}
                                alt={item.productName}
                                className="w-14 h-14 object-cover rounded-lg border border-[#B8B9BC]/30"
                              />
                              <div>
                                <p className="text-xs sm:text-sm font-semibold text-[#0D0E10]">
                                  {item.productName}
                                </p>
                                <p className="text-[11px] text-[#292B30]/70">
                                  SKU: {item.sku} • Qty: {item.quantity} × PKR{' '}
                                  {item.price.toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <span className="text-xs sm:text-sm font-bold text-[#0D0E10] tabular-nums">
                              PKR {item.total.toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Delivery & Totals */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-5 rounded-xl bg-[#F7F3EA] border border-[#B8B9BC]/35 space-y-2 text-xs">
                        <h4 className="font-semibold uppercase tracking-[0.14em] text-[#0D0E10] mb-2">
                          Delivery Information
                        </h4>
                        <p>
                          <span className="text-[#292B30]/60">Recipient:</span>{' '}
                          <span className="font-semibold text-[#0D0E10]">
                            {selectedOrderDetail.customer.fullName}
                          </span>
                        </p>
                        <p>
                          <span className="text-[#292B30]/60">Phone:</span>{' '}
                          <span className="font-semibold text-[#0D0E10]">
                            {selectedOrderDetail.customer.phone}
                          </span>
                        </p>
                        <p>
                          <span className="text-[#292B30]/60">Address:</span>{' '}
                          <span className="font-semibold text-[#0D0E10]">
                            {selectedOrderDetail.customer.addressLine},{' '}
                            {selectedOrderDetail.customer.city}
                          </span>
                        </p>
                        <p>
                          <span className="text-[#292B30]/60">Payment Method:</span>{' '}
                          <span className="font-semibold text-[#A98B52]">
                            {selectedOrderDetail.paymentMethod}
                          </span>
                        </p>
                      </div>

                      <div className="p-5 rounded-xl bg-[#F7F3EA] border border-[#B8B9BC]/35 space-y-2 text-xs">
                        <h4 className="font-semibold uppercase tracking-[0.14em] text-[#0D0E10] mb-2">
                          Financial Summary
                        </h4>
                        <div className="flex justify-between">
                          <span className="text-[#292B30]/70">Subtotal</span>
                          <span className="font-semibold">
                            PKR {selectedOrderDetail.subtotal.toLocaleString()}
                          </span>
                        </div>
                        {selectedOrderDetail.discount > 0 && (
                          <div className="flex justify-between text-emerald-700">
                            <span>Discount</span>
                            <span>- PKR {selectedOrderDetail.discount.toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-[#292B30]/70">Delivery Charges</span>
                          <span className="font-semibold">
                            PKR {selectedOrderDetail.shippingFee.toLocaleString()}
                          </span>
                        </div>
                        <div className="pt-2 border-t border-[#B8B9BC]/35 flex justify-between text-sm font-bold text-[#0D0E10]">
                          <span>Grand Total (COD)</span>
                          <span>PKR {selectedOrderDetail.grandTotal.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : ordersLoading ? (
                  <div className="py-12 text-center text-xs text-[#292B30]/70">
                    Loading your orders...
                  </div>
                ) : myOrders.length === 0 ? (
                  <div className="py-12 text-center space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#F7F3EA] text-[#A98B52] flex items-center justify-center mx-auto border border-[#B8B9BC]/35">
                      <Package className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-luxury-serif text-lg font-semibold text-[#0D0E10]">
                        No Orders Found Yet
                      </h3>
                      <p className="text-xs text-[#292B30]/70 max-w-sm mx-auto">
                        Orders placed using your account email ({customerAccount.email}) or phone number will appear here automatically.
                      </p>
                    </div>
                    <button
                      onClick={() => navigate('shop')}
                      className="px-6 py-3 rounded-xl bg-[#151C2C] hover:bg-[#C9B27C] text-[#FCFBF8] hover:text-[#0D0E10] text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Explore Collection
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myOrders.map((ord) => (
                      <div
                        key={ord.id}
                        className="p-5 rounded-xl bg-[#F7F3EA] border border-[#B8B9BC]/40 hover:border-[#C9B27C] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono text-xs font-bold text-[#0D0E10]">
                              {ord.orderNumber}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#151C2C] text-[#C9B27C]">
                              {ord.status}
                            </span>
                          </div>
                          <p className="text-xs text-[#292B30]/75">
                            {new Date(ord.createdAt).toLocaleDateString()} •{' '}
                            {ord.items.reduce((s, i) => s + i.quantity, 0)} Items •{' '}
                            <span className="font-bold text-[#0D0E10]">
                              PKR {ord.grandTotal.toLocaleString()}
                            </span>
                          </p>
                          <p className="text-[11px] text-[#292B30]/65 truncate max-w-md">
                            {ord.items.map((i) => i.productName).join(', ')}
                          </p>
                        </div>

                        <div className="flex items-center gap-2.5 self-start sm:self-center">
                          <button
                            onClick={() => setSelectedOrderDetail(ord)}
                            className="px-3.5 py-2 rounded-lg bg-[#FCFBF8] hover:bg-[#151C2C] text-[#0D0E10] hover:text-[#FCFBF8] border border-[#B8B9BC]/45 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Order Details</span>
                          </button>
                          <button
                            onClick={() =>
                              navigate('track-order', { orderNumber: ord.orderNumber })
                            }
                            className="px-3.5 py-2 rounded-lg bg-[#151C2C] hover:bg-[#C9B27C] text-[#FCFBF8] hover:text-[#0D0E10] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>Track</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 2. MY PROFILE TAB */}
            {activeTab === 'profile' && (
              <div className="bg-[#FCFBF8] rounded-2xl p-6 sm:p-8 border border-[#B8B9BC]/40 shadow-xs space-y-6">
                <div className="pb-4 border-b border-[#B8B9BC]/30">
                  <span className="text-[10px] font-semibold text-[#A98B52] uppercase tracking-[0.2em]">
                    Personal Details
                  </span>
                  <h2 className="font-luxury-serif text-xl sm:text-2xl font-semibold text-[#0D0E10]">
                    My Profile
                  </h2>
                </div>

                <form onSubmit={handleSaveProfile} className="max-w-lg space-y-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#292B30] uppercase tracking-[0.14em] mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="w-full px-4 py-3 text-xs sm:text-sm rounded-xl bg-[#F7F3EA] border border-[#B8B9BC]/50 text-[#0D0E10] focus:outline-none focus:border-[#C9B27C]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#292B30] uppercase tracking-[0.14em] mb-1.5">
                      Registered Email Address
                    </label>
                    <input
                      type="email"
                      disabled
                      value={customerAccount.email}
                      className="w-full px-4 py-3 text-xs sm:text-sm rounded-xl bg-[#F7F3EA]/60 border border-[#B8B9BC]/35 text-[#292B30]/60 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#292B30] uppercase tracking-[0.14em] mb-1.5">
                      Phone Number (For COD Delivery Coordination)
                    </label>
                    <input
                      type="tel"
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      placeholder="0300 1234567"
                      className="w-full px-4 py-3 text-xs sm:text-sm rounded-xl bg-[#F7F3EA] border border-[#B8B9BC]/50 text-[#0D0E10] focus:outline-none focus:border-[#C9B27C]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-6 py-3 rounded-xl bg-[#151C2C] hover:bg-[#C9B27C] text-[#FCFBF8] hover:text-[#0D0E10] text-xs font-semibold uppercase tracking-[0.15em] transition-all cursor-pointer"
                  >
                    {savingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
                  </button>
                </form>
              </div>
            )}

            {/* 3. SAVED ADDRESSES TAB */}
            {activeTab === 'addresses' && (
              <div className="bg-[#FCFBF8] rounded-2xl p-6 sm:p-8 border border-[#B8B9BC]/40 shadow-xs space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-[#B8B9BC]/30">
                  <div>
                    <span className="text-[10px] font-semibold text-[#A98B52] uppercase tracking-[0.2em]">
                      Delivery Book
                    </span>
                    <h2 className="font-luxury-serif text-xl sm:text-2xl font-semibold text-[#0D0E10]">
                      Saved Addresses
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowAddressForm(!showAddressForm)}
                    className="px-4 py-2.5 rounded-xl bg-[#151C2C] hover:bg-[#C9B27C] text-[#FCFBF8] hover:text-[#0D0E10] text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add New Address</span>
                  </button>
                </div>

                {showAddressForm && (
                  <form
                    onSubmit={handleAddAddress}
                    className="p-5 rounded-xl bg-[#F7F3EA] border border-[#C9B27C]/45 space-y-4"
                  >
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#0D0E10]">
                      New Delivery Address
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold mb-1">Address Label</label>
                        <select
                          value={newAddress.label}
                          onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
                          className="w-full px-3 py-2.5 text-xs rounded-lg bg-white border border-[#B8B9BC]/50"
                        >
                          <option value="Home">Home Residence</option>
                          <option value="Office">Corporate Office</option>
                          <option value="Project Site">Project / Construction Site</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold mb-1">Recipient Name</label>
                        <input
                          type="text"
                          value={newAddress.fullName}
                          onChange={(e) =>
                            setNewAddress({ ...newAddress, fullName: e.target.value })
                          }
                          placeholder={customerAccount.fullName}
                          className="w-full px-3 py-2.5 text-xs rounded-lg bg-white border border-[#B8B9BC]/50"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold mb-1">Phone Number *</label>
                        <input
                          type="tel"
                          required
                          value={newAddress.phone}
                          onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                          placeholder="0300 1234567"
                          className="w-full px-3 py-2.5 text-xs rounded-lg bg-white border border-[#B8B9BC]/50"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold mb-1">
                        Complete Street / House / Sector Address *
                      </label>
                      <input
                        type="text"
                        required
                        value={newAddress.addressLine}
                        onChange={(e) =>
                          setNewAddress({ ...newAddress, addressLine: e.target.value })
                        }
                        placeholder="House #, Street #, Phase / Block, Area"
                        className="w-full px-3 py-2.5 text-xs rounded-lg bg-white border border-[#B8B9BC]/50"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold mb-1">City</label>
                        <select
                          value={newAddress.city}
                          onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                          className="w-full px-3 py-2.5 text-xs rounded-lg bg-white border border-[#B8B9BC]/50"
                        >
                          {PAKISTAN_CITIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold mb-1">Province</label>
                        <select
                          value={newAddress.province}
                          onChange={(e) =>
                            setNewAddress({ ...newAddress, province: e.target.value })
                          }
                          className="w-full px-3 py-2.5 text-xs rounded-lg bg-white border border-[#B8B9BC]/50"
                        >
                          {PROVINCES.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold mb-1">
                          Nearest Landmark
                        </label>
                        <input
                          type="text"
                          value={newAddress.landmark}
                          onChange={(e) =>
                            setNewAddress({ ...newAddress, landmark: e.target.value })
                          }
                          placeholder="Optional"
                          className="w-full px-3 py-2.5 text-xs rounded-lg bg-white border border-[#B8B9BC]/50"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="submit"
                        className="px-5 py-2.5 rounded-lg bg-[#151C2C] text-[#FCFBF8] text-xs font-semibold uppercase tracking-wider cursor-pointer"
                      >
                        Save Address
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddressForm(false)}
                        className="px-4 py-2.5 rounded-lg border border-[#B8B9BC]/50 text-xs font-semibold cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {(customerAccount.savedAddresses || []).length === 0 ? (
                  <div className="py-10 text-center text-xs text-[#292B30]/70">
                    You have no saved delivery addresses yet. Add an address for one-click checkout.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(customerAccount.savedAddresses || []).map((addr) => (
                      <div
                        key={addr.id}
                        className="p-5 rounded-xl bg-[#F7F3EA] border border-[#B8B9BC]/40 flex flex-col justify-between gap-4"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="px-2.5 py-0.5 rounded-md bg-[#151C2C] text-[#C9B27C] text-[10px] font-bold uppercase tracking-wider">
                              {addr.label}
                            </span>
                            <button
                              onClick={() => addr.id && handleRemoveAddress(addr.id)}
                              className="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                              title="Remove Address"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-sm font-bold text-[#0D0E10]">{addr.fullName}</p>
                          <p className="text-xs text-[#292B30]/80">{addr.phone}</p>
                          <p className="text-xs text-[#292B30]/80 leading-relaxed">
                            {addr.addressLine}, {addr.city}, {addr.province}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 4. WISHLIST TAB */}
            {activeTab === 'wishlist' && (
              <div className="bg-[#FCFBF8] rounded-2xl p-6 sm:p-8 border border-[#B8B9BC]/40 shadow-xs space-y-6">
                <div className="pb-4 border-b border-[#B8B9BC]/30">
                  <span className="text-[10px] font-semibold text-[#A98B52] uppercase tracking-[0.2em]">
                    Saved Showroom Pieces
                  </span>
                  <h2 className="font-luxury-serif text-xl sm:text-2xl font-semibold text-[#0D0E10]">
                    My Wishlist ({wishlistedProducts.length})
                  </h2>
                </div>

                {wishlistedProducts.length === 0 ? (
                  <div className="py-12 text-center space-y-3">
                    <p className="text-xs text-[#292B30]/70">Your wishlist is currently empty.</p>
                    <button
                      onClick={() => navigate('shop')}
                      className="px-5 py-2.5 rounded-xl bg-[#151C2C] text-[#FCFBF8] text-xs font-semibold uppercase tracking-wider cursor-pointer"
                    >
                      Browse Products
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {wishlistedProducts.map((p) => (
                      <ProductCard key={p.id} product={p} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 5. ACCOUNT SETTINGS TAB */}
            {activeTab === 'settings' && (
              <div className="bg-[#FCFBF8] rounded-2xl p-6 sm:p-8 border border-[#B8B9BC]/40 shadow-xs space-y-6">
                <div className="pb-4 border-b border-[#B8B9BC]/30">
                  <span className="text-[10px] font-semibold text-[#A98B52] uppercase tracking-[0.2em]">
                    Security & Preferences
                  </span>
                  <h2 className="font-luxury-serif text-xl sm:text-2xl font-semibold text-[#0D0E10]">
                    Account Settings
                  </h2>
                </div>

                <form onSubmit={handleUpdatePassword} className="max-w-md space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#0D0E10] flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-[#A98B52]" />
                    <span>Update Account Password</span>
                  </h3>

                  <div>
                    <label className="block text-[11px] font-semibold mb-1">New Password</label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full px-4 py-2.5 text-xs rounded-xl bg-[#F7F3EA] border border-[#B8B9BC]/50"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Repeat new password"
                      className="w-full px-4 py-2.5 text-xs rounded-xl bg-[#F7F3EA] border border-[#B8B9BC]/50"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={updatingPassword}
                    className="px-6 py-3 rounded-xl bg-[#151C2C] hover:bg-[#C9B27C] text-[#FCFBF8] hover:text-[#0D0E10] text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
                  >
                    {updatingPassword ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};
