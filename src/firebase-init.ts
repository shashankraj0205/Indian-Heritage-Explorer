import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  User,
} from 'firebase/auth';
import { auth } from './firebase';
import {
  getUserProfile,
  saveUserProfile,
  subscribeUserVisits,
  addHeritageVisit,
  updateHeritageVisit,
  deleteHeritageVisit,
  subscribeUserBookmarks,
  saveBookmarkToFirestore,
  removeBookmarkFromFirestore,
  HeritageVisit,
  HeritageBookmark,
  UserProfile,
} from './heritage-service';
import './nearby-stays-ui';

// State
let currentUser: User | null = null;
let currentProfile: UserProfile | null = null;
let userVisits: HeritageVisit[] = [];
let userBookmarks: HeritageBookmark[] = [];
let unsubscribeVisits: (() => void) | null = null;
let unsubscribeBookmarks: (() => void) | null = null;

// Available famous monuments for visit logging
const MONUMENTS_LIST = [
  { id: 'taj-mahal', name: 'Taj Mahal', state: 'Uttar Pradesh' },
  { id: 'hampi-ruins', name: 'Hampi Monuments', state: 'Karnataka' },
  { id: 'konark-sun-temple', name: 'Konark Sun Temple', state: 'Odisha' },
  { id: 'ajanta-caves', name: 'Ajanta & Ellora Caves', state: 'Maharashtra' },
  { id: 'meenakshi-temple', name: 'Meenakshi Amman Temple', state: 'Tamil Nadu' },
  { id: 'qutub-minar', name: 'Qutub Minar & Complex', state: 'Delhi' },
  { id: 'mehrangarh-fort', name: 'Mehrangarh Fort', state: 'Rajasthan' },
  { id: 'hawa-mahal', name: 'Hawa Mahal', state: 'Rajasthan' },
  { id: 'khajuraho-temples', name: 'Khajuraho Group of Monuments', state: 'Madhya Pradesh' },
  { id: 'brihadisvara-temple', name: 'Brihadisvara Temple (Thanjavur)', state: 'Tamil Nadu' },
  { id: 'golden-temple', name: 'Harmandir Sahib (Golden Temple)', state: 'Punjab' },
  { id: 'red-fort', name: 'Red Fort', state: 'Delhi' },
];

/**
 * Toast notification utility
 */
