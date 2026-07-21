(function () {
  var params = new URLSearchParams(window.location.search);
  var code = params.get('code');
  var state = params.get('state');
  var errorParam = params.get('error');
  var errorDescription = params.get('error_description');
  var OPENER_ORIGIN = 'http://127.0.0.1:5500';

  function closePopup(data) {
    if (window.opener && !window.opener.closed) {
      try {
        window.opener.postMessage(data, OPENER_ORIGIN);
      } catch (e) {
        console.error('[LinkedInCallback] postMessage failed:', e);
      }
    }
    setTimeout(function () { window.close(); }, 200);
  }

  function displayFallbackMessage(message) {
    document.body.innerHTML = '<div style="font-family:sans-serif;padding:2rem;max-width:500px;margin:0 auto;text-align:center;">' +
      '<h2 style="font-size:1.25rem;margin-bottom:0.75rem;">LinkedIn Authorization</h2>' +
      '<p style="color:#6b7280;margin-bottom:1rem;">' + escapeHtml(message) + '</p>' +
      '<p style="font-size:0.875rem;color:#9ca3af;">You can close this window.</p>' +
      '</div>';
  }

  function escapeHtml(s) {
    if (typeof s !== 'string') return '';
    return s.replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; });
  }

  if (errorParam) {
    closePopup({ type: 'linkedin-error', error: errorDescription || errorParam });
    displayFallbackMessage(errorDescription || 'LinkedIn returned an error: ' + errorParam);
    return;
  }

  if (!code || !state) {
    var errMsg = 'Missing authorization code or state parameter. Please try connecting again.';
    closePopup({ type: 'linkedin-error', error: errMsg });
    displayFallbackMessage(errMsg);
    return;
  }

  var expectedState = localStorage.getItem('linkedin_oauth_state');
  localStorage.removeItem('linkedin_oauth_state');

  if (!expectedState || state !== expectedState) {
    var errMsg = 'State mismatch — possible CSRF attack. Please try again.';
    closePopup({ type: 'linkedin-error', error: errMsg });
    displayFallbackMessage(errMsg);
    return;
  }

  if (!window.opener || window.opener.closed) {
    displayFallbackMessage('The original dashboard window is no longer open. You can close this window and go back to the dashboard.');
    return;
  }

  (async function () {
    try {
      if (!window.opener.supabase || !window.opener.supabase.auth) {
        closePopup({ type: 'linkedin-error', error: 'Supabase client not available in the parent window. Please refresh the dashboard and try again.' });
        return;
      }

      var sessionResult = await window.opener.supabase.auth.getSession();
      var session = sessionResult.data?.session;
      if (!session) {
        closePopup({ type: 'linkedin-error', error: 'Your session has expired. Please sign in again and retry.' });
        return;
      }

      var jwt = session.access_token;
      if (!jwt) {
        closePopup({ type: 'linkedin-error', error: 'No access token found in session. Please sign in again.' });
        return;
      }

      var edgeFunctionUrl = APP_CONFIG.LINKEDIN_EDGE_FUNCTION;

      if (!edgeFunctionUrl || edgeFunctionUrl.indexOf('YOUR_EDGE_FUNCTION') !== -1) {
        closePopup({ type: 'linkedin-error', error: 'Edge Function URL is not configured in config.js.' });
        return;
      }

      console.log('[LinkedInCallback] Calling Edge Function:', edgeFunctionUrl);

      var response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + jwt
        },
        body: JSON.stringify({
          code: code,
          redirect_uri: APP_CONFIG.REDIRECT_URI
        })
      });

      if (!response.ok) {
        var errBody = '';
        try { errBody = await response.text(); } catch (_) {}
        var status = response.status;
        var msg = '';
        if (status === 401) {
          msg = 'Authentication failed (HTTP 401). Your session may have expired. Please refresh the dashboard and try again.';
        } else if (status === 500) {
          msg = 'The authentication server encountered an error (HTTP 500). The Edge Function may need configuration.';
        } else {
          msg = 'Token exchange failed (HTTP ' + status + '): ' + errBody;
        }
        console.error('[LinkedInCallback] ' + msg);
        closePopup({ type: 'linkedin-error', error: msg });
        return;
      }

      var result = null;
      try {
        result = await response.json();
      } catch (_) {}

      if (result && !result.success) {
        closePopup({ type: 'linkedin-error', error: result.error || 'Edge Function returned an unsuccessful response.' });
        return;
      }

      console.log('[LinkedInCallback] Edge Function returned OK');
      closePopup({ type: 'linkedin-connected', success: true });
    } catch (err) {
      var msg = 'Cannot reach the authentication server. Make sure the Edge Function is deployed and the Supabase project is active.';
      if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
        msg = 'Network error: Could not reach the Edge Function. Check your internet connection and that the function URL is correct.';
      } else if (err.message && err.message.indexOf('Failed to fetch') === -1) {
        msg = err.message;
      }
      console.error('[LinkedInCallback] Error:', msg, err);
      closePopup({ type: 'linkedin-error', error: msg });
    }
  })();
})();
