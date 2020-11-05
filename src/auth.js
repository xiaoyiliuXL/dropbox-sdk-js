import { getTokenExpiresAtDate } from './utils.js';
import { parseResponse } from './response.js';

let fetch;
try {
  fetch = require('node-fetch'); // eslint-disable-line global-require
} catch (Exception) {
  fetch = window.fetch.bind(window);
}

let crypto;
try {
  crypto = require('crypto'); // eslint-disable-line global-require
} catch (Exception) {
  crypto = window.crypto || window.msCrypto; // for IE11
}

// Expiration is 300 seconds but needs to be in milliseconds for Date object
const TokenExpirationBuffer = 300 * 1000;
const PKCELength = 128;
const TokenAccessTypes = ['legacy', 'offline', 'online'];
const GrantTypes = ['code', 'token'];
const IncludeGrantedScopes = ['none', 'user', 'team'];
const BaseAuthorizeUrl = 'https://www.dropbox.com/oauth2/authorize';
const BaseTokenUrl = 'https://api.dropboxapi.com/oauth2/token';

function isAxios(func) {
  return !(typeof func.post === 'undefined');
}

/**
 * @class DropboxAuth
 * @classdesc The DropboxAuth class that provides methods to manage, acquire, and refresh tokens.
 * @arg {Object} options
 * @arg {Function} [options.fetch] - fetch library for making requests.
 * @arg {String} [options.accessToken] - An access token for making authenticated
 * requests.
 * @arg {Date} [options.AccessTokenExpiresAt] - Date of the current access token's
 * expiration (if available)
 * @arg {String} [options.refreshToken] - A refresh token for retrieving access tokens
 * @arg {String} [options.clientId] - The client id for your app. Used to create
 * authentication URL.
 * @arg {String} [options.clientSecret] - The client secret for your app. Used to create
 * authentication URL and refresh access tokens.
 */
export default class DropboxAuth {
  constructor(options) {
    options = options || {};

    this.fetch = options.fetch || fetch;
    this.accessToken = options.accessToken;
    this.accessTokenExpiresAt = options.accessTokenExpiresAt;
    this.refreshToken = options.refreshToken;
    this.clientId = options.clientId;
    this.clientSecret = options.clientSecret;
  }

  /**
   * Set the access token used to authenticate requests to the API.
   * @arg {String} accessToken - An access token
   * @returns {undefined}
   */
  setAccessToken(accessToken) {
    this.accessToken = accessToken;
  }

  /**
   * Get the access token
   * @returns {String} Access token
   */
  getAccessToken() {
    return this.accessToken;
  }

  /**
   * Set the client id, which is used to help gain an access token.
   * @arg {String} clientId - Your apps client id
   * @returns {undefined}
   */
  setClientId(clientId) {
    this.clientId = clientId;
  }

  /**
   * Get the client id
   * @returns {String} Client id
   */
  getClientId() {
    return this.clientId;
  }

  /**
   * Set the client secret
   * @arg {String} clientSecret - Your app's client secret
   * @returns {undefined}
   */
  setClientSecret(clientSecret) {
    this.clientSecret = clientSecret;
  }

  /**
   * Get the client secret
   * @returns {String} Client secret
   */
  getClientSecret() {
    return this.clientSecret;
  }

  /**
   * Gets the refresh token
   * @returns {String} Refresh token
   */
  getRefreshToken() {
    return this.refreshToken;
  }

  /**
   * Sets the refresh token
   * @param refreshToken - A refresh token
   */
  setRefreshToken(refreshToken) {
    this.refreshToken = refreshToken;
  }

  /**
   * Gets the access token's expiration date
   * @returns {Date} date of token expiration
   */
  getAccessTokenExpiresAt() {
    return this.accessTokenExpiresAt;
  }

  /**
   * Sets the access token's expiration date
   * @param accessTokenExpiresAt - new expiration date
   */
  setAccessTokenExpiresAt(accessTokenExpiresAt) {
    this.accessTokenExpiresAt = accessTokenExpiresAt;
  }

  generatePKCECodes() {
    let codeVerifier = crypto.randomBytes(PKCELength);
    codeVerifier = codeVerifier.toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
      .substr(0, 128);
    this.codeVerifier = codeVerifier;

    const encoder = new TextEncoder();
    const codeData = encoder.encode(codeVerifier);
    let codeChallenge = crypto.createHash('sha256').update(codeData).digest();
    codeChallenge = codeChallenge.toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    this.codeChallenge = codeChallenge;
  }

