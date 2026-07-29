(function () {
  var currentState = 'disconnected';
  var currentSession = null;
  var connectionData = null;

  var BTN_ID = 'connect-facebook-btn';
  var BADGE_ID = 'facebook-status';
  var DETAILS_ID = 'facebook-details';
  var NAME_ID = 'facebook-name';
  var PAGE_NAME_ID = 'facebook-page-name';
  var PAGE_ID_ID = 'facebook-page-id';
  var CONNECTED_SINCE_ID = 'facebook-connected-since';
  var ERROR_ID = 'facebook-error';
  var ERROR_TEXT_ID = 'facebook-error-text';
  var FUTURE_ID = 'facebook-future';

  var FACEBOOK_ICON_SVG = '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>';
  var SPINNER_SVG = '<span class="loader-ring animate-spin" style="width:14px;height:14px;border-width:2px;"></span>';

  function generateState() {
    var arr = new Uint8Array(32);
    crypto.getRandomValues(arr);
    var state = Array.from(arr, function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    localStorage.setItem('facebook_oauth_state', state);
    return state;
  }

  function showToast(msg, type) {
    type = type || 'info';
    var c = document.getElementById('toastContainer');
    if (!c) return;
    var el = document.createElement('div');
    el.className = 'toast toast-' + type + ' animate-slideIn';
    el.setAttribute('role', 'alert');
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

  function showDisconnectModal() {
    var existing = document.getElementById('facebook-disconnect-modal');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.id = 'facebook-disconnect-modal';
    overlay.className = 'modal-overlay';

    var modal = document.createElement('div');
    modal.className = 'modal-card';

    modal.innerHTML =
      '<div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;">' +
        '<div class="modal-icon" style="background:rgba(239,68,68,0.12);">' +
          '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2"><path d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/></svg>' +
        '</div>' +
        '<h3 class="modal-title">Disconnect Facebook?</h3>' +
      '</div>' +
      '<p class="modal-body" style="margin:0 0 1rem 0;">' +
        'You will stop publishing posts to this Facebook Page until you reconnect.' +
      '</p>' +
      '<div style="display:flex;gap:0.625rem;justify-content:flex-end;">' +
        '<button id="modal-cancel-btn" class="modal-btn modal-btn-secondary">Cancel</button>' +
        '<button id="modal-confirm-btn" class="modal-btn modal-btn-primary" style="background:#dc2626;border-color:#dc2626;">Disconnect</button>' +
      '</div>';

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    document.getElementById('modal-cancel-btn').addEventListener('click', function () {
      overlay.remove();
    });

    document.getElementById('modal-confirm-btn').addEventListener('click', function () {
      overlay.remove();
      disconnectFacebook();
    });

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) overlay.remove();
    });
  }

  function setBadge(html, bg, border, color) {
    var badge = document.getElementById(BADGE_ID);
    if (!badge) return;
    badge.innerHTML = html;
    badge.style.background = bg;
    badge.style.borderColor = border;
    badge.style.color = color;
  }

  function updateFacebookUI(state, data) {
    currentState = state;
    var btn = document.getElementById(BTN_ID);
    var details = document.getElementById(DETAILS_ID);
    var error = document.getElementById(ERROR_ID);
    var future = document.getElementById(FUTURE_ID);
    if (!btn) return;

    var svgs = btn.querySelectorAll('svg');
    for (var i = 0; i < svgs.length; i++) { svgs[i].remove(); }
    var spinners = btn.querySelectorAll('.loader-ring');
    for (var j = 0; j < spinners.length; j++) { spinners[j].remove(); }

    if (details) details.classList.add('hidden');
    if (error) error.classList.add('hidden');
    if (future) future.classList.add('hidden');

    if (state === 'connecting') {
      btn.disabled = true;
      btn.className = 'btn-primary';
      btn.innerHTML = SPINNER_SVG + 'Connecting...';
      btn.setAttribute('aria-label', 'Connecting to Facebook');
      setBadge(
        '<span class="w-1.5 h-1.5 rounded-full bg-yellow-400"></span> Connecting...',
        'rgba(234,179,8,0.08)',
        'rgba(234,179,8,0.2)',
        '#facc15'
      );
      return;
    }

    if (state === 'connected' && data) {
      connectionData = data;
      btn.disabled = false;
      btn.className = 'btn-primary !bg-transparent !text-red-400 !border-red-500/25 hover:!bg-red-500/5';
      btn.innerHTML = FACEBOOK_ICON_SVG + 'Disconnect Facebook';
      btn.setAttribute('aria-label', 'Disconnect Facebook');

      setBadge(
        '<span class="w-1.5 h-1.5 rounded-full bg-green-400"></span> Connected',
        'rgba(6,150,80,0.08)',
        'rgba(6,150,80,0.2)',
        '#4ade80'
      );

      if (details) {
        details.classList.remove('hidden');
        var nameEl = document.getElementById(NAME_ID);
        var pageNameEl = document.getElementById(PAGE_NAME_ID);
        var pageIdEl = document.getElementById(PAGE_ID_ID);
        var sinceEl = document.getElementById(CONNECTED_SINCE_ID);
        if (nameEl) nameEl.textContent = data.facebook_name || '—';
        if (pageNameEl) pageNameEl.textContent = data.page_name || '—';
        if (pageIdEl) pageIdEl.textContent = data.page_id ? data.page_id.slice(0, 12) + '...' : '—';
        if (sinceEl) {
          var d = data.created_at ? new Date(data.created_at) : null;
          sinceEl.textContent = d ? d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '—';
        }
      }

      if (future) future.classList.remove('hidden');
      return;
    }

    if (state === 'error') {
      btn.disabled = false;
      btn.className = 'btn-primary';
      btn.innerHTML = FACEBOOK_ICON_SVG + 'Try Again';
      btn.setAttribute('aria-label', 'Try connecting to Facebook again');

      setBadge(
        '<span class="w-1.5 h-1.5 rounded-full bg-red-400"></span> Connection Failed',
        'rgba(239,68,68,0.08)',
        'rgba(239,68,68,0.2)',
        '#f87171'
      );

      if (error) {
        error.classList.remove('hidden');
        var errText = document.getElementById(ERROR_TEXT_ID);
        if (errText) errText.textContent = (data && data.error) || 'Unable to connect to Facebook.';
      }
      return;
    }

    btn.disabled = false;
    btn.className = 'btn-primary';
    btn.innerHTML = FACEBOOK_ICON_SVG + 'Connect Facebook';
    btn.setAttribute('aria-label', 'Connect Facebook');
    setBadge(
      '<span class="w-1.5 h-1.5 rounded-full bg-red-400"></span> Not Connected',
      'rgba(239,68,68,0.08)',
      'rgba(239,68,68,0.2)',
      '#f87171'
    );
  }

  var popupTimer = null;

  async function connectFacebook() {
    if (!currentSession) {
      showToast('You must be signed in to connect Facebook.', 'error');
      return;
    }

    var clientId = APP_CONFIG.FACEBOOK_CLIENT_ID;
    if (!clientId || clientId.indexOf('YOUR_') === 0) {
      showToast('Facebook App ID is not configured in config.js.', 'error');
      return;
    }

    var state = generateState();

    var redirectUri = APP_CONFIG.FACEBOOK_REDIRECT_URI;
    var apiVersion = APP_CONFIG.FACEBOOK_API_VERSION;
    var configId = APP_CONFIG.FACEBOOK_CONFIG_ID;

    var authUrl = 'https://www.facebook.com/' + apiVersion + '/dialog/oauth' +
      '?client_id=' + encodeURIComponent(clientId) +
      '&redirect_uri=' + encodeURIComponent(redirectUri) +
      '&state=' + encodeURIComponent(state) +
      '&config_id=' + encodeURIComponent(configId) +
      '&response_type=code';

    updateFacebookUI('connecting');

    var popup;
    try {
      popup = window.open(authUrl, 'facebook-oauth', 'width=600,height=700');
    } catch (ex) {
      updateFacebookUI('error', { error: 'Popup was blocked. Please allow popups for this site and try again.' });
      showToast('Popup was blocked. Please allow popups for this site and try again.', 'error');
      return;
    }

    if (!popup || popup.closed) {
      updateFacebookUI('error', { error: 'Popup was blocked. Please allow popups for this site and try again.' });
      showToast('Popup was blocked. Please allow popups for this site and try again.', 'error');
      return;
    }

    if (popupTimer) clearInterval(popupTimer);
    popupTimer = setInterval(function () {
      if (popup.closed) {
        clearInterval(popupTimer);
        popupTimer = null;
        if (currentState === 'connecting') {
          updateFacebookUI('disconnected');
          showToast('Connection cancelled.', 'info');
        }
      }
    }, 500);
  }

  async function loadFacebookConnection() {
    try {
      var sr = await window.supabase.auth.getSession();
      var session = sr.data?.session;
      if (!session) {
        currentSession = null;
        updateFacebookUI('disconnected');
        return;
      }
      currentSession = session;

      var { data, error } = await window.supabase
        .from('facebook_connections')
        .select('facebook_name, page_id, page_name, created_at')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (error) {
        if (error.code === 'PGRST116' || error.code === '404' || error.message?.indexOf('does not exist') !== -1) {
          updateFacebookUI('disconnected');
          return;
        }
        throw error;
      }

      if (data) {
        updateFacebookUI('connected', data);
      } else {
        updateFacebookUI('disconnected');
      }
    } catch (err) {
      console.error('[FacebookOAuth] loadFacebookConnection error:', err?.message || err);
      updateFacebookUI('disconnected');
    }
  }

  async function disconnectFacebook() {
    if (!currentSession) {
      showToast('You must be signed in to disconnect Facebook.', 'error');
      return;
    }

    updateFacebookUI('connecting');

    try {
      var { error } = await window.supabase
        .from('facebook_connections')
        .delete()
        .eq('user_id', currentSession.user.id);

      if (error) throw error;

      showToast('Facebook account disconnected.', 'success');
      updateFacebookUI('disconnected');

      if (typeof loadDashboardData === 'function') {
        setTimeout(function () { loadDashboardData(); }, 300);
      }
    } catch (err) {
      console.error('[FacebookOAuth] disconnect error:', err?.message || err);
      showToast('Failed to disconnect Facebook.', 'error');
      loadFacebookConnection();
    }
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
        showDisconnectModal();
      } else {
        connectFacebook();
      }
    });
  }

  async function onReady() {
    try {
      var sr = await window.supabase.auth.getSession();
      if (sr.data?.session) {
        currentSession = sr.data.session;
      }
    } catch (err) {
      console.error('[FacebookOAuth] Failed to get session on init:', err?.message || err);
    }
    window.supabase.auth.onAuthStateChange(function (event, session) {
      currentSession = session;
      if (event === 'SIGNED_IN' && session) {
        loadFacebookConnection();
      } else if (event === 'SIGNED_OUT') {
        currentSession = null;
        updateFacebookUI('disconnected');
      }
    });
    attachClickListener();
    loadFacebookConnection();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady);
  } else {
    onReady();
  }

  window.facebookOAuth = {
    connect: connectFacebook,
    checkConnection: loadFacebookConnection,
    updateUI: updateFacebookUI,
    disconnect: disconnectFacebook,
    showDisconnectModal: showDisconnectModal
  };
})();
