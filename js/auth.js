let isSignUpMode = false;
let authSubmitting = false;
let lastSignUpEmail = '';
let pendingVerification = false;

const $authTabSignIn = document.getElementById('authTabSignIn');
const $authTabSignUp = document.getElementById('authTabSignUp');
const $authFormSignIn = document.getElementById('authFormSignIn');
const $authFormSignUp = document.getElementById('authFormSignUp');
const $authIndicator = document.getElementById('authTabIndicator');
const $authSubmitBtn = document.getElementById('authSubmitBtn');
const $authSubmitText = document.getElementById('authSubmitText');
const $authSubmitLoader = document.getElementById('authSubmitLoader');
const $authError = document.getElementById('authError');
const $authForm = document.getElementById('authForm');
const $signupSuccessCard = document.getElementById('signupSuccessCard');
const $emailVerifiedCard = document.getElementById('emailVerifiedCard');
const $unverifiedCard = document.getElementById('unverifiedCard');
const $signupEmailDisplay = document.getElementById('signupEmailDisplay');
const $resendSignupBtn = document.getElementById('resendSignupBtn');
const $resendSignupText = document.getElementById('resendSignupText');
const $resendUnverifiedBtn = document.getElementById('resendUnverifiedBtn');
const $resendUnverifiedText = document.getElementById('resendUnverifiedText');
const $backToLoginBtn = document.getElementById('backToLoginBtn');
const $continueToLoginBtn = document.getElementById('continueToLoginBtn');
const $backToSignInBtn = document.getElementById('backToSignInBtn');

function switchAuthTab(mode) {
  isSignUpMode = mode;
  hideStatusCards();
  if ($authTabSignIn) {
    $authTabSignIn.classList.toggle('text-white', !mode);
    $authTabSignIn.classList.toggle('text-zinc-500', mode);
  }
  if ($authTabSignUp) {
    $authTabSignUp.classList.toggle('text-white', mode);
    $authTabSignUp.classList.toggle('text-zinc-500', !mode);
  }
  if ($authFormSignIn) $authFormSignIn.classList.toggle('hidden', mode);
  if ($authFormSignUp) $authFormSignUp.classList.toggle('hidden', !mode);
  if ($authIndicator) $authIndicator.style.transform = mode ? 'translateX(100%)' : 'translateX(0)';
  if ($authSubmitText) $authSubmitText.textContent = mode ? 'Create Account' : 'Sign In';
  clearAuthError();
  showAuthFormPart(true);
}

function showAuthFormPart(show) {
  if (!$authForm) return;
  if (show) {
    $authForm.classList.remove('hidden');
    $authForm.classList.remove('animate-fadeOut');
    $authForm.classList.add('animate-fadeIn');
  } else {
    $authForm.classList.add('hidden');
  }
}

function hideStatusCards() {
  if ($signupSuccessCard) {
    $signupSuccessCard.classList.add('hidden');
    $signupSuccessCard.classList.remove('animate-scaleIn');
  }
  if ($emailVerifiedCard) {
    $emailVerifiedCard.classList.add('hidden');
    $emailVerifiedCard.classList.remove('animate-scaleIn');
  }
  if ($unverifiedCard) {
    $unverifiedCard.classList.add('hidden');
  }
}

function showSignupSuccessCard(email) {
  lastSignUpEmail = email;
  if ($signupEmailDisplay) $signupEmailDisplay.textContent = email;
  showAuthFormPart(false);
  if ($signupSuccessCard) {
    $signupSuccessCard.classList.remove('hidden');
    void $signupSuccessCard.offsetWidth;
    $signupSuccessCard.classList.add('animate-scaleIn');
  }
  hideAuthTabs();
}

function showEmailVerifiedCard() {
  showAuthFormPart(false);
  if ($emailVerifiedCard) {
    $emailVerifiedCard.classList.remove('hidden');
    void $emailVerifiedCard.offsetWidth;
    $emailVerifiedCard.classList.add('animate-scaleIn');
  }
  hideAuthTabs();
}

function showUnverifiedCard() {
  if ($unverifiedCard) {
    $unverifiedCard.classList.remove('hidden');
    $authError.classList.add('hidden', 'opacity-0');
  }
}

function hideUnverifiedCard() {
  if ($unverifiedCard) {
    $unverifiedCard.classList.add('hidden');
  }
}

function hideAuthTabs() {
  var tabBar = document.querySelector('.relative.flex.bg-black\\/20.rounded-xl.p-1.mb-6');
  if (tabBar) tabBar.style.display = 'none';
}

