import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';
import { supabase, masterSupabase, switchTenant, resetTenant, DEFAULT_URL, DEFAULT_KEY, isPlatformMode, isPlatformSlug, MASTER_URL, MASTER_KEY } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../hooks/useTenant';
import { sendEmail } from '../lib/resend';
import { Search, ChevronDown, ShieldCheck, Layers, Users, Sparkles, ChevronRight, ArrowRight, LogIn, X } from 'lucide-react';

const countries = [
  { code: '+91', flag: '🇮🇳', name: 'India' },
  { code: '+1', flag: '🇺🇸', name: 'United States' },
  { code: '+44', flag: '🇬🇧', name: 'United Kingdom' },
  { code: '+971', flag: '🇦🇪', name: 'United Arab Emirates' },
  { code: '+65', flag: '🇸🇬', name: 'Singapore' },
  { code: '+60', flag: '🇲🇾', name: 'Malaysia' },
  { code: '+61', flag: '🇦🇺', name: 'Australia' },
  { code: '+93', flag: '🇦🇫', name: 'Afghanistan' },
  { code: '+358', flag: '🇫🇮', name: 'Åland Islands' },
  { code: '+355', flag: '🇦🇱', name: 'Albania' },
  { code: '+213', flag: '🇩🇿', name: 'Algeria' },
  { code: '+1', flag: '🇦🇸', name: 'American Samoa' },
  { code: '+376', flag: '🇦🇩', name: 'Andorra' },
  { code: '+244', flag: '🇦🇴', name: 'Angola' },
  { code: '+1', flag: '🇦🇮', name: 'Anguilla' },
  { code: '+1', flag: '🇦🇬', name: 'Antigua and Barbuda' },
  { code: '+966', flag: '🇸🇦', name: 'Saudi Arabia' },
  { code: '+1', flag: '🇨🇦', name: 'Canada' },
  { code: '+49', flag: '🇩🇪', name: 'Germany' },
  { code: '+33', flag: '🇫🇷', name: 'France' },
  { code: '+81', flag: '🇯🇵', name: 'Japan' },
  { code: '+86', flag: '🇨🇳', name: 'China' },
  { code: '+92', flag: '🇵🇰', name: 'Pakistan' },
  { code: '+880', flag: '🇧🇩', name: 'Bangladesh' },
  { code: '+94', flag: '🇱🇰', name: 'Sri Lanka' },
  { code: '+977', flag: '🇳🇵', name: 'Nepal' },
  { code: '+27', flag: '🇿🇦', name: 'South Africa' },
  { code: '+7', flag: '🇷🇺', name: 'Russia' },
  { code: '+55', flag: '🇧🇷', name: 'Brazil' }
];

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { session, profile, loading: authLoading, fetchProfile } = useAuth();
  const { updateTenantInfo } = useTenant();

  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  
  // Auth states
  const [email, setEmail] = useState('');
  const [superEmail, setSuperEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [forgotInput, setForgotInput] = useState('');
  const [emailOrId, setEmailOrId] = useState('');

  // Tenant / Company states
  const [companyInputSlug, setCompanyInputSlug] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<{name: string, slug: string} | null>(null);

  // Load cached tenant details on mount
  useEffect(() => {
    const cachedSlug = localStorage.getItem('selected_tenant_slug');
    const cachedName = localStorage.getItem('selected_tenant_name');
    const cachedUrl = localStorage.getItem('selected_tenant_url');
    if (cachedSlug && cachedName) {
      setSelectedCompany({ name: cachedName, slug: cachedSlug });
    }
    // Always re-apply the correct key for VyaraHR in case a stale key was cached
    if (cachedUrl === DEFAULT_URL) {
      localStorage.setItem('selected_tenant_key', DEFAULT_KEY);
    }
  }, []);

  // Signup form states
  const [signupData, setSignupData] = useState({
    name: '',
    orgName: '',
    orgEmail: '',
    phone: '',
    offerLetter: null as File | null
  });

  const [selectedCountry, setSelectedCountry] = useState(countries[0]);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');

  useEffect(() => {
    if (!isCountryDropdownOpen) return;
    const handleOutsideClick = () => {
      setIsCountryDropdownOpen(false);
    };
    // Use timeout to prevent immediate trigger upon opening click
    const timer = setTimeout(() => {
      document.addEventListener('click', handleOutsideClick);
    }, 10);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [isCountryDropdownOpen]);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-connect to workspace if specified in URL query (e.g. ?workspace=marabanu)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const workspaceParam = params.get('workspace') || params.get('slug');
    if (workspaceParam) {
      const slug = workspaceParam.trim().toLowerCase();
      setCompanyInputSlug(slug);
      (async () => {
        try {
          const { data: mapData } = await masterSupabase
            .from('tenant_mappings')
            .select('*')
            .eq('slug', slug)
            .maybeSingle();

          if (mapData) {
            switchTenant(DEFAULT_URL, DEFAULT_KEY, mapData.slug);
            localStorage.setItem('selected_tenant_slug', mapData.slug);
            localStorage.setItem('selected_tenant_name', mapData.company_name);
            setSelectedCompany({ name: mapData.company_name, slug: mapData.slug });
            updateTenantInfo(mapData.slug, mapData.company_name);
            setActiveModal('loginModal');
          }
        } catch (e) {
          console.warn('Auto-workspace connection note:', e);
        }
      })();
    }
  }, []);

  useEffect(() => {
    // Only redirect if session AND profile are fully resolved and authenticated
    if (!authLoading && session && profile) {
      if (isPlatformMode()) {
        if (profile.role === 'platform_admin' || profile.role === 'superadmin') {
          navigate('/platform', { replace: true });
        }
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [authLoading, session, profile]);

  useEffect(() => {
    const reveals = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    reveals.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const openModal = (id: string) => {
    if (id === 'selectorModal' && !selectedCompany) {
      setActiveModal('companySlugModal');
    } else {
      setActiveModal(id);
    }
    setError(null);
    document.body.style.overflow = 'hidden';
  };

  const closeModals = () => {
    setActiveModal(null);
    document.body.style.overflow = '';
  };

  const handleCompanySlugSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const slug = companyInputSlug.trim().toLowerCase();
    if (!slug) {
      setError('Please enter a company code.');
      setLoading(false);
      return;
    }

    if (isPlatformSlug(slug)) {
      switchTenant(MASTER_URL, MASTER_KEY);
      localStorage.setItem('selected_tenant_slug', slug);
      localStorage.setItem('selected_tenant_name', 'VyaraHR Platform');
      setSelectedCompany({ name: 'VyaraHR Platform', slug });
      updateTenantInfo(slug, 'VyaraHR Platform');
      setActiveModal('loginModal');
      setLoading(false);
      return;
    }

    try {
      // Query the VyaraHR Platform for tenant details
      let connData: any = null;
      const { data: mapData, error: mapErr } = await masterSupabase
        .from('tenant_mappings')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (mapData) {
        connData = {
          company_slug: mapData.slug,
          company_name: mapData.company_name,
          supabase_url: DEFAULT_URL,
          supabase_anon_key: DEFAULT_KEY,
          status: mapData.status
        };
      } else {
        const { data: legacyData, error: lookupError } = await masterSupabase
          .from('tenant_connections')
          .select('*')
          .eq('company_slug', slug)
          .maybeSingle();

        if (lookupError && !mapErr) {
          console.error('VyaraHR Platform lookup error:', lookupError);
        }
        connData = legacyData;
      }

      if (!connData) {
        setError('Invalid company code. Please check and try again.');
        setLoading(false);
        return;
      }

      const data = connData;

      // Use the hardcoded correct key for known projects (guards against stale DB entries).
      // For any future new tenant whose URL is not DEFAULT_URL, the DB key is used directly.
      const tenantKey = data.supabase_url === DEFAULT_URL
        ? DEFAULT_KEY
        : data.supabase_anon_key;

      // Switch active tenant project at runtime
      switchTenant(data.supabase_url, tenantKey, data.company_slug);

      // Save connection details locally
      localStorage.setItem('selected_tenant_slug', data.company_slug);
      localStorage.setItem('selected_tenant_name', data.company_name);

      // Update state
      setSelectedCompany({ name: data.company_name, slug: data.company_slug });
      updateTenantInfo(data.company_slug, data.company_name);

      // Proceed to the unified login modal
      setActiveModal('loginModal');
    } catch (err: any) {
      console.error('Tenant selection error:', err);
      setError(err.message || 'An error occurred during company verification.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnifiedLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const inputId = emailOrId.trim();
      if (!inputId) {
        setError('Please enter your Employee ID or Email.');
        setLoading(false);
        return;
      }

      let targetEmail = '';

      if (isPlatformMode()) {
        const emailToCheck = inputId.includes('@') ? inputId.toLowerCase() : '';
        if (!emailToCheck) {
          setError('Platform Administrators must log in using their email address.');
          setLoading(false);
          return;
        }

        const superAdmins = ['superadmin@vyarahr.com', 'superadmin@gmail.com', 'praveen12rangasamy@gmail.com', 'pranavanandan18@gmail.com', 'pranavananthan18@gmail.com', 'jin@gmail.com'];

        const { data: platformUser, error: platformErr } = await masterSupabase
          .from('platform_users')
          .select('email, role')
          .eq('email', emailToCheck)
          .eq('is_active', true)
          .maybeSingle();

        if (platformErr && !superAdmins.includes(emailToCheck)) {
          setError('Database error while looking up Platform Admin account.');
          setLoading(false);
          return;
        }

        if (!platformUser && !superAdmins.includes(emailToCheck)) {
          setError('No active Platform Administrator account found with this email.');
          setLoading(false);
          return;
        }

        targetEmail = platformUser ? platformUser.email : emailToCheck;
      } else {
        // Normal organization mode: resolve Email or Employee ID
        const superAdmins = ['superadmin@vyarahr.com', 'superadmin@gmail.com', 'praveen12rangasamy@gmail.com', 'pranavanandan18@gmail.com', 'pranavananthan18@gmail.com', 'jin@gmail.com'];

        if (inputId.includes('@')) {
          const emailToCheck = inputId.toLowerCase();
          if (superAdmins.includes(emailToCheck)) {
            targetEmail = emailToCheck;
          } else {
            // Look up the profile from email
            const { data: profile, error: lookupError } = await supabase
              .from('profiles')
              .select('email, role')
              .eq('email', emailToCheck)
              .maybeSingle();

            if (lookupError) {
              setError('Database error while looking up profile.');
              setLoading(false);
              return;
            }

            if (!profile) {
              setError('No account found with this email.');
              setLoading(false);
              return;
            }

            targetEmail = profile.email;
          }
        } else {
          // Look up the profile from Employee ID
          const { data: profile, error: lookupError } = await supabase
            .from('profiles')
            .select('email, role')
            .eq('employee_id', inputId)
            .maybeSingle();

          if (lookupError) {
            setError('Database error while looking up Employee ID.');
            setLoading(false);
            return;
          }

          if (!profile) {
            setError('No account found with this Employee ID.');
            setLoading(false);
            return;
          }

          targetEmail = profile.email;
        }
      }

      // Sign in via Supabase Auth using the resolved email
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password,
      });

      if (authError) {
        setError(authError.message || 'Invalid credentials. Please try again.');
        setLoading(false);
        return;
      }

      // Pre-fetch profile directly before navigating so state is ready in PlatformRoute
      if (authData.user) {
        await fetchProfile(authData.user);
      }

      if (isPlatformMode()) {
        // Log successful Platform Admin login
        try {
          const { auditService } = await import('../services/auditService');
          await auditService.log(
            'Platform Admin successfully logged into system operations portal',
            targetEmail,
            'platform_admin',
            'platform',
            targetEmail
          );
        } catch (auditErr) {
          console.error('Failed to log platform admin audit:', auditErr);
        }
        closeModals();
        navigate('/platform');
      } else {
        // Log successful tenant login (employee, admin, superadmin)
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role, full_name')
            .eq('email', targetEmail.trim().toLowerCase())
            .maybeSingle();

          const role = profile?.role || 'employee';
          const name = profile?.full_name || targetEmail;
          const tenantSlug = localStorage.getItem('selected_tenant_slug') || 'unknown';

          const { auditService } = await import('../services/auditService');
          await auditService.log(
            `${role === 'superadmin' ? 'Super Admin' : role === 'admin' ? 'HR Admin' : 'Employee'} successfully logged into VyaraHR Portal`,
            targetEmail,
            role,
            'tenant_portal',
            tenantSlug,
            { name }
          );
        } catch (auditErr) {
          console.error('Failed to log tenant login audit:', auditErr);
        }
        closeModals();
        navigate('/dashboard');
      }
      closeModals();
    } catch (err: any) {
      console.error('Unified login error:', err);
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };


  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const input = forgotInput.trim();
      let targetEmail = '';

      if (input.includes('@')) {
        targetEmail = input.toLowerCase();
      } else {
        // Resolve Employee ID to Email
        const { data: dbProfile, error: dbError } = await supabase
          .from('profiles')
          .select('email')
          .eq('employee_id', input)
          .maybeSingle();

        if (dbError) {
          setError('Database error while looking up Employee ID.');
          setLoading(false);
          return;
        }

        if (!dbProfile) {
          setError('No account found with this Employee ID.');
          setLoading(false);
          return;
        }

        targetEmail = dbProfile.email;
      }

      // Call Supabase password reset email
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(targetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        setError(resetError.message || 'Failed to send password reset email.');
        setLoading(false);
        return;
      }

      setSuccessMessage('Password reset link sent! Check your inbox.');
      setForgotInput('');
    } catch (err: any) {
      console.error('Forgot password error:', err);
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const cleanEmail = signupData.orgEmail.trim().toLowerCase();
      const cleanCompany = signupData.orgName.trim();
      const cleanName = signupData.name.trim();

      if (!cleanEmail || !cleanCompany) {
        throw new Error('Organization name and email are required.');
      }

      // 1. Upload offer letter if attached
      let offerLetterUrl = '';
      if (signupData.offerLetter) {
        try {
          const slug = cleanCompany
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '') || 'workspace';
          const fileName = `${slug}/${Date.now()}_${signupData.offerLetter.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
          const uploadRes = await masterSupabase.storage
            .from('documents')
            .upload(fileName, signupData.offerLetter);
          if (uploadRes?.data?.path) {
            offerLetterUrl = uploadRes.data.path;
          }
        } catch (uploadErr) {
          console.warn('Offer letter upload skipped or failed:', uploadErr);
        }
      }

      // 2. Submit access request to backend
      const apiUrl = ((import.meta as any).env?.VITE_API_URL || '').replace(/\/$/, '');
      const response = await fetch(`${apiUrl}/api/access-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: cleanName,
          company_name: cleanCompany,
          work_email: cleanEmail,
          email: cleanEmail,
          phone: `${selectedCountry.code} ${signupData.phone}`,
          offer_letter_url: offerLetterUrl
        })
      });

      const json = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(json?.error || 'Failed to submit access request');
      }

      // 3. Send real email via Resend if key exists
      try {
        await sendEmail({
          to: 'vyara2026@gmail.com', // Admin notification
          subject: `New HR Registration: ${cleanCompany}`,
          html: `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
              <h2 style="color: #0f2d52;">New Organizational Access Request</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Name:</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee;">${cleanName}</td></tr>
                <tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Organization:</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee;">${cleanCompany}</td></tr>
                <tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Email:</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee;">${cleanEmail}</td></tr>
                <tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Phone:</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee;">${selectedCountry.code} ${signupData.phone}</td></tr>
                <tr><td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>Status:</strong></td><td style="padding: 10px; border-bottom: 1px solid #eee;">Pending Approval in Platform Console</td></tr>
              </table>
            </div>
          `
        });
      } catch (err) {
        console.warn('Email notification skipped:', err);
      }
      
      setSuccessMessage('Your registration request has been submitted successfully! The platform administrator will review your workspace details and approve your credentials.');
      
      // Reset form
      setSignupData({
        name: '',
        orgName: '',
        orgEmail: '',
        phone: '',
        offerLetter: null
      });
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="landing-body">
      {/* ===== NAVBAR ===== */}
      <nav className={`${scrolled ? 'scrolled' : ''} ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <a href="#" className="nav-logo" onClick={() => setIsMobileMenuOpen(false)}>
          <img src="/logo.png" alt="VyaraHR" className="nav-logo-img" />
        </a>

        {/* Desktop Links */}
        <ul className="nav-links">
          <li><a href="#products">Products</a></li>
          <li><a href="#customers">Customers</a></li>
          <li><a href="#about">About</a></li>
        </ul>

        {/* Desktop CTA */}
        <div className="nav-cta">
          <button className="btn-ghost" onClick={() => openModal('signupModal')}>Sign Up</button>
          <button className="btn-ghost" onClick={() => selectedCompany ? openModal('loginModal') : openModal('companySlugModal')}>Log In</button>
          <button className="btn-primary" onClick={() => openModal('signupModal')}>Get Started Free</button>
        </div>

        {/* Mobile Hamburger */}
        <button 
          className={`hamburger ${isMobileMenuOpen ? 'open' : ''}`} 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle Menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

      </nav>
      
      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="mobile-menu-backdrop" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Slide-down Menu */}
      <div className={`mobile-menu ${isMobileMenuOpen ? 'active' : ''}`}>
        <div className="mobile-menu-inner">
          {/* Top category label & badge */}
          <div className="mobile-menu-topbar">
            <div className="mobile-menu-tag">
              <span className="mobile-pulse-dot"></span>
              <span>MENU NAVIGATION</span>
            </div>
            <span className="mobile-version-tag">v2.4 Live</span>
          </div>

          {/* Navigation Links Cards */}
          <div className="mobile-nav-list">
            <a 
              href="#products" 
              className="mobile-nav-item" 
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <div className="nav-item-icon-box icon-box-teal">
                <Layers size={18} />
              </div>
              <div className="nav-item-text">
                <span className="nav-item-title">Products</span>
                <span className="nav-item-desc">Core HR, Payroll & AI ATS</span>
              </div>
              <ChevronRight size={16} className="nav-item-arrow" />
            </a>

            <a 
              href="#customers" 
              className="mobile-nav-item" 
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <div className="nav-item-icon-box icon-box-purple">
                <Users size={18} />
              </div>
              <div className="nav-item-text">
                <span className="nav-item-title">Customers</span>
                <span className="nav-item-desc">Trusted by top enterprises</span>
              </div>
              <ChevronRight size={16} className="nav-item-arrow" />
            </a>


            <a 
              href="#about" 
              className="mobile-nav-item" 
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <div className="nav-item-icon-box icon-box-blue">
                <Sparkles size={18} />
              </div>
              <div className="nav-item-text">
                <span className="nav-item-title">About</span>
                <span className="nav-item-desc">Our mission, values & team</span>
              </div>
              <ChevronRight size={16} className="nav-item-arrow" />
            </a>
          </div>

          {/* CTAs */}
          <div className="mobile-nav-actions">
            <button 
              type="button"
              className="mobile-action-primary" 
              onClick={() => { setIsMobileMenuOpen(false); openModal('signupModal'); }}
            >
              <span>Start Free Trial</span>
              <ArrowRight size={17} />
            </button>
            <button 
              type="button"
              className="mobile-action-secondary" 
              onClick={() => { setIsMobileMenuOpen(false); selectedCompany ? openModal('loginModal') : openModal('companySlugModal'); }}
            >
              <LogIn size={16} />
              <span>Sign In</span>
            </button>
          </div>

          {/* Trust and status footer */}
          <div className="mobile-menu-footer">
            <div className="mobile-trust-badge">
              <ShieldCheck size={15} />
              <span>14-day free trial • No credit card required</span>
            </div>
            <div className="mobile-status-bar">
              <span className="mobile-status-dot"></span>
              <span>VyaraHR Platform</span>
              <span className="dot-divider">•</span>
              <span>Enterprise Ready</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== HERO ===== */}
      <section className="hero" id="home">
        <div className="hero-glow"></div>
        <div className="hero-glow2"></div>

        <div className="hero-content">
          <div className="hero-badge">Leading HR Management Solution</div>
          <h1>HR Management<br />Made <span className="highlight">Effortlessly</span><br />Powerful</h1>
          <p>VyaraHR brings hiring, onboarding, payroll, performance, and team management into one seamless platform — built for modern businesses.</p>
          <div className="hero-btns">
            <button className="btn-primary btn-large" onClick={() => openModal('signupModal')}>Start Free Trial</button>
            <button className="btn-outline-large" onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}>Explore Features →</button>
          </div>
          <div className="hero-stats">
            <div className="stat-item"><div className="stat-num">🛡️</div><div className="stat-label">Secure Enterprise Platform</div></div>
            <div className="stat-item"><div className="stat-num">50K+</div><div className="stat-label">Employees managed</div></div>
            <div className="stat-item"><div className="stat-num">99.9%</div><div className="stat-label">Uptime guaranteed</div></div>
          </div>
        </div>

        {/* Dashboard Mockup */}
        <div className="hero-visual">
          <div className="dashboard-mock">
            <div className="mock-topbar">
              <div className="mock-dot r"></div>
              <div className="mock-dot y"></div>
              <div className="mock-dot g"></div>
              <span className="mock-title">VyaraHR — Admin Dashboard</span>
            </div>
            <div className="mock-cards">
              <div className="mock-card">
                <div className="mock-card-label">Total Employees</div>
                <div className="mock-card-val white">142</div>
              </div>
              <div className="mock-card">
                <div className="mock-card-label">Present Today</div>
                <div className="mock-card-val teal">128</div>
              </div>
              <div className="mock-card">
                <div className="mock-card-label">On Leave</div>
                <div className="mock-card-val orange">14</div>
              </div>
            </div>
            <div className="mock-bar-section">
              <div className="mock-bar-title">Department Performance</div>
              <div className="mock-bar-row"><span className="mock-bar-name">Development</span><div className="mock-bar-track"><div className="mock-bar-fill w-88pct"></div></div><span className="mock-bar-pct">88%</span></div>
              <div className="mock-bar-row"><span className="mock-bar-name">Marketing</span><div className="mock-bar-track"><div className="mock-bar-fill orange w-72pct"></div></div><span className="mock-bar-pct">72%</span></div>
              <div className="mock-bar-row"><span className="mock-bar-name">Sales</span><div className="mock-bar-track"><div className="mock-bar-fill w-65pct"></div></div><span className="mock-bar-pct">65%</span></div>
              <div className="mock-bar-row"><span className="mock-bar-name">Testing</span><div className="mock-bar-track"><div className="mock-bar-fill orange w-91pct"></div></div><span className="mock-bar-pct">91%</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== PRODUCTS ===== */}
      <section id="products">
        <div className="reveal">
          <div className="section-label">Products</div>
          <h2 className="section-title">Everything your HR team<br />needs, built in</h2>
          <p className="section-sub">From hiring to retirement — VyaraHR covers every touchpoint of your employee lifecycle in one intelligent platform.</p>
        </div>
        <div className="products-grid">
          <div className="product-card reveal">
            <div className="product-name">Smart Dashboard</div>
            <div className="product-desc">Real-time company pulse — attendance, leaves, remote workers, and team status at a single glance.</div>
            <ul className="product-features">
              <li>Live Attendance</li>
              <li>Leave Tracking</li>
              <li>Team Analytics</li>
            </ul>
          </div>
          <div className="product-card reveal">
            <div className="product-name">AI-Powered Hiring</div>
            <div className="product-desc">From job posting to offer letter — our ATS AI shortlists resumes automatically.</div>
            <ul className="product-features">
              <li>ATS Integration</li>
              <li>Resume Parsing</li>
              <li>Auto-Shortlisting</li>
            </ul>
          </div>
          <div className="product-card reveal">
            <div className="product-name">Onboarding & Offboarding</div>
            <div className="product-desc">Create employee IDs, generate offer letters, and manage smooth exits.</div>
            <ul className="product-features">
              <li>Digital Offer Letters</li>
              <li>Asset Tracking</li>
              <li>Exit Management</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ===== CUSTOMERS ===== */}
      <section id="customers">
        <div className="customers-header reveal">
          <div className="section-label">Customers</div>
          <h2 className="section-title">Fueling the world's most<br />ambitious Companies</h2>
        </div>
        <div className="logos-strip reveal">
          <div className="logos-track">
            {['ZOMATO', 'SWIGGY', 'RAZORPAY', 'DUNZO', 'CRED', 'FLIPKART', 'ZOMATO', 'SWIGGY', 'RAZORPAY', 'DUNZO'].map((logo, i) => (
              <div key={i} className="logo-item">{logo}</div>
            ))}
          </div>
        </div>
        <div className="testimonials-grid">
          {[
            { name: 'Arjun Reddy', role: 'CEO at TechNova', text: 'VyaraHR completely transformed how we manage our 200+ employees. The AI hiring tool saved us hundreds of hours.' },
            { name: 'Priya Sharma', role: 'HR Director at GlobalSync', text: 'The most intuitive HR platform I have ever used. Our employees love the self-service mobile portal!' },
            { name: 'Vikram Singh', role: 'Founder at GrowthScale', text: 'Clean, fast, and powerful. VyaraHR is exactly what any modern startup needs to scale their team.' }
          ].map((t, i) => (
            <div key={i} className="testimonial-card reveal">
              <div className="stars">★★★★★</div>
              <p className="testimonial-text">"{t.text}"</p>
              <div className="testimonial-author">
                <div className={`author-avatar testimonial-bg-${i}`}>{t.name[0]}</div>
                <div>
                  <div className="author-name">{t.name}</div>
                  <div className="author-role">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>



      {/* ===== ABOUT ===== */}
      <section id="about">
        <div className="reveal">
          <div className="section-label">About Us</div>
          <h2 className="section-title">Human-first design for<br />modern workforce</h2>
          <p className="section-sub">At VyaraHR, we believe HR should be a catalyst for growth, not a source of paperwork. Our mission is to automate the mundane so you can focus on your most valuable asset: your people.</p>
          <div className="about-values">
            <div className="value-card">
              <div className="value-icon">⚡</div>
              <div className="value-name">Speed</div>
              <div className="value-desc">Fastest implementation in the industry.</div>
            </div>
            <div className="value-card">
              <div className="value-icon">🛡️</div>
              <div className="value-name">Security</div>
              <div className="value-desc">Enterprise-grade data protection.</div>
            </div>
          </div>
        </div>
        <div className="about-visual reveal">
          <div className="about-card-main">
            <div className="about-team-grid">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <div key={i} className="team-member">
                  <div className={`team-avatar ${i % 2 === 0 ? 'team-bg-even' : 'team-bg-odd'}`}>{String.fromCharCode(64 + i)}</div>
                  <div className="team-name">Member {i}</div>
                </div>
              ))}
            </div>
            <div className="about-metrics">
              <div className="about-metric"><div className="about-metric-num">15m+</div><div className="about-metric-label">Hours Saved</div></div>
              <div className="about-metric"><div className="about-metric-num">98%</div><div className="about-metric-label">CSAT Score</div></div>
              <div className="about-metric"><div className="about-metric-num">24/7</div><div className="about-metric-label">Support</div></div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== CTA SECTION ===== */}
      <section className="cta-section reveal">
        <h2 className="cta-title">Ready to transform<br />your workplace?</h2>
        <p className="cta-sub">Join forward-thinking companies already using VyaraHR to build better teams.</p>
        <div className="cta-btns">
          <button className="btn-primary btn-large" onClick={() => openModal('signupModal')}>Create Free Account</button>
          <button className="btn-outline-large" onClick={() => openModal('signupModal')}>Book a Demo</button>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer>
        <div className="footer-grid">
          <div className="footer-brand">
            <a href="#" className="nav-logo">Vyara<span>HR</span></a>
            <p className="footer-tagline">Modern HR management for growing businesses. Built in Coimbatore, Tamil Nadu.</p>
            <div className="footer-socials">
              <button className="social-btn">in</button>
              <button className="social-btn">tw</button>
              <button className="social-btn">fb</button>
            </div>
          </div>
          <div className="footer-col">
            <h4>Products</h4>
            <ul>
              <li><a href="#products">Dashboard</a></li>
              <li><a href="#products">AI Hiring</a></li>
              <li><a href="#products">Payroll</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Resources</h4>
            <ul>
              <li><a href="#">Guides</a></li>
              <li><a href="#">Security</a></li>
              <li><a href="#">Help Center</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Contact</h4>
            <ul>
              <li><a href="#">Sales</a></li>
              <li><a href="#">Support</a></li>
              <li><a href="#">Partners</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2025 VyaraHR. All rights reserved. Made in Coimbatore 🇮🇳</span>
          <span>Terms · Privacy · Cookies</span>
        </div>
      </footer>

      {/* ===== COMPANY SLUG MODAL ===== */}
      <div className={`modal-overlay ${activeModal === 'companySlugModal' ? 'open' : ''}`} onClick={(e) => e.target === e.currentTarget && closeModals()}>
        <div className="modal">
          <button className="modal-close" onClick={closeModals}>✕</button>
          <div className="modal-logo">
            <img src="/logo.png" alt="VyaraHR" />
          </div>
          <h2>Enter Company Code</h2>
          <p className="modal-subtitle">Connect to your company's dedicated portal</p>
          
          <form onSubmit={handleCompanySlugSubmit}>
            {error && <div className="error-message">{error}</div>}
            <div className="form-group">
              <label className="form-label">Company Code</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. marabanu, or 'master' for platform" 
                value={companyInputSlug}
                onChange={(e) => setCompanyInputSlug(e.target.value)}
                required
                autoComplete="off"
              />
            </div>
            <button className="modal-btn" type="submit" disabled={loading}>
              {loading ? 'Verifying...' : 'Next →'}
            </button>
            <div style={{ marginTop: '14px', textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  setCompanyInputSlug('vyarahr-platform');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6b7280',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 8px'
                }}
                onMouseOver={(e) => (e.currentTarget.style.color = '#ff5900')}
                onMouseOut={(e) => (e.currentTarget.style.color = '#6b7280')}
              >
                <ShieldCheck size={14} color="#ff5900" />
                <span>Platform Operator / Master Router? Click here</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ===== UNIFIED LOGIN MODAL ===== */}
      <div className={`modal-overlay ${activeModal === 'loginModal' ? 'open' : ''}`} onClick={(e) => e.target === e.currentTarget && closeModals()}>
        <div className="modal">
          <button className="modal-close" onClick={closeModals}>✕</button>
          <div className="modal-logo">
            <img src="/logo.png" alt="VyaraHR" />
          </div>
          
          {selectedCompany && (
            <div style={{ display: 'flex', justifyContent: 'center', width: '100%', marginBottom: '16px' }}>
              <div style={{
                backgroundColor: 'var(--brand-teal-light, #f0fdfa)',
                color: 'var(--brand-teal, #0d9488)',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                Connected to: {selectedCompany.name}
                <a href="#" onClick={(e) => {
                  e.preventDefault();
                  resetTenant();
                  setSelectedCompany(null);
                  setCompanyInputSlug('');
                  setActiveModal('companySlugModal');
                }} style={{
                  color: '#ff5900',
                  textDecoration: 'underline',
                  marginLeft: '4px'
                }}>
                  Change
                </a>
              </div>
            </div>
          )}

          <h2>Sign In</h2>
          <p className="modal-subtitle">
            {isPlatformMode() 
              ? 'Sign in to the Platform Control Center using your operator email' 
              : 'Enter your Email or Employee ID and password to access your portal'
            }
          </p>
          
          <form onSubmit={handleUnifiedLogin}>
            {error && <div className="error-message">{error}</div>}
            <div className="form-group">
              <label className="form-label">
                {isPlatformMode() ? 'Operator Email' : 'Email Address or Employee ID'}
              </label>
              <input 
                type="text" 
                className="form-input" 
                placeholder={isPlatformMode() ? "name@company.com" : "e.g. VYR-2024-001 or name@company.com"} 
                value={emailOrId}
                onChange={(e) => setEmailOrId(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input 
                type="password" 
                className="form-input" 
                placeholder="Enter your password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', width: '100%' }}>
              <button type="button" className="form-forgot" onClick={() => openModal('forgotPasswordModal')}>Forgot password?</button>
            </div>
            <button className="modal-btn accent" type="submit" disabled={loading}>
              {loading ? 'Authenticating...' : 'Sign In →'}
            </button>
          </form>
          
          <div className="modal-switch mt-20"><a href="#" onClick={() => openModal('companySlugModal')}>← Back</a></div>
        </div>
      </div>

      {/* ===== FORGOT PASSWORD MODAL ===== */}
      <div className={`modal-overlay ${activeModal === 'forgotPasswordModal' ? 'open' : ''}`} onClick={(e) => e.target === e.currentTarget && closeModals()}>
        <div className="modal animate-in fade-in duration-200">
          <button className="modal-close" onClick={closeModals}>✕</button>
          <div className="modal-logo">
            <img src="/logo.png" alt="VyaraHR" />
          </div>
          <h2>Reset Password</h2>
          <p className="modal-subtitle">We will send a password reset link to your email</p>
          
          <form onSubmit={handleForgotPasswordSubmit}>
            {error && <div className="error-message">{error}</div>}
            {successMessage && <div className="success-message" style={{ color: 'var(--teal)', fontSize: '0.85rem', marginBottom: '12px', textAlign: 'center' }}>{successMessage}</div>}
            
            <div className="form-group">
              <label className="form-label">Employee ID or Email</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. VYR-101 or email@company.com" 
                value={forgotInput}
                onChange={(e) => setForgotInput(e.target.value)}
                required
                autoComplete="off"
              />
            </div>
            
            <button className="modal-btn accent" type="submit" disabled={loading}>
              {loading ? 'Sending link...' : 'Send Reset Link →'}
            </button>
          </form>
          
          <div className="modal-switch mt-20">Remembered your password? <a href="#" onClick={() => openModal('loginModal')}>Back to Login</a></div>
        </div>
      </div>

      {/* ===== SIGNUP MODAL (HR REGISTRATION) ===== */}
      <div className={`modal-overlay ${activeModal === 'signupModal' ? 'open' : ''}`} onClick={(e) => e.target === e.currentTarget && closeModals()}>
        <div className="modal modal-lg">
          <button className="modal-close" onClick={closeModals}>✕</button>
          <div className="modal-logo">
            <img src="/logo.png" alt="VyaraHR" />
          </div>
          
          {successMessage ? (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-emerald-100/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">Registration Received!</h2>
              <p className="text-gray-400 leading-relaxed mb-8">
                {successMessage}
              </p>
              <button className="modal-btn" onClick={() => { closeModals(); setSuccessMessage(null); }}>
                Done
              </button>
            </div>
          ) : (
            <>
              <div className="modal-role-badge admin">HR Signup</div>
              <h2>Create Admin Account</h2>
              <p className="modal-subtitle">Register your organization to start your free trial</p>
              
              <form onSubmit={handleSignupSubmit}>
                <div className="grid-2col">
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Your Name" 
                      required
                      value={signupData.name}
                      onChange={(e) => setSignupData({...signupData, name: e.target.value})}
                    />
                  </div>
                   <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <div className="phone-input-container">
                       <div className="country-selector-wrapper">
                         <button 
                           type="button"
                           className="form-input country-select-trigger"
                           onClick={(e) => {
                             e.preventDefault();
                             setIsCountryDropdownOpen(!isCountryDropdownOpen);
                           }}
                         >
                           <span className="selected-flag">{selectedCountry.flag}</span>
                           <ChevronDown size={14} className={`arrow-icon ${isCountryDropdownOpen ? 'open' : ''}`} />
                         </button>
                         
                         {isCountryDropdownOpen && (
                           <div className="country-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                             <div className="dropdown-search-wrapper">
                               <Search size={14} className="search-icon" />
                               <input 
                                 type="text"
                                 className="dropdown-search-input"
                                 placeholder="Search country..."
                                 value={countrySearch}
                                 onChange={(e) => setCountrySearch(e.target.value)}
                                 onClick={(e) => e.stopPropagation()}
                                 autoFocus
                               />
                             </div>
                             <div className="country-options-list">
                               {countries
                                 .filter(c => 
                                   c.name.toLowerCase().includes(countrySearch.toLowerCase()) || 
                                   c.code.includes(countrySearch)
                                 )
                                 .map(c => (
                                   <button
                                     key={`${c.code}-${c.name}`}
                                     type="button"
                                     className="country-option-item"
                                     onClick={() => {
                                       setSelectedCountry(c);
                                       setIsCountryDropdownOpen(false);
                                       setCountrySearch('');
                                     }}
                                   >
                                     <span className="option-flag">{c.flag}</span>
                                     <span className="option-name">{c.name}</span>
                                     <span className="option-code">{c.code}</span>
                                   </button>
                                 ))
                               }
                             </div>
                           </div>
                         )}
                       </div>
                       <input 
                         type="tel" 
                         className="form-input phone-number-input" 
                         placeholder="Enter a phone number" 
                         required
                         value={signupData.phone}
                         onChange={(e) => setSignupData({...signupData, phone: e.target.value})}
                       />
                     </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Organization Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Company Pvt Ltd" 
                    required
                    value={signupData.orgName}
                    onChange={(e) => setSignupData({...signupData, orgName: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Organization Email (Admin)</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    placeholder="hr@company.com" 
                    required
                    autoComplete="off"
                    value={signupData.orgEmail}
                    onChange={(e) => setSignupData({...signupData, orgEmail: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Offer Letter (Verification as HR)</label>
                  <div className="relative-container">
                    <input 
                      type="file" 
                      className="file-input-hidden"
                      title="Upload Offer Letter"
                      aria-label="Upload Offer Letter"
                      placeholder="Upload Offer Letter"
                      accept=".pdf"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          if (file.type.startsWith('image/')) {
                            alert('Images are not allowed. Please upload a PDF document.');
                            e.target.value = '';
                            return;
                          }
                          setSignupData({...signupData, offerLetter: file});
                        }
                      }}
                    />
                    <div className="form-input file-input-display">
                      <span className={`file-name-text ${signupData.offerLetter ? 'has-file' : 'no-file'}`}>
                        {signupData.offerLetter ? signupData.offerLetter.name : 'Upload Offer Letter (PDF/Img)'}
                      </span>
                      <span className="file-icon">📁</span>
                    </div>
                  </div>
                </div>


                <button className="modal-btn mt-20" type="submit" disabled={loading}>
                  {loading ? 'Submitting...' : 'Register as Admin →'}
                </button>
              </form>

              <div className="modal-switch mt-20">
                Already have an account? <a href="#" onClick={() => openModal('selectorModal')}>Login</a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
