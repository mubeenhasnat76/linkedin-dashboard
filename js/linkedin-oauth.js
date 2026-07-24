(function () {
  var currentState = 'disconnected';
  var currentSession = null;

  var BTN_ID = 'connectLinkedInBtn';
  var TEXT_ID = 'connectLinkedInText';
  var BADGE_ID = 'linkedinStatusBadge';

  var LINKEDIN_ICON_SVG = '<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2zM4 6a2 2 0 100-4 2 2 0 000 4z"/></svg>';

  function generateState() {
    var arr = new Uint8Array(32);
    crypto.getRandomValues(arr);
    var state = Array.from(arr, function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    localStorage.setItem('linkedin_oauth_state', state);
    return state;
  }

  function showToast(msg, type) {
    type = type || 'info';
    var c = document.getElementById('toastContainer');
    if (!c) return;
    var el = document.createElement('div');
    el.className = 'toast toast-' + type + ' animate-slideIn';
    var icons = {
      success: '<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>',
      error: '<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg>',
      info: '<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
    };
    el.innerHTML = (icons[type] || icons.info) + '<span>' + msg + '</span><div class="toast-progress"></div>';
    c.appendChild(el);
    setTimeout(function () {
      el.className = el.className.replace('animate-slideIn', 'animate-slideOut');
      setTimeout(function () { el.remove(); }, 260);
    }, 4000);
  }

  function showAccountSelectionModal(onConfirm) {
    var existing = document.getElementById('linkedin-account-modal');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.id = 'linkedin-account-modal';
    overlay.className = 'modal-overlay';

    var modal = document.createElement('div');
    modal.className = 'modal-card';

    modal.innerHTML =
      '<div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;">' +
        '<div class="modal-icon" style="background:rgba(245,158,11,0.12);">' +
          '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2"><path d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/></svg>' +
        '</div>' +
        '<h3 class="modal-title">Connect LinkedIn Account</h3>' +
      '</div>' +
      '<p class="modal-body" style="margin:0 0 0.75rem 0;">' +
        'If you are already signed in to LinkedIn in this browser, LinkedIn will automatically connect that account.' +
      '</p>' +
      '<p class="modal-body" style="margin:0 0 0.5rem 0;">' +
        'If you want to connect a different LinkedIn account:' +
      '</p>' +
      '<ul class="modal-body" style="line-height:1.6;margin:0 0 1rem 0;padding-left:1.25rem;">' +
        '<li>Sign out of LinkedIn first, or</li>' +
        '<li>Use an Incognito / Private window, or</li>' +
        '<li>Use another browser where the desired LinkedIn account is signed in.</li>' +
      '</ul>' +
      '<div style="display:flex;gap:0.625rem;justify-content:flex-end;">' +
        '<button id="modal-cancel-btn" class="modal-btn modal-btn-secondary">Cancel</button>' +
        '<button id="modal-continue-btn" class="modal-btn modal-btn-primary">Continue</button>' +
      '</div>';

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    document.getElementById('modal-cancel-btn').addEventListener('click', function () {
      overlay.remove();
    });

    document.getElementById('modal-continue-btn').addEventListener('click', function () {
      if (typeof onConfirm === 'function') onConfirm();
      overlay.remove();
    });

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) overlay.remove();
    });
  }

  function updateConnectButton(state) {
    currentState = state;
    var btn = document.getElementById(BTN_ID);
    var text = document.getElementById(TEXT_ID);
    var badge = document.getElementById(BADGE_ID);
    if (!btn) return;

    var svgs = btn.querySelectorAll('svg');
    for (var i = 0; i < svgs.length; i++) { svgs[i].remove(); }

    if (state === 'connecting') {
      btn.disabled = true;
      btn.className = 'btn-primary';
      btn.innerHTML = LINKEDIN_ICON_SVG + '<span id="' + TEXT_ID + '">Connecting...</span>';
      if (badge) {
        badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-yellow-400"></span> Connecting';
        badge.className = 'linkedin-badge';
        badge.style.background = 'rgba(234,179,8,0.08)';
        badge.style.borderColor = 'rgba(234,179,8,0.2)';
        badge.style.color = '#facc15';
      }
      return;
    }

    if (state === 'connected') {
      btn.disabled = false;
      btn.innerHTML = LINKEDIN_ICON_SVG + '<span id="' + TEXT_ID + '">Disconnect</span>';
      btn.className = 'btn-primary !bg-transparent !text-red-400 !border-red-500/25 hover:!bg-red-500/5';
      if (badge) {
        badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-green-400"></span> Connected';
        badge.className = 'linkedin-badge';
        badge.style.background = 'rgba(6,150,80,0.08)';
        badge.style.borderColor = 'rgba(6,150,80,0.2)';
        badge.style.color = '#4ade80';
      }
      return;
    }

    if (state === 'expired') {
      btn.disabled = false;
      btn.innerHTML = LINKEDIN_ICON_SVG + '<span id="' + TEXT_ID + '">Reconnect</span>';
      btn.className = 'btn-primary';
      if (badge) {
        badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-orange-400"></span> Token Expired';
        badge.className = 'linkedin-badge';
        badge.style.background = 'rgba(249,115,22,0.08)';
        badge.style.borderColor = 'rgba(249,115,22,0.2)';
        badge.style.color = '#fb923c';
      }
      return;
    }

    btn.disabled = false;
    btn.className = 'btn-primary';
    btn.innerHTML = LINKEDIN_ICON_SVG + '<span id="' + TEXT_ID + '">Connect Profile</span>';
    if (badge) {
      badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-red-400"></span> Not Connected';
      badge.className = 'linkedin-badge';
      badge.style.background = 'rgba(239,68,68,0.08)';
      badge.style.borderColor = 'rgba(239,68,68,0.2)';
      badge.style.color = '#f87171';
    }
  }

  function startLinkedInAuth() {
    console.log('[LinkedInOAuth] startLinkedInAuth entered');
    console.log('[LinkedInOAuth] window.location.origin:', window.location.origin);
    console.log('[LinkedInOAuth] APP_CONFIG.REDIRECT_URI:', APP_CONFIG.REDIRECT_URI);
    console.log('[LinkedInOAuth] APP_CONFIG.LINKEDIN_CLIENT_ID:', APP_CONFIG.LINKEDIN_CLIENT_ID);
    console.log('[LinkedInOAuth] APP_CONFIG.LINKEDIN_EDGE_FUNCTION:', APP_CONFIG.LINKEDIN_EDGE_FUNCTION);
    console.log('[LinkedInOAuth] currentSession:', currentSession);

    if (!currentSession) {
      console.log('[LinkedInOAuth] early return: no currentSession');
      showToast('You must be signed in to connect LinkedIn.', 'error');
      return;
    }

    var clientId = APP_CONFIG.LINKEDIN_CLIENT_ID;
    if (!clientId || clientId === 'YOUR_LINKEDIN_CLIENT_ID') {
      console.log('[LinkedInOAuth] early return: clientId not configured');
      showToast('LinkedIn Client ID is not configured in config.js.', 'error');
      return;
    }

    if (!APP_CONFIG.LINKEDIN_EDGE_FUNCTION || APP_CONFIG.LINKEDIN_EDGE_FUNCTION.indexOf('YOUR_EDGE_FUNCTION') !== -1) {
      console.log('[LinkedInOAuth] early return: edge function not configured');
      showToast('LinkedIn Edge Function URL is not configured in config.js.', 'error');
      return;
    }

    var redirectUri = APP_CONFIG.REDIRECT_URI;
    var scopes = APP_CONFIG.LINKEDIN_SCOPES;
    var state = generateState();

    var authUrl = 'https://www.linkedin.com/oauth/v2/authorization' +
      '?response_type=code' +
      '&client_id=' + encodeURIComponent(clientId) +
      '&redirect_uri=' + encodeURIComponent(redirectUri) +
      '&state=' + encodeURIComponent(state) +
      '&scope=' + encodeURIComponent(scopes);

    console.log('[LinkedInOAuth] generated authUrl:', authUrl);

    updateConnectButton('connecting');

    var popup;
    try {
      popup = window.open(authUrl, 'linkedin-oauth', 'width=600,height=700');
    } catch (ex) {
      console.log('[LinkedInOAuth] window.open threw exception:', ex);
      showToast('Popup was blocked. Please allow popups for this site and try again.', 'error');
      updateConnectButton(currentState === 'connecting' ? 'disconnected' : currentState);
      return;
    }
    console.log('[LinkedInOAuth] window.open returned:', popup);
    console.log('[LinkedInOAuth] popup.closed:', popup ? popup.closed : 'N/A');
    if (!popup || popup.closed) {
      console.log('[LinkedInOAuth] early return: popup was blocked or closed immediately');
      showToast('Popup was blocked. Please allow popups for this site and try again.', 'error');
      updateConnectButton(currentState === 'connecting' ? 'disconnected' : currentState);
    }
  }

  async function checkLinkedInConnection() {
    try {
      var sr = await window.supabase.auth.getSession();
      var session = sr.data?.session;
      if (!session) {
        currentSession = null;
        updateConnectButton('disconnected');
        return { connected: false, error: 'No active session. Please sign in.' };
      }
      currentSession = session;

      var { data, error } = await window.supabase
        .from('profiles')
        .select('linkedin_connected, linkedin_token_expires_at, linkedin_name, linkedin_profile_id')
        .eq('id', session.user.id)
        .maybeSingle();

      if (error) {
        console.error('[LinkedInOAuth] profiles query error:', error.code, error.message);
        if (error.code === 'PGRST116' || error.code === '404' || error.message?.includes('does not exist')) {
          updateConnectButton('disconnected');
          return { connected: false, error: 'Profile not found. Try signing out and back in.' };
        }
        throw error;
      }

      if (!data || !data.linkedin_connected) {
        updateConnectButton('disconnected');
        return { connected: false };
      }

      if (data.linkedin_token_expires_at) {
        var expiresAt = new Date(data.linkedin_token_expires_at);
        if (expiresAt <= new Date()) {
          updateConnectButton('expired');
          return { connected: false, expired: true, error: 'LinkedIn token has expired. Please reconnect.' };
        }
      }

      updateConnectButton('connected');
      if (typeof updateProfileUI === 'function' && data.linkedin_name) {
        updateProfileUI({
          linkedin_connected: true,
          linkedin_name: data.linkedin_name,
          linkedin_profile_id: data.linkedin_profile_id
        });
      }
      return { connected: true, data: data };
    } catch (err) {
      var message = err?.message || 'Unknown error checking LinkedIn connection';
      console.error('[LinkedInOAuth] checkConnection error:', message);
      showToast('Failed to check LinkedIn connection: ' + message, 'error');
      updateConnectButton('disconnected');
      return { connected: false, error: message };
    }
  }

  async function disconnectLinkedIn() {
    if (!currentSession) {
      showToast('You must be signed in to disconnect LinkedIn.', 'error');
      return;
    }

    if (!confirm('Disconnect LinkedIn from this account?')) return;

    var disconnectUrl = APP_CONFIG.LINKEDIN_DISCONNECT_FUNCTION;
    if (!disconnectUrl || disconnectUrl.indexOf('YOUR_DISCONNECT_FUNCTION') !== -1) {
      showToast('LinkedIn Disconnect Edge Function URL is not configured in config.js.', 'error');
      return;
    }

    updateConnectButton('connecting');

    try {
      var sr = await window.supabase.auth.getSession();
      var session = sr.data?.session;
      if (!session) {
        showToast('Your session has expired. Please sign in again.', 'error');
        updateConnectButton('disconnected');
        return;
      }

      var jwt = session.access_token;

      var response = await fetch(disconnectUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + jwt
        }
      });

      if (!response.ok) {
        var errBody = '';
        try { errBody = await response.text(); } catch (_) {}
        var status = response.status;
        var msg = '';
        if (status === 401) {
          msg = 'Authentication failed. Your session may have expired. Please refresh and try again.';
        } else if (status >= 500) {
          msg = 'Server error. Please try again later.';
        } else {
          msg = 'Disconnect failed (HTTP ' + status + '): ' + errBody;
        }
        showToast(msg, 'error');
        updateConnectButton('connected');
        return;
      }

      var result = null;
      try {
        result = await response.json();
      } catch (_) {}

      if (result && !result.success) {
        showToast(result.error || 'Disconnect request failed.', 'error');
        updateConnectButton('connected');
        return;
      }

      showToast('LinkedIn disconnected successfully.', 'success');
      updateConnectButton('disconnected');

      if (typeof updateProfileUI === 'function') {
        updateProfileUI({
          linkedin_connected: false
        });
      }

      // Reload dashboard data to reflect the change
      if (typeof loadDashboardData === 'function') {
        setTimeout(function () { loadDashboardData(); }, 300);
      }
    } catch (err) {
      var msg = 'Could not reach the disconnect server.';
      if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
        msg += ' Network error — check your connection.';
      } else if (err.message) {
        msg += ' ' + err.message;
      }
      console.error('[LinkedInOAuth] disconnect error:', err);
      showToast(msg, 'error');
      updateConnectButton('connected');
    }
  }

  function promptLinkedInAuth() {
    var checks = [
      { cond: !currentSession, msg: 'You must be signed in to connect LinkedIn.', type: 'error' },
      { cond: !APP_CONFIG.LINKEDIN_CLIENT_ID || APP_CONFIG.LINKEDIN_CLIENT_ID === 'YOUR_LINKEDIN_CLIENT_ID', msg: 'LinkedIn Client ID is not configured in config.js.', type: 'error' },
      { cond: !APP_CONFIG.LINKEDIN_EDGE_FUNCTION || APP_CONFIG.LINKEDIN_EDGE_FUNCTION.indexOf('YOUR_EDGE_FUNCTION') !== -1, msg: 'LinkedIn Edge Function URL is not configured in config.js.', type: 'error' }
    ];
    for (var i = 0; i < checks.length; i++) {
      if (checks[i].cond) { showToast(checks[i].msg, checks[i].type); return; }
    }
    showAccountSelectionModal(function () {
      startLinkedInAuth();
    });
  }

  function attachClickListener() {
    var btn = document.getElementById(BTN_ID);
    if (!btn) {
      setTimeout(attachClickListener, 500);
      return;
    }
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      if (currentState === 'connected') {
        disconnectLinkedIn();
      } else if (currentState === 'expired') {
        startLinkedInAuth();
      } else {
        promptLinkedInAuth();
      }
    });
  }

  async function onReady() {
    try {
      var sr = await window.supabase.auth.getSession();
      if (sr.data?.session) {
        currentSession = sr.data.session;
      } else {
        console.warn('[LinkedInOAuth] No session found on initialization');
      }
    } catch (err) {
      console.error('[LinkedInOAuth] Failed to get session on init:', err?.message || err);
    }
    window.supabase.auth.onAuthStateChange(function (event, session) {
      currentSession = session;
      if (event === 'SIGNED_IN' && session) {
        checkLinkedInConnection();
      } else if (event === 'SIGNED_OUT') {
        currentSession = null;
        updateConnectButton('disconnected');
      }
    });
    attachClickListener();
    checkLinkedInConnection();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady);
  } else {
    onReady();
  }

  window.linkedinOAuth = {
    startAuth: startLinkedInAuth,
    checkConnection: checkLinkedInConnection,
    updateConnectButton: updateConnectButton,
    disconnectLinkedIn: disconnectLinkedIn,
    promptAuth: promptLinkedInAuth
  };
})();