function showAuthTabs() {
  var tabBar = document.querySelector('.relative.flex.bg-black\\/20.rounded-xl.p-1.mb-6');
  if (tabBar) tabBar.style.display = 'flex';
}

if ($authTabSignIn) $authTabSignIn.addEventListener('click', function () {
  hideUnverifiedCard();
  switchAuthTab(false);
});
if ($authTabSignUp) $authTabSignUp.addEventListener('click', function () { switchAuthTab(true); });

if ($backToLoginBtn) $backToLoginBtn.addEventListener('click', function () {
  switchAuthTab(false);
  showAuthTabs();
  var emailInput = document.getElementById('authEmail');
  if (emailInput && lastSignUpEmail) emailInput.value = lastSignUpEmail;
});

if ($continueToLoginBtn) $continueToLoginBtn.addEventListener('click', function () {
  switchAuthTab(false);
  showAuthTabs();
  var emailInput = document.getElementById('authEmail');
  if (emailInput && lastSignUpEmail) emailInput.value = lastSignUpEmail;
});

if ($backToSignInBtn) $backToSignInBtn.addEventListener('click', function () {
  hideUnverifiedCard();
  clearAuthError();
});

function showAuthError(msg) {
  if (!$authError) return;
  $authError.textContent = msg;
  $authError.classList.remove('hidden', 'opacity-0');
  $authError.classList.add('opacity-100');
}

function clearAuthError() {
  if (!$authError) return;
  $authError.textContent = '';
  $authError.classList.add('hidden', 'opacity-0');
  $authError.classList.remove('opacity-100');
}

function setAuthLoading(loading) {
  authSubmitting = loading;
  if ($authSubmitBtn) $authSubmitBtn.disabled = loading;
  if ($authSubmitLoader) $authSubmitLoader.classList.toggle('hidden', !loading);
  if ($authSubmitText) $authSubmitText.classList.toggle('hidden', loading);
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password) {
  return password.length >= 6;
}

async function handleSignIn(email, password) {
  const { data, error } = await window.supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function handleSignUp(fullName, orgName, email, password) {
  const { data, error } = await window.supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        organization_name: orgName
      }
    }
  });
  if (error) throw error;
  return data;
}

function startResendCooldown(btnEl, textEl, seconds) {
  if (!btnEl) return;
  btnEl.disabled = true;
  var countdown = seconds;
  var updateText = function () {
    if (textEl) textEl.textContent = 'Resend (' + countdown + 's)';
  };
  updateText();
  var timer = setInterval(function () {
    countdown--;
    if (countdown <= 0) {
      clearInterval(timer);
      btnEl.disabled = false;
      if (textEl) textEl.textContent = 'Resend Verification Email';
    } else {
      if (textEl) textEl.textContent = 'Resend (' + countdown + 's)';
    }
  }, 1000);
}

async function resendVerificationEmail(email) {
  try {
    var response = await fetch(APP_CONFIG.supabaseUrl + '/auth/v1/resend', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': APP_CONFIG.supabaseKey
      },
      body: JSON.stringify({
        type: 'signup',
        email: email
      })
    });
    if (!response.ok) {
      var errData = {};
      try { errData = await response.json(); } catch (_) {}
      throw new Error(errData.msg || errData.error || 'Failed to resend verification email');
    }
    return true;
  } catch (err) {
    throw err;
  }
}

if ($resendSignupBtn) {
  $resendSignupBtn.addEventListener('click', async function () {
    if (!lastSignUpEmail) return;
    if ($resendSignupBtn.disabled) return;
    try {
      await resendVerificationEmail(lastSignUpEmail);
      showAuthToast('Verification email resent successfully.', 'success');
      startResendCooldown($resendSignupBtn, $resendSignupText, 60);
    } catch (err) {
      showAuthToast(err.message || 'Failed to resend verification email.', 'error');
    }
  });
}

if ($resendUnverifiedBtn) {
  $resendUnverifiedBtn.addEventListener('click', async function () {
    var email = document.getElementById('authEmail').value.trim();
    if (!email || !validateEmail(email)) {
      showAuthError('Please enter a valid email address first.');
      return;
    }
    if ($resendUnverifiedBtn.disabled) return;
    try {
      await resendVerificationEmail(email);
      showAuthToast('Verification email resent successfully.', 'success');
      startResendCooldown($resendUnverifiedBtn, $resendUnverifiedText, 60);
    } catch (err) {
      showAuthToast(err.message || 'Failed to resend verification email.', 'error');
    }
  });
}