  /**
   * Get a URL that can be used to authenticate users for the Dropbox API.
   * @arg {String} redirectUri - A URL to redirect the user to after
   * authenticating. This must be added to your app through the admin interface.
   * @arg {String} [state] - State that will be returned in the redirect URL to help
   * prevent cross site scripting attacks.
   * @arg {String} [authType] - auth type, defaults to 'token', other option is 'code'
   * @arg {String} [tokenAccessType] - type of token to request.  From the following:
   * null - creates a token with the app default (either legacy or online)
   * legacy - creates one long-lived token with no expiration
   * online - create one short-lived token with an expiration
   * offline - create one short-lived token with an expiration with a refresh token
   * @arg {Array<String>} [scope] - scopes to request for the grant
   * @arg {String} [includeGrantedScopes] - whether or not to include previously granted scopes.
   * From the following:
   * user - include user scopes in the grant
   * team - include team scopes in the grant
   * Note: if this user has never linked the app, include_granted_scopes must be None
   * @arg {boolean} [usePKCE] - Whether or not to use Sha256 based PKCE. PKCE should be only use on
   * client apps which doesn't call your server. It is less secure than non-PKCE flow but
   * can be used if you are unable to safely retrieve your app secret
   * @returns {String} Url to send user to for Dropbox API authentication
   */
  getAuthenticationUrl(redirectUri, state, authType = 'token', tokenAccessType = null, scope = null, includeGrantedScopes = 'none', usePKCE = false) {
    const clientId = this.getClientId();
    const baseUrl = BaseAuthorizeUrl;

    if (!clientId) {
      throw new Error('A client id is required. You can set the client id using .setClientId().');
    }
    if (authType !== 'code' && !redirectUri) {
      throw new Error('A redirect uri is required.');
    }
    if (!GrantTypes.includes(authType)) {
      throw new Error('Authorization type must be code or token');
    }
    if (tokenAccessType && !TokenAccessTypes.includes(tokenAccessType)) {
      throw new Error('Token Access Type must be legacy, offline, or online');
    }
    if (scope && !(scope instanceof Array)) {
      throw new Error('Scope must be an array of strings');
    }
    if (!IncludeGrantedScopes.includes(includeGrantedScopes)) {
      throw new Error('includeGrantedScopes must be none, user, or team');
    }

    let authUrl;
    if (authType === 'code') {
      authUrl = `${baseUrl}?response_type=code&client_id=${clientId}`;
    } else {
      authUrl = `${baseUrl}?response_type=token&client_id=${clientId}`;
    }

    if (redirectUri) {
      authUrl += `&redirect_uri=${redirectUri}`;
    }
    if (state) {
      authUrl += `&state=${state}`;
    }
    if (tokenAccessType) {
      authUrl += `&token_access_type=${tokenAccessType}`;
    }
    if (scope) {
      authUrl += `&scope=${scope.join(' ')}`;
    }
    if (includeGrantedScopes !== 'none') {
      authUrl += `&include_granted_scopes=${includeGrantedScopes}`;
    }
    if (usePKCE) {
      this.generatePKCECodes();
      authUrl += '&code_challenge_method=S256';
      authUrl += `&code_challenge=${this.codeChallenge}`;
    }
    return authUrl;
  }

  /**
   * Get an OAuth2 access token from an OAuth2 Code.
   * @arg {String} redirectUri - A URL to redirect the user to after
   * authenticating. This must be added to your app through the admin interface.
   * @arg {String} code - An OAuth2 code.
  */
  getAccessTokenFromCode(redirectUri, code) {
    const clientId = this.getClientId();
    const clientSecret = this.getClientSecret();

    if (!clientId) {
      throw new Error('A client id is required. You can set the client id using .setClientId().');
    }
    let path = BaseTokenUrl;
    path += '?grant_type=authorization_code';
    path += `&code=${code}`;
    path += `&client_id=${clientId}`;

    if (clientSecret) {
      path += `&client_secret=${clientSecret}`;
    } else {
      if (!this.codeChallenge) {
        throw new Error('You must use PKCE when generating the authorization URL to not include a client secret');
      }
      path += `&code_verifier=${this.codeVerifier}`;
    }
    if (redirectUri) {
      path += `&redirect_uri=${redirectUri}`;
    }

    const fetchOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    };