function showToast(title: string, message: string, icon = 'ℹ️') {
  const existing = document.getElementById('heritage-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'heritage-toast';
  toast.className = 'fixed bottom-6 left-6 z-[9999] flex items-center gap-3 bg-[#2E211D] text-white px-5 py-3.5 rounded-xl shadow-2xl border border-[#C9974A]/40 transition-all duration-300 animate-slide-up max-w-md';
  toast.innerHTML = `
    <span class="text-2xl">${icon}</span>
    <div class="flex-1">
      <h4 class="font-bold text-sm text-[#F7DFA8]">${title}</h4>
      <p class="text-xs text-[#E7E8D1] mt-0.5">${message}</p>
    </div>
    <button class="text-[#E7E8D1] hover:text-white ml-2 text-lg font-bold" onclick="this.parentElement.remove()">&times;</button>
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    if (toast.parentElement) toast.remove();
  }, 4500);
}

/**
 * Create and inject CSS styles for modals & auth components
 */
function injectStyles() {
  if (document.getElementById('firebase-auth-styles')) return;
  const style = document.createElement('style');
  style.id = 'firebase-auth-styles';
  style.textContent = `
    .auth-modal-backdrop, .journal-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(25, 16, 14, 0.65);
      backdrop-filter: blur(5px);
      z-index: 2000;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.25s ease;
      padding: 16px;
    }
    .auth-modal-backdrop.open, .journal-modal-backdrop.open {
      opacity: 1;
      pointer-events: auto;
    }
    .auth-dialog, .journal-dialog {
      background: #FFFFFF;
      border-radius: 16px;
      border: 1px solid #D6D7BE;
      box-shadow: 0 20px 45px rgba(0, 0, 0, 0.28);
      width: 100%;
      max-width: 480px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transform: translateY(16px) scale(0.97);
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .journal-dialog {
      max-width: 680px;
    }
    .auth-modal-backdrop.open .auth-dialog,
    .journal-modal-backdrop.open .journal-dialog {
      transform: translateY(0) scale(1);
    }
    .auth-header {
      background: linear-gradient(135deg, #5A2A22 0%, #431D17 100%);
      color: #FFFFFF;
      padding: 20px 24px;
      position: relative;
      border-bottom: 2px solid #C9974A;
    }
    .auth-tab-btn {
      padding: 8px 16px;
      font-size: 13.5px;
      font-weight: 600;
      border-bottom: 2px solid transparent;
      color: #7A6A5F;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .auth-tab-btn.active {
      color: #B85042;
      border-bottom-color: #B85042;
    }
    .auth-input {
      width: 100%;
      padding: 10px 14px;
      border-radius: 8px;
      border: 1px solid #D6D7BE;
      background: #FAFAF7;
      font-size: 14px;
      color: #2E211D;
      outline: none;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }
    .auth-input:focus {
      border-color: #B85042;
      background: #FFFFFF;
      box-shadow: 0 0 0 3px rgba(184, 80, 66, 0.15);
    }
    .auth-submit-btn {
      width: 100%;
      padding: 11px;
      border-radius: 24px;
      background: #B85042;
      color: #FFFFFF;
      font-weight: 600;
      font-size: 14px;
      border: none;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .auth-submit-btn:hover {
      background: #9E4336;
      transform: translateY(-1px);
    }
    .auth-google-btn {
      width: 100%;
      padding: 10px;
      border-radius: 24px;
      background: #FFFFFF;
      color: #2E211D;
      font-weight: 600;
      font-size: 13.5px;
      border: 1px solid #D6D7BE;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      transition: all 0.2s ease;
    }
    .auth-google-btn:hover {
      background: #F4F5E7;
      border-color: #C9974A;
    }
    .star-rating-btn {
      font-size: 24px;
      cursor: pointer;
      color: #D6D7BE;
      transition: color 0.15s ease, transform 0.15s ease;
    }
    .star-rating-btn.active {
      color: #C9974A;
    }
    .star-rating-btn:hover {
      transform: scale(1.15);
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-slide-up {
      animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Setup Nav Header Elements (Auth Button & My Visits Button)
 */
function setupHeaderNav() {
  const navLinks = document.querySelector('.site-header .nav-links');
  if (!navLinks) return;

  // 1. "My Visits" button
  let visitsBtn = document.getElementById('navVisitsBtn');
  if (!visitsBtn) {
    visitsBtn = document.createElement('button');
    visitsBtn.id = 'navVisitsBtn';
    visitsBtn.className = 'nav-btn';
    visitsBtn.setAttribute('aria-label', 'Open My Visited Heritage Journal');
    visitsBtn.innerHTML = `📖 My Visits <span id="navVisitsCount" class="bookmark-badge" style="display: none;">0</span>`;
    visitsBtn.addEventListener('click', () => {
      if (!currentUser) {
        openAuthModal('signin', 'Please sign in to view and record your heritage visits.');
        return;
      }
      openJournalModal();
    });

    const bookmarksBtn = document.getElementById('navBookmarksBtn');
    if (bookmarksBtn && bookmarksBtn.nextSibling) {
      navLinks.insertBefore(visitsBtn, bookmarksBtn.nextSibling);
    } else {
      navLinks.appendChild(visitsBtn);
    }
  }

  // 2. Auth / Profile button
  let authBtn = document.getElementById('navAuthBtn');
  if (!authBtn) {
    authBtn = document.createElement('button');
    authBtn.id = 'navAuthBtn';
    authBtn.className = 'nav-btn';
    authBtn.style.backgroundColor = '#5A2A22';
    authBtn.style.color = '#FFFFFF';
    authBtn.style.border = '1px solid #C9974A';
    authBtn.innerHTML = `🔐 Login`;
    authBtn.addEventListener('click', () => {
      if (currentUser) {
        openProfileModal();
      } else {
        openAuthModal('signin');
      }
    });
    navLinks.appendChild(authBtn);
  }
}

/**
 * Update UI when Auth state changes
 */
function updateAuthUI() {
  const authBtn = document.getElementById('navAuthBtn');
  const visitsCountBadge = document.getElementById('navVisitsCount');

  if (currentUser) {
    const name = currentUser.displayName || currentUser.email?.split('@')[0] || 'Explorer';
    const initial = name.charAt(0).toUpperCase();

    if (authBtn) {
      authBtn.style.backgroundColor = '#FFFFFF';
      authBtn.style.color = '#5A2A22';
      authBtn.innerHTML = `
        <span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:#B85042;color:#fff;font-size:11px;font-weight:700;">${initial}</span>
        <span style="max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${name}</span>
      `;
    }

    if (visitsCountBadge) {
      visitsCountBadge.textContent = String(userVisits.length);
      visitsCountBadge.style.display = userVisits.length > 0 ? 'inline-flex' : 'none';
    }
  } else {
    if (authBtn) {
      authBtn.style.backgroundColor = '#5A2A22';
      authBtn.style.color = '#FFFFFF';
      authBtn.innerHTML = `🔐 Login`;
    }
    if (visitsCountBadge) {
      visitsCountBadge.style.display = 'none';
    }
  }
}

// ==========================================
// AUTH MODAL IMPLEMENTATION
// ==========================================

function createAuthModal() {
  if (document.getElementById('authModalBackdrop')) return;

  const backdrop = document.createElement('div');
  backdrop.id = 'authModalBackdrop';
  backdrop.className = 'auth-modal-backdrop';
  backdrop.innerHTML = `
    <div class="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="authDialogTitle">
      <div class="auth-header">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:24px;">🏛️</span>
            <div>
              <h3 id="authDialogTitle" style="font-family:'Playfair Display',serif;font-size:18px;font-weight:700;line-height:1.2;">Heritage Explorer Portal</h3>
              <p style="font-size:11.5px;color:#F7DFA8;margin-top:2px;">Save visits & sync your cultural bucket list with Firebase</p>
            </div>
          </div>
          <button id="authModalClose" style="color:#FFF;background:rgba(255,255,255,0.15);width:30px;height:30px;border-radius:50%;font-size:16px;display:flex;align-items:center;justify-content:center;cursor:pointer;">&times;</button>
        </div>
      </div>

      <div style="display:flex;border-bottom:1px solid #D6D7BE;background:#FAF8F5;">
        <button id="authTabSignIn" class="auth-tab-btn active" style="flex:1;">Sign In with Email</button>
        <button id="authTabSignUp" class="auth-tab-btn" style="flex:1;">Create Account</button>
      </div>

      <div style="padding:22px 24px;overflow-y:auto;flex:1;">
        <!-- Notification / Notice banner -->
        <div id="authNotice" style="display:none;padding:10px 14px;border-radius:8px;font-size:12.5px;margin-bottom:16px;"></div>

        <!-- SIGN IN FORM -->
        <form id="signInForm" style="display:flex;flex-direction:column;gap:14px;">
          <div>
            <label style="display:block;font-size:12px;font-weight:600;color:#5A2A22;margin-bottom:5px;">Email Address</label>
            <input type="email" id="signInEmail" class="auth-input" placeholder="explorer@heritage.in" required autocomplete="email" />
          </div>
          <div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
              <label style="font-size:12px;font-weight:600;color:#5A2A22;">Password</label>
              <button type="button" id="authForgotPassword" style="font-size:11.5px;color:#B85042;cursor:pointer;text-decoration:underline;">Forgot password?</button>
            </div>
            <input type="password" id="signInPassword" class="auth-input" placeholder="••••••••" required autocomplete="current-password" />
          </div>
          <button type="submit" id="signInSubmit" class="auth-submit-btn">
            <span>Sign In</span>
          </button>
        </form>

        <!-- SIGN UP FORM -->
        <form id="signUpForm" style="display:none;flex-direction:column;gap:14px;">
          <div>
            <label style="display:block;font-size:12px;font-weight:600;color:#5A2A22;margin-bottom:5px;">Full Name / Explorer Moniker</label>
            <input type="text" id="signUpName" class="auth-input" placeholder="e.g. Vikramaditya" required />
          </div>
          <div>
            <label style="display:block;font-size:12px;font-weight:600;color:#5A2A22;margin-bottom:5px;">Email Address</label>
            <input type="email" id="signUpEmail" class="auth-input" placeholder="explorer@heritage.in" required autocomplete="email" />
          </div>
          <div>
            <label style="display:block;font-size:12px;font-weight:600;color:#5A2A22;margin-bottom:5px;">Password (min. 6 characters)</label>
            <input type="password" id="signUpPassword" class="auth-input" placeholder="••••••••" minlength="6" required autocomplete="new-password" />
          </div>
          <div>
            <label style="display:block;font-size:12px;font-weight:600;color:#5A2A22;margin-bottom:5px;">Heritage Interests (Optional)</label>
            <input type="text" id="signUpBio" class="auth-input" placeholder="e.g. Chola Bronzes, Mughal Architecture, Hampi ruins" />
          </div>
          <button type="submit" id="signUpSubmit" class="auth-submit-btn">
            <span>Create Explorer Account</span>
          </button>
        </form>

        <!-- DIVIDER -->
        <div style="display:flex;align-items:center;margin:18px 0;gap:12px;">
          <div style="flex:1;height:1px;background:#D6D7BE;"></div>
          <span style="font-size:11.5px;color:#7A6A5F;text-transform:uppercase;letter-spacing:0.5px;">Or</span>
          <div style="flex:1;height:1px;background:#D6D7BE;"></div>
        </div>

        <!-- GOOGLE SIGN IN BUTTON -->
        <button type="button" id="googleSignInBtn" class="auth-google-btn">
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          <span>Continue with Google</span>
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);

  // Close actions
  backdrop.querySelector('#authModalClose')?.addEventListener('click', closeAuthModal);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeAuthModal();
  });

  // Tab switching
  const tabSignIn = backdrop.querySelector('#authTabSignIn') as HTMLButtonElement;
  const tabSignUp = backdrop.querySelector('#authTabSignUp') as HTMLButtonElement;
  const signInForm = backdrop.querySelector('#signInForm') as HTMLFormElement;
  const signUpForm = backdrop.querySelector('#signUpForm') as HTMLFormElement;

  tabSignIn.addEventListener('click', () => {
    tabSignIn.classList.add('active');
    tabSignUp.classList.remove('active');
    signInForm.style.display = 'flex';
    signUpForm.style.display = 'none';
    clearAuthNotice();
  });

  tabSignUp.addEventListener('click', () => {
    tabSignUp.classList.add('active');
    tabSignIn.classList.remove('active');
    signInForm.style.display = 'none';
    signUpForm.style.display = 'flex';
    clearAuthNotice();
  });

  // Forgot password
  backdrop.querySelector('#authForgotPassword')?.addEventListener('click', async () => {
    const email = (backdrop.querySelector('#signInEmail') as HTMLInputElement).value.trim();
    if (!email) {
      setAuthNotice('Please enter your email address first, then click "Forgot password?".', 'error');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setAuthNotice(`Password reset link sent to ${email}. Please check your inbox.`, 'success');
    } catch (err: any) {
      setAuthNotice(formatAuthError(err), 'error');
    }
  });

  // Form Submissions: Sign In
  signInForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = (backdrop.querySelector('#signInEmail') as HTMLInputElement).value.trim();
    const password = (backdrop.querySelector('#signInPassword') as HTMLInputElement).value;
    const submitBtn = backdrop.querySelector('#signInSubmit') as HTMLButtonElement;

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>Signing in...</span>`;

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      showToast('Welcome Back!', `Signed in as ${cred.user.email}`, '👋');
      closeAuthModal();
    } catch (err: any) {
      setAuthNotice(formatAuthError(err), 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span>Sign In</span>`;
    }
  });

  // Form Submissions: Sign Up
  signUpForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = (backdrop.querySelector('#signUpName') as HTMLInputElement).value.trim();
    const email = (backdrop.querySelector('#signUpEmail') as HTMLInputElement).value.trim();
    const password = (backdrop.querySelector('#signUpPassword') as HTMLInputElement).value;
    const bio = (backdrop.querySelector('#signUpBio') as HTMLInputElement).value.trim();
    const submitBtn = backdrop.querySelector('#signUpSubmit') as HTMLButtonElement;

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span>Creating Account...</span>`;

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      // Update Auth Profile
      await updateProfile(cred.user, { displayName: name });

      // Save to Firestore users collection
      const profile: UserProfile = {
        id: cred.user.uid,
        email: cred.user.email || email,
        displayName: name,
        bio: bio || 'Indian Heritage Explorer',
        role: 'explorer',
        createdAt: new Date().toISOString(),
      };
      await saveUserProfile(profile);

      // Send verification email
      try {
        await sendEmailVerification(cred.user);
      } catch (e) {
        // Verification email send is non-blocking
      }

      showToast('Explorer Profile Created!', `Welcome to India Heritage Explorer, ${name}!`, '🎉');
      closeAuthModal();
    } catch (err: any) {
      setAuthNotice(formatAuthError(err), 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span>Create Explorer Account</span>`;
    }
  });

  // Google Sign In
  backdrop.querySelector('#googleSignInBtn')?.addEventListener('click', async () => {
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);

      // Check / save profile in Firestore
      const existing = await getUserProfile(cred.user.uid);
      if (!existing) {
        await saveUserProfile({
          id: cred.user.uid,
          email: cred.user.email || '',
          displayName: cred.user.displayName || 'Explorer',
          bio: 'Indian Heritage Explorer',
          role: 'explorer',
          createdAt: new Date().toISOString(),
        });
      }

      showToast('Google Sign-In Successful', `Welcome, ${cred.user.displayName || cred.user.email}!`, '🌟');
      closeAuthModal();
    } catch (err: any) {
      setAuthNotice(formatAuthError(err), 'error');
    }
  });
}

function openAuthModal(mode: 'signin' | 'signup' = 'signin', notice?: string) {
  createAuthModal();
  const backdrop = document.getElementById('authModalBackdrop');
  if (!backdrop) return;

  const tabSignIn = backdrop.querySelector('#authTabSignIn') as HTMLButtonElement;
  const tabSignUp = backdrop.querySelector('#authTabSignUp') as HTMLButtonElement;
  const signInForm = backdrop.querySelector('#signInForm') as HTMLFormElement;
  const signUpForm = backdrop.querySelector('#signUpForm') as HTMLFormElement;

  if (mode === 'signup') {
    tabSignUp.click();
  } else {
    tabSignIn.click();
  }

  if (notice) {
    setAuthNotice(notice, 'info');
  } else {
    clearAuthNotice();
  }

  backdrop.classList.add('open');
}

function closeAuthModal() {
  const backdrop = document.getElementById('authModalBackdrop');
  if (backdrop) backdrop.classList.remove('open');
}

function setAuthNotice(msg: string, type: 'error' | 'success' | 'info') {
  const notice = document.getElementById('authNotice');
  if (!notice) return;
  notice.style.display = 'block';
  if (type === 'error') {
    notice.style.background = '#FDE8E8';
    notice.style.color = '#9B1C1C';
    notice.style.border = '1px solid #F8B4B4';
  } else if (type === 'success') {
    notice.style.background = '#DEF7EC';
    notice.style.color = '#03543F';
    notice.style.border = '1px solid #84E1BC';
  } else {
    notice.style.background = '#FEF08A';
    notice.style.color = '#713F12';
    notice.style.border = '1px solid #FDE047';
  }
  notice.textContent = msg;
}

function clearAuthNotice() {
  const notice = document.getElementById('authNotice');
  if (notice) {
    notice.style.display = 'none';
    notice.textContent = '';
  }
}

function formatAuthError(err: any): string {
  const code = err?.code || '';
  switch (code) {
    case 'auth/user-not-found':
      return 'No account found with this email. Please check or click "Create Account".';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password. Please verify and try again.';
    case 'auth/email-already-in-use':
      return 'An account already exists with this email. Try signing in instead.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters long.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/operation-not-allowed':
      return 'Email/Password authentication needs to be enabled in Firebase Console. You can also sign in using Google.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in popup was closed before completion.';
    default:
      return err?.message || 'Authentication error. Please try again.';
  }
}

// ==========================================
// USER PROFILE MODAL
// ==========================================

function openProfileModal() {
  if (!currentUser) return;
  const existing = document.getElementById('profileModalBackdrop');
  if (existing) existing.remove();

  const name = currentUser.displayName || currentUser.email?.split('@')[0] || 'Explorer';
  const email = currentUser.email || '';
  const initial = name.charAt(0).toUpperCase();

  const modal = document.createElement('div');
  modal.id = 'profileModalBackdrop';
  modal.className = 'auth-modal-backdrop open';
  modal.innerHTML = `
    <div class="auth-dialog" role="dialog" aria-modal="true" style="max-width:440px;">
      <div class="auth-header">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <h3 style="font-family:'Playfair Display',serif;font-size:18px;font-weight:700;">Explorer Profile</h3>
          <button id="profileModalClose" style="color:#FFF;background:rgba(255,255,255,0.15);width:30px;height:30px;border-radius:50%;font-size:16px;cursor:pointer;">&times;</button>
        </div>
      </div>
      <div style="padding:24px;display:flex;flex-direction:column;gap:18px;">
        <div style="display:flex;align-items:center;gap:16px;">
          <div style="width:58px;height:58px;border-radius:50%;background:#B85042;color:#FFF;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;border:3px solid #C9974A;">
            ${initial}
          </div>
          <div>
            <h4 style="font-size:17px;font-weight:700;color:#2E211D;">${name}</h4>
            <p style="font-size:13px;color:#7A6A5F;">${email}</p>
            <span style="display:inline-block;margin-top:4px;padding:2px 8px;border-radius:12px;background:#F4F5E7;color:#5A2A22;font-size:11px;font-weight:600;border:1px solid #D6D7BE;">
              ${currentProfile?.role === 'admin' ? '🛡️ Heritage Curator (Admin)' : '🧭 Registered Explorer'}
            </span>
          </div>
        </div>

        ${!currentUser.emailVerified ? `
          <div style="padding:10px 14px;background:#FEF3C7;border:1px solid #FCD34D;border-radius:8px;font-size:12px;color:#92400E;display:flex;align-items:center;justify-content:space-between;">
            <span>⚠️ Email not verified yet.</span>
            <button id="btnResendVerification" style="color:#B85042;font-weight:600;cursor:pointer;text-decoration:underline;">Send Link</button>
          </div>
        ` : ''}

        <!-- Stats Grid -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div style="background:#FAF8F5;border:1px solid #D6D7BE;padding:12px;border-radius:10px;text-align:center;">
            <span style="font-size:20px;font-weight:700;color:#B85042;display:block;">${userVisits.length}</span>
            <span style="font-size:11px;color:#7A6A5F;text-transform:uppercase;font-weight:600;">Monuments Visited</span>
          </div>
          <div style="background:#FAF8F5;border:1px solid #D6D7BE;padding:12px;border-radius:10px;text-align:center;">
            <span style="font-size:20px;font-weight:700;color:#C9974A;display:block;">${userBookmarks.length}</span>
            <span style="font-size:11px;color:#7A6A5F;text-transform:uppercase;font-weight:600;">Saved Bookmarks</span>
          </div>
        </div>

        <button id="btnOpenJournalFromProfile" class="auth-submit-btn" style="background:#5A2A22;">
          <span>📖 Open My Visited Journal</span>
        </button>

        <button id="btnSignOut" style="padding:10px;border-radius:24px;border:1px solid #D6D7BE;background:#FFF;color:#B85042;font-weight:600;cursor:pointer;transition:all 0.2s ease;">
          Sign Out
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector('#profileModalClose')?.addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });

  modal.querySelector('#btnResendVerification')?.addEventListener('click', async () => {
    if (currentUser) {
      await sendEmailVerification(currentUser);
      showToast('Verification Email Sent', `Verification link sent to ${currentUser.email}`, '📧');
    }
  });

  modal.querySelector('#btnOpenJournalFromProfile')?.addEventListener('click', () => {
    modal.remove();
    openJournalModal();
  });

  modal.querySelector('#btnSignOut')?.addEventListener('click', async () => {
    await signOut(auth);
    modal.remove();
    showToast('Signed Out', 'You have been signed out successfully.', '👋');
  });
}

// ==========================================
// MY VISITED HERITAGE JOURNAL MODAL (BACKEND EXAMPLE)
// ==========================================

function openJournalModal(preselectedMonumentId?: string) {
  if (!currentUser) {
    openAuthModal('signin', 'Please sign in to view and record your heritage visits.');
    return;
  }

  const existing = document.getElementById('journalModalBackdrop');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'journalModalBackdrop';
  modal.className = 'journal-modal-backdrop open';
  modal.innerHTML = `
    <div class="journal-dialog" role="dialog" aria-modal="true">
      <div class="auth-header">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:26px;">📖</span>
            <div>
              <h3 style="font-family:'Playfair Display',serif;font-size:20px;font-weight:700;">My Heritage Journal</h3>
              <p style="font-size:12px;color:#F7DFA8;">Logged in Firestore database • ${currentUser.displayName || currentUser.email}</p>
            </div>
          </div>
          <button id="journalModalClose" style="color:#FFF;background:rgba(255,255,255,0.15);width:32px;height:32px;border-radius:50%;font-size:18px;display:flex;align-items:center;justify-content:center;cursor:pointer;">&times;</button>
        </div>
      </div>

      <div style="padding:20px 24px;overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:20px;">
        <!-- LOG NEW VISIT SECTION -->
        <div style="background:#FAF8F5;border:1px solid #D6D7BE;border-radius:12px;padding:16px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
            <h4 style="font-family:'Playfair Display',serif;font-size:16px;font-weight:700;color:#5A2A22;display:flex;align-items:center;gap:6px;">
              <span>✍️</span> Log a Heritage Monument Visit
            </h4>
            <span style="font-size:11px;color:#7A6A5F;background:#FFF;padding:2px 8px;border-radius:10px;border:1px solid #D6D7BE;">Backend: Firestore</span>
          </div>

          <form id="newVisitForm" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div style="grid-column:1 / -1;">
              <label style="display:block;font-size:12px;font-weight:600;color:#5A2A22;margin-bottom:4px;">Monument / Heritage Site</label>
              <select id="visitMonumentSelect" class="auth-input" required>
                <option value="">-- Select a monument --</option>
                ${MONUMENTS_LIST.map((m) => `<option value="${m.id}" ${preselectedMonumentId === m.id ? 'selected' : ''}>${m.name} (${m.state})</option>`).join('')}
              </select>
            </div>

            <div>
              <label style="display:block;font-size:12px;font-weight:600;color:#5A2A22;margin-bottom:4px;">Date of Visit</label>
              <input type="date" id="visitDateInput" class="auth-input" required value="${new Date().toISOString().split('T')[0]}" />
            </div>

            <div>
              <label style="display:block;font-size:12px;font-weight:600;color:#5A2A22;margin-bottom:4px;">Rating (1 to 5 Stars)</label>
              <div id="starRatingContainer" style="display:flex;gap:4px;align-items:center;height:42px;">
                <button type="button" class="star-rating-btn active" data-rating="1">★</button>
                <button type="button" class="star-rating-btn active" data-rating="2">★</button>
                <button type="button" class="star-rating-btn active" data-rating="3">★</button>
                <button type="button" class="star-rating-btn active" data-rating="4">★</button>
                <button type="button" class="star-rating-btn active" data-rating="5">★</button>
                <input type="hidden" id="visitRatingValue" value="5" />
              </div>
            </div>

            <div style="grid-column:1 / -1;">
              <label style="display:block;font-size:12px;font-weight:600;color:#5A2A22;margin-bottom:4px;">Personal Memories & Architectural Notes</label>
              <textarea id="visitNotesInput" class="auth-input" rows="2" placeholder="e.g. Visited at sunrise, breathtaking marble inlays and acoustics inside the dome..."></textarea>
            </div>

            <div style="grid-column:1 / -1;display:flex;justify-content:flex-end;">
              <button type="submit" id="saveVisitBtn" class="auth-submit-btn" style="width:auto;padding:8px 24px;">
                <span>💾 Save Visit to Firebase</span>
              </button>
            </div>
          </form>
        </div>

        <!-- LOGGED VISITS LIST -->
        <div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
            <h4 style="font-family:'Playfair Display',serif;font-size:16px;font-weight:700;color:#5A2A22;">
              Visited Monuments (${userVisits.length})
            </h4>
            <span style="font-size:12px;color:#7A6A5F;">Real-time sync via Firestore onSnapshot</span>
          </div>

          <div id="journalVisitsList" style="display:flex;flex-direction:column;gap:12px;">
            <!-- Populated dynamically -->
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Close handlers
  modal.querySelector('#journalModalClose')?.addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });

  // Star rating selector
  const starButtons = modal.querySelectorAll('.star-rating-btn');
  const ratingInput = modal.querySelector('#visitRatingValue') as HTMLInputElement;

  starButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const r = parseInt(btn.getAttribute('data-rating') || '5', 10);
      ratingInput.value = String(r);
      starButtons.forEach((b) => {
        const br = parseInt(b.getAttribute('data-rating') || '0', 10);
        if (br <= r) {
          b.classList.add('active');
        } else {
          b.classList.remove('active');
        }
      });
    });
  });

  // Form submission
  const visitForm = modal.querySelector('#newVisitForm') as HTMLFormElement;
  visitForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    const monumentSelect = modal.querySelector('#visitMonumentSelect') as HTMLSelectElement;
    const monumentId = monumentSelect.value;
    const selectedOpt = monumentSelect.selectedOptions[0];
    const monumentName = selectedOpt ? selectedOpt.text.split(' (')[0] : 'Monument';
    const stateMatch = selectedOpt?.text.match(/\((.*?)\)/);
    const state = stateMatch ? stateMatch[1] : 'India';

    const visitDate = (modal.querySelector('#visitDateInput') as HTMLInputElement).value;
    const rating = parseInt(ratingInput.value, 10) || 5;
    const notes = (modal.querySelector('#visitNotesInput') as HTMLTextAreaElement).value.trim();

    const saveBtn = modal.querySelector('#saveVisitBtn') as HTMLButtonElement;
    saveBtn.disabled = true;
    saveBtn.innerHTML = `<span>Saving...</span>`;

    try {
      await addHeritageVisit({
        userId: currentUser.uid,
        userEmail: currentUser.email || '',
        userName: currentUser.displayName || 'Explorer',
        monumentId,
        monumentName,
        state,
        visitDate,
        rating,
        notes,
      });

      showToast('Visit Logged to Firebase!', `Saved ${monumentName} to your journal.`, '🏰');
      (modal.querySelector('#visitNotesInput') as HTMLTextAreaElement).value = '';
    } catch (err: any) {
      showToast('Error Saving Visit', err?.message || 'Check firestore permissions', '⚠️');
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = `<span>💾 Save Visit to Firebase</span>`;
    }
  });

  renderJournalVisitsList(modal);
}

function renderJournalVisitsList(container: HTMLElement) {
  const list = container.querySelector('#journalVisitsList');
  if (!list) return;

  if (userVisits.length === 0) {
    list.innerHTML = `
      <div style="text-align:center;padding:32px 16px;background:#FAF8F5;border:1px dashed #D6D7BE;border-radius:12px;">
        <span style="font-size:36px;display:block;margin-bottom:8px;">📍</span>
        <h5 style="font-size:15px;font-weight:700;color:#5A2A22;">No visits recorded yet</h5>
        <p style="font-size:12.5px;color:#7A6A5F;max-width:320px;margin:4px auto 0;">Use the form above to log your first Indian heritage site visit into Firebase Firestore!</p>
      </div>
    `;
    return;
  }

  list.innerHTML = userVisits
    .map((v) => {
      const stars = '★'.repeat(v.rating) + '☆'.repeat(5 - v.rating);
      return `
        <div style="background:#FFF;border:1px solid #D6D7BE;border-radius:10px;padding:14px;box-shadow:0 2px 6px rgba(0,0,0,0.04);display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
          <div style="flex:1;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
              <h5 style="font-family:'Playfair Display',serif;font-size:15px;font-weight:700;color:#5A2A22;">${v.monumentName}</h5>
              ${v.state ? `<span style="font-size:11px;background:#F4F5E7;color:#5A2A22;padding:2px 8px;border-radius:10px;border:1px solid #D6D7BE;">${v.state}</span>` : ''}
            </div>
            <div style="display:flex;align-items:center;gap:10px;font-size:12px;color:#7A6A5F;margin-bottom:6px;">
              <span style="color:#C9974A;font-size:13px;letter-spacing:1px;">${stars}</span>
              <span>📅 ${v.visitDate}</span>
            </div>
            ${v.notes ? `<p style="font-size:13px;color:#4A3D36;line-height:1.45;background:#FAF8F5;padding:8px 12px;border-radius:6px;margin-top:4px;">"${v.notes}"</p>` : ''}
          </div>
          <button class="btn-delete-visit" data-visit-id="${v.id}" style="color:#B85042;background:rgba(184,80,66,0.08);border:none;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:14px;" title="Delete visit record">&times;</button>
        </div>
      `;
    })
    .join('');

  // Wire delete buttons
  list.querySelectorAll('.btn-delete-visit').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-visit-id');
      if (!id) return;
      if (confirm('Are you sure you want to remove this visit record from Firestore?')) {
        try {
          await deleteHeritageVisit(id);
          showToast('Visit Record Deleted', 'Entry removed from Firestore', '🗑️');
        } catch (e: any) {
          showToast('Delete Failed', e?.message || 'Error deleting', '⚠️');
        }
      }
    });
  });
}

// ==========================================
// REAL-TIME FIRESTORE SUBSCRIPTIONS
// ==========================================

function handleAuthState(user: User | null) {
  currentUser = user;

  // Clean previous subscriptions
  if (unsubscribeVisits) {
    unsubscribeVisits();
    unsubscribeVisits = null;
  }
  if (unsubscribeBookmarks) {
    unsubscribeBookmarks();
    unsubscribeBookmarks = null;
  }

  if (user) {
    // 1. Load user profile
    getUserProfile(user.uid)
      .then((p) => {
        currentProfile = p;
        updateAuthUI();
      })
      .catch((e) => console.warn('Could not fetch user profile:', e));

    // 2. Subscribe to user visits (Real-time Backend Example)
    unsubscribeVisits = subscribeUserVisits(
      user.uid,
      (visits) => {
        userVisits = visits;
        updateAuthUI();
        const journalModal = document.getElementById('journalModalBackdrop');
        if (journalModal) renderJournalVisitsList(journalModal);
      },
      (err) => console.error('Visits listener error:', err)
    );

    // 3. Subscribe to user bookmarks in Firestore (Real-time Sync)
    unsubscribeBookmarks = subscribeUserBookmarks(
      user.uid,
      (bookmarks) => {
        userBookmarks = bookmarks;
        updateAuthUI();
        syncBookmarksWithApp(bookmarks);
      },
      (err) => console.error('Bookmarks listener error:', err)
    );
  } else {
    currentProfile = null;
    userVisits = [];
    userBookmarks = [];
    updateAuthUI();
  }
}

/**
 * Sync Firestore bookmarks with the index.html vanilla JS bookmarks state
 */
function syncBookmarksWithApp(bookmarks: HeritageBookmark[]) {
  const bookmarkIds = bookmarks.map((b) => b.monumentId);

  // If window.bookmarkedIds exists from index.html
  if ((window as any).bookmarkedIds) {
    bookmarkIds.forEach((id) => (window as any).bookmarkedIds.add(id));
  }

  // Update badge count
  const badge = document.getElementById('navBookmarkCount');
  if (badge) {
    badge.textContent = String(bookmarks.length);
    badge.style.display = bookmarks.length > 0 ? 'inline-flex' : 'none';
  }
}

/**
 * Hook into detail panel and card bookmark clicks to save to Firestore
 */
function hookDetailPanelLogVisit() {
  // Check periodically for detail panel opened to inject "+ Log Visit" button
  setInterval(() => {
    const detailPanel = document.getElementById('detailPanel');
    if (detailPanel && detailPanel.classList.contains('open')) {
      const panelActions = detailPanel.querySelector('.panel-actions');
      if (panelActions && !panelActions.querySelector('#btnPanelLogVisit')) {
        const logBtn = document.createElement('button');
        logBtn.id = 'btnPanelLogVisit';
        logBtn.className = 'btn-action-panel';
        logBtn.style.backgroundColor = '#5A2A22';
        logBtn.style.color = '#FFFFFF';
        logBtn.style.border = '1px solid #C9974A';
        logBtn.style.display = 'inline-flex';
        logBtn.style.alignItems = 'center';
        logBtn.style.gap = '6px';
        logBtn.style.padding = '8px 16px';
        logBtn.style.borderRadius = '20px';
        logBtn.style.fontSize = '13px';
        logBtn.style.fontWeight = '600';
        logBtn.style.cursor = 'pointer';
        logBtn.innerHTML = `<span>✍️</span><span>Log My Visit</span>`;

        logBtn.addEventListener('click', () => {
          const currentSite = (window as any).currentActiveSite;
          const siteId = currentSite?.id || '';
          openJournalModal(siteId);
        });

        panelActions.appendChild(logBtn);
      }
    }
  }, 400);
}

// Expose openJournalModal to window for global access
(window as any).openJournalModal = openJournalModal;
(window as any).openAuthModal = openAuthModal;

// ==========================================
// INITIALIZATION
// ==========================================

function init() {
  injectStyles();
  setupHeaderNav();
  hookDetailPanelLogVisit();

  // Listen to auth state changes
  onAuthStateChanged(auth, (user) => {
    handleAuthState(user);
  });
}

// Run when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