async function onAuthSubmit(e) {
  if (e) e.preventDefault();
  if (authSubmitting) return;
  clearAuthError();
  hideUnverifiedCard();

  if (isSignUpMode) {
    const fullName = document.getElementById('authFullName').value.trim();
    const orgName = document.getElementById('authOrgName').value.trim();
    const email = document.getElementById('authEmailSignUp').value.trim();
    const password = document.getElementById('authPasswordSignUp').value;

    if (!fullName) { showAuthError('Please enter your full name.'); return; }
    if (!orgName) { showAuthError('Please enter your organization or workspace name.'); return; }
    if (!email || !validateEmail(email)) { showAuthError('Please enter a valid email address.'); return; }
    if (!password || !validatePassword(password)) { showAuthError('Password must be at least 6 characters.'); return; }

    setAuthLoading(true);
    try {
      const result = await handleSignUp(fullName, orgName, email, password);

      if (result?.user?.identities?.length === 0) {
        showAuthError('An account with this email already exists. Please sign in instead.');
        setAuthLoading(false);
        return;
      }

      showSignupSuccessCard(email);
    } catch (err) {
      const msg = err?.message || 'Something went wrong. Please try again.';
      showAuthError(msg);
      console.error('[Auth] Sign up error:', err);
    } finally {
      setAuthLoading(false);
    }
  } else {
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;

    if (!email || !validateEmail(email)) { showAuthError('Please enter a valid email address.'); return; }
    if (!password) { showAuthError('Please enter your password.'); return; }

    setAuthLoading(true);
    try {
      await handleSignIn(email, password);
      window.location.href = 'index.html';
    } catch (err) {
      var msg = err?.message || 'Invalid email or password.';
      var code = err?.code || err?.status || '';
      if (msg.toLowerCase().indexOf('email not confirmed') !== -1 || msg.toLowerCase().indexOf('email_not_confirmed') !== -1) {
        showUnverifiedCard();
      } else {
        showAuthError(msg);
      }
      console.error('[Auth] Sign in error:', err);
    } finally {
      setAuthLoading(false);
    }
  }
}

const authForm = document.getElementById('authForm');
if (authForm) authForm.addEventListener('submit', onAuthSubmit);

document.querySelectorAll('.auth-input').forEach(function (el) {
  el.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') onAuthSubmit(e);
  });
});

const passField = document.getElementById('authPassword');
if (passField) {
  passField.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') onAuthSubmit(e);
  });
}

const passSignUpField = document.getElementById('authPasswordSignUp');
if (passSignUpField) {
  passSignUpField.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') onAuthSubmit(e);
  });
}

function showAuthToast(msg, type) {
  type = type || 'info';
  var c = document.getElementById('authToastContainer');
  if (!c) return;
  var el = document.createElement('div');
  el.className = 'toast toast-' + type + ' animate-slideIn';
  var icons = {
    success: '<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>',
    error: '<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg>'
  };
  el.innerHTML = (icons[type] || '') + '<span>' + msg + '</span>';
  c.appendChild(el);
  setTimeout(function () {
    el.className = el.className.replace('animate-slideIn', 'animate-slideOut');
    setTimeout(function () { el.remove(); }, 260);
  }, 4000);
}

// ── Email Verification Detection ─────────────────────────────
(function detectEmailVerification() {
  var hash = window.__authHash || window.location.hash;
  if (!hash) return;

  if (hash.indexOf('type=signup') !== -1 || hash.indexOf('type=email') !== -1 || hash.indexOf('type=invite') !== -1) {
    pendingVerification = true;

    var extractEmail = function (h) {
      var match = h.match(/email=([^&]+)/);
      if (match) return decodeURIComponent(match[1]);
      return '';
    };
    var verifiedEmail = extractEmail(hash);

    setTimeout(async function () {
      try {
        var sr = await window.supabase.auth.getSession();
        var session = sr.data?.session;
        if (session) {
          await window.supabase.auth.signOut();
        }
      } catch (_) {}

      if (verifiedEmail) lastSignUpEmail = verifiedEmail;
      showEmailVerifiedCard();
    }, 100);
  }
})();

if (typeof window.supabase !== 'undefined' && window.supabase.auth) {
  window.supabase.auth.onAuthStateChange(function (event, session) {
    if (pendingVerification) return;
    if (event === 'SIGNED_IN' && session && window.location.pathname.includes('auth')) {
      window.location.href = 'index.html';
    }
  });
}

(async function checkExistingSession() {
  if (typeof window.supabase === 'undefined' || !window.supabase.auth) return;
  if (!window.location.pathname.includes('auth')) return;
  if (pendingVerification) return;
  try {
    var { data } = await window.supabase.auth.getSession();
    if (data?.session) {
      window.location.href = 'index.html';
    }
  } catch (_) {}
})();
