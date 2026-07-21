(function () {
  var guard = {};
  var currentUser = null;
  var currentSession = null;
  var guardInitialized = false;

  function getSupabaseClient() {
    if (window.supabase && window.supabase.auth) {
      return window.supabase;
    }
    return null;
  }

  var guardSupabase = getSupabaseClient();

  async function waitForSession(retries, delay) {
    retries = retries || 5;
    delay = delay || 600;
    for (var i = 0; i < retries; i++) {
      try {
        var { data } = await guardSupabase.auth.getSession();
        if (data?.session) {
          currentSession = data.session;
          currentUser = data.session.user;
          return true;
        }
      } catch (_) {}
      await new Promise(function (r) { return setTimeout(r, delay); });
    }
    return false;
  }

  async function checkAuth() {
    if (!guardSupabase) {
      guardSupabase = getSupabaseClient();
      if (!guardSupabase) {
        console.warn('[Guard] Supabase SDK not available');
        guardInitialized = true;
        return false;
      }
    }

    try {
      var { data, error } = await guardSupabase.auth.getSession();
      if (error) throw error;
      currentSession = data?.session || null;
      currentUser = data?.session?.user || null;
      guardInitialized = true;
      return !!currentSession;
    } catch (err) {
      console.error('[Guard] Session check failed:', err);
      guardInitialized = true;
      return false;
    }
  }

  async function protectPage() {
    if (!guardSupabase) {
      guardSupabase = getSupabaseClient();
    }

    var isAuthed = await checkAuth();

    if (!isAuthed) {
      isAuthed = await waitForSession();
    }

    if (!isAuthed) {
      var currentPath = window.location.pathname;
      if (!currentPath.includes('auth.html')) {
        var returnUrl = encodeURIComponent(window.location.href);
        window.location.replace('auth.html?redirect=' + returnUrl);
      }
    }
    return isAuthed;
  }

  async function signOut(redirect) {
    if (!guardSupabase) {
      guardSupabase = getSupabaseClient();
    }
    try {
      await guardSupabase.auth.signOut();
    } catch (err) {
      console.error('[Guard] Sign out error:', err);
    }
    currentUser = null;
    currentSession = null;
    if (redirect !== false) {
      window.location.href = 'auth.html';
    }
  }

  function getUser() {
    return currentUser;
  }

  function getUserOrganization() {
    return currentUser?.user_metadata?.organization_name || null;
  }

  function getUserRole() {
    return currentUser?.user_metadata?.role || 'user';
  }

  function isAuthenticated() {
    return !!currentSession;
  }

  if (guardSupabase && guardSupabase.auth) {
    guardSupabase.auth.onAuthStateChange(function (event, session) {
      currentSession = session;
      currentUser = session?.user || null;
      if (event === 'SIGNED_OUT') {
        if (!window.location.pathname.includes('auth.html')) {
          window.location.href = 'auth.html';
        }
      }
    });
  }

  guard.checkAuth = checkAuth;
  guard.protectPage = protectPage;
  guard.signOut = signOut;
  guard.getUser = getUser;
  guard.getUserOrganization = getUserOrganization;
  guard.getUserRole = getUserRole;
  guard.isAuthenticated = isAuthenticated;

  window.authGuard = guard;

  function bootGuard() {
    protectPage();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootGuard);
  } else {
    bootGuard();
  }
})();