    if(isAxios(this.fetch)){
      fetchOptions.url = getBaseURL(host) + path;
    }

    return (isAxios(this.fetch) ? this.fetch(fetchOptions) : this.fetch(getBaseURL(host) + path, fetchOptions))
      .then((res) => parseResponse(res));
  }

  /**
   * Checks if a token is needed, can be refreshed and if the token is expired.
   * If so, attempts to refresh access token
   * @returns {Promise<*>}
   */
  checkAndRefreshAccessToken() {
    const canRefresh = this.getRefreshToken() && this.getClientId();
    const needsRefresh = this.getAccessTokenExpiresAt()
      && (new Date(Date.now() + TokenExpirationBuffer)) >= this.getAccessTokenExpiresAt();
    const needsToken = !this.getAccessToken();
    if ((needsRefresh || needsToken) && canRefresh) {
      return this.refreshAccessToken();
    }
    return Promise.resolve();
  }

  /**
   * Refreshes the access token using the refresh token, if available
   * @arg {Array<String>} scope - a subset of scopes from the original
   * refresh to acquire with an access token
   * @returns {Promise<*>}
   */
  refreshAccessToken(scope = null) {
    let refreshUrl = BaseTokenUrl;
    const clientId = this.getClientId();
    const clientSecret = this.getClientSecret();

    if (!clientId) {
      throw new Error('A client id is required. You can set the client id using .setClientId().');
    }
    if (scope && !(scope instanceof Array)) {
      throw new Error('Scope must be an array of strings');
    }

    const headers = {};
    headers['Content-Type'] = 'application/json';
    refreshUrl += `?grant_type=refresh_token&refresh_token=${this.getRefreshToken()}`;
    refreshUrl += `&client_id=${clientId}`;
    if (clientSecret) {
      refreshUrl += `&client_secret=${clientSecret}`;
    }
    if (scope) {
      refreshUrl += `&scope=${scope.join(' ')}`;
    }
    const fetchOptions = {
      method: 'POST',
    };

    if(isAxios(this.fetch)){
      fetchOptions.url = getBaseURL(host) + path;
    }

    fetchOptions.headers = headers;

    return (isAxios(this.fetch) ? this.fetch(fetchOptions) : this.fetch(getBaseURL(host) + path, fetchOptions))
      .then((res) => parseResponse(res))
      .then((res) => {
        this.setAccessToken(res.result.access_token);
        this.setAccessTokenExpiresAt(getTokenExpiresAtDate(res.result.expires_in));
      });
  }

  /**
   * An authentication process that works with cordova applications.
   * @param {successCallback} successCallback
   * @param {errorCallback} errorCallback
   */
  authenticateWithCordova(successCallback, errorCallback) {
    const redirectUrl = 'https://www.dropbox.com/1/oauth2/redirect_receiver';
    const url = this.getAuthenticationUrl(redirectUrl);

    let removed = false;
    const browser = window.open(url, '_blank');

    function onLoadError(event) {
      if (event.code !== -999) { // Workaround to fix wrong behavior on cordova-plugin-inappbrowser
        // Try to avoid a browser crash on browser.close().
        window.setTimeout(() => { browser.close(); }, 10);
        errorCallback();
      }
    }

    function onLoadStop(event) {
      const errorLabel = '&error=';
      const errorIndex = event.url.indexOf(errorLabel);

      if (errorIndex > -1) {
        // Try to avoid a browser crash on browser.close().
        window.setTimeout(() => { browser.close(); }, 10);
        errorCallback();
      } else {
        const tokenLabel = '#access_token=';
        let tokenIndex = event.url.indexOf(tokenLabel);
        const tokenTypeIndex = event.url.indexOf('&token_type=');
        if (tokenIndex > -1) {
          tokenIndex += tokenLabel.length;
          // Try to avoid a browser crash on browser.close().
          window.setTimeout(() => { browser.close(); }, 10);

          const accessToken = event.url.substring(tokenIndex, tokenTypeIndex);
          successCallback(accessToken);
        }
      }
    }

    function onExit() {
      if (removed) {
        return;
      }
      browser.removeEventListener('loaderror', onLoadError);
      browser.removeEventListener('loadstop', onLoadStop);
      browser.removeEventListener('exit', onExit);
      removed = true;
    }

    browser.addEventListener('loaderror', onLoadError);
    browser.addEventListener('loadstop', onLoadStop);
    browser.addEventListener('exit', onExit);
  }
}