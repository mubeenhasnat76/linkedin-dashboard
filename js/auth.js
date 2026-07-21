let isSignUpMode = false;
let authSubmitting = false;

const $authTabSignIn = document.getElementById('authTabSignIn');
const $authTabSignUp = document.getElementById('authTabSignUp');
const $authFormSignIn = document.getElementById('authFormSignIn');
const $authFormSignUp = document.getElementById('authFormSignUp');
const $authIndicator = document.getElementById('authTabIndicator');
const $authSubmitBtn = document.getElementById('authSubmitBtn');
const $authSubmitText = document.getElementById('authSubmitText');
const $authSubmitLoader = document.getElementById('authSubmitLoader');
const $authError = document.getElementById('authError');

function switchAuthTab(mode) {
  isSignUpMode = mode;
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
}

if ($authTabSignIn) $authTabSignIn.addEventListener('click', function () { switchAuthTab(false); });
if ($authTabSignUp) $authTabSignUp.addEventListener('click', function () { switchAuthTab(true); });

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

async function onAuthSubmit(e) {
  if (e) e.preventDefault();
  if (authSubmitting) return;
  clearAuthError();

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

      showAuthToast('Account created! Check your email for a confirmation link.', 'success');

      setTimeout(function () {
        switchAuthTab(false);
        const emailInput = document.getElementById('authEmail');
        const passInput = document.getElementById('authPassword');
        if (emailInput) emailInput.value = email;
        if (passInput) passInput.value = '';
      }, 2000);
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
      const msg = err?.message || 'Invalid email or password.';
      showAuthError(msg);
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

if (typeof window.supabase !== 'undefined' && window.supabase.auth) {
  window.supabase.auth.onAuthStateChange(function (event, session) {
    if (event === 'SIGNED_IN' && session && window.location.pathname.includes('auth')) {
      window.location.href = 'index.html';
    }
  });
}

(async function checkExistingSession() {
  if (typeof window.supabase === 'undefined' || !window.supabase.auth) return;
  if (!window.location.pathname.includes('auth')) return;
  try {
    var { data } = await window.supabase.auth.getSession();
    if (data?.session) {
      window.location.href = 'index.html';
    }
  } catch (_) {}
})();

