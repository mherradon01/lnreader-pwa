/**
 * Web implementation for @react-native-google-signin/google-signin
 * Uses Google Identity Services (GIS) for OAuth2 authentication
 */

// Google Identity Services client ID - you need to create this in Google Cloud Console
// https://console.cloud.google.com/apis/credentials
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';

// Storage keys
const STORAGE_KEY_USER = 'google_signin_user';
const STORAGE_KEY_TOKENS = 'google_signin_tokens';

export interface GoogleUser {
  id: string;
  name: string | null;
  email: string;
  photo: string | null;
  familyName: string | null;
  givenName: string | null;
}

export interface User {
  user: GoogleUser;
  idToken: string | null;
  serverAuthCode: string | null;
}

export interface SignInResponse {
  type: 'success' | 'cancelled';
  data: User | null;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

interface StoredTokens {
  accessToken: string;
  idToken: string | null;
  expiresAt: number;
  scopes?: string[];
}

let configuredScopes: string[] = [];
let tokenClient: any = null;
let accessToken: string | null = null;
let tokenExpiresAt: number = 0;
let grantedScopes: string[] = [];

// Check if all required scopes are granted
const hasRequiredScopes = (granted: string[], required: string[]): boolean => {
  return required.every(scope => granted.includes(scope));
};

// Load stored tokens on init
const loadStoredTokens = (): StoredTokens | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_TOKENS);
    if (stored) {
      const tokens = JSON.parse(stored) as StoredTokens;
      if (tokens.expiresAt > Date.now()) {
        accessToken = tokens.accessToken;
        tokenExpiresAt = tokens.expiresAt;
        grantedScopes = tokens.scopes || [];
        return tokens;
      }
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to load stored tokens:', e);
  }
  return null;
};

// Save tokens
const saveTokens = (tokens: StoredTokens) => {
  try {
    localStorage.setItem(STORAGE_KEY_TOKENS, JSON.stringify(tokens));
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to save tokens:', e);
  }
};

// Clear tokens
const clearTokens = () => {
  localStorage.removeItem(STORAGE_KEY_TOKENS);
  localStorage.removeItem(STORAGE_KEY_USER);
  accessToken = null;
  tokenExpiresAt = 0;
};

// Load user from storage
const loadStoredUser = (): User | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_USER);
    if (stored) {
      return JSON.parse(stored) as User;
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to load stored user:', e);
  }
  return null;
};

// Save user
const saveUser = (user: User) => {
  try {
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to save user:', e);
  }
};

// Initialize on load
loadStoredTokens();

// Wait for Google Identity Services to load
const waitForGIS = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if ((window as any).google?.accounts?.oauth2) {
      resolve();
      return;
    }

    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max
    const checkInterval = setInterval(() => {
      attempts++;
      if ((window as any).google?.accounts?.oauth2) {
        clearInterval(checkInterval);
        resolve();
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        reject(new Error('Google Identity Services failed to load'));
      }
    }, 100);
  });
};

// Fetch user info from Google
const fetchUserInfo = async (token: string): Promise<GoogleUser> => {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch user info');
  }
  
  const data = await response.json();
  return {
    id: data.id,
    name: data.name || null,
    email: data.email,
    photo: data.picture || null,
    familyName: data.family_name || null,
    givenName: data.given_name || null,
  };
};

export const GoogleSignin = {
  configure: (options: { scopes?: string[]; webClientId?: string }) => {
    configuredScopes = options.scopes || [];
    // Load any stored tokens after configuration
    loadStoredTokens();
  },

  hasPlayServices: async (): Promise<boolean> => {
    // On web, we don't need Play Services
    // Just check if GIS is available
    try {
      await waitForGIS();
      return true;
    } catch {
      return false;
    }
  },

  signIn: async (): Promise<SignInResponse> => {
    if (!GOOGLE_CLIENT_ID) {
      throw new Error('GOOGLE_CLIENT_ID is not configured. Please set the environment variable.');
    }
    
    await waitForGIS();

    // Get all required scopes
    const allScopes = [
      'https://www.googleapis.com/auth/userinfo.profile', 
      'https://www.googleapis.com/auth/userinfo.email',
      ...configuredScopes
    ];

    return new Promise((resolve, reject) => {
      const google = (window as any).google;
      
      // Always create a new token client to ensure we have the latest scopes
      // Reset tokenClient if scopes have changed
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: allScopes.join(' '),
        callback: async (response: TokenResponse & { scope?: string }) => {
          if (response.access_token) {
            accessToken = response.access_token;
            tokenExpiresAt = Date.now() + (response.expires_in * 1000);
            
            // Parse granted scopes from response
            const scopesGranted = response.scope ? response.scope.split(' ') : allScopes;
            grantedScopes = scopesGranted;
            
            try {
              const userInfo = await fetchUserInfo(response.access_token);
              const user: User = {
                user: userInfo,
                idToken: null,
                serverAuthCode: null,
              };
              
              // Save to storage with scopes
              saveTokens({
                accessToken: response.access_token,
                idToken: null,
                expiresAt: tokenExpiresAt,
                scopes: scopesGranted,
              });
              saveUser(user);
              
              resolve({
                type: 'success',
                data: user,
              });
            } catch (error) {
              reject(error);
            }
          } else {
            resolve({
              type: 'cancelled',
              data: null,
            });
          }
        },
        error_callback: (error: any) => {
          // eslint-disable-next-line no-console
          console.error('Google Sign-In error:', error);
          resolve({
            type: 'cancelled',
            data: null,
          });
        },
      });

      // Request access token
      tokenClient.requestAccessToken({ prompt: 'consent' });
    });
  },

  signInSilently: async (): Promise<User | null> => {
    // Check if we have stored tokens that are still valid
    const storedTokens = loadStoredTokens();
    if (storedTokens && storedTokens.expiresAt > Date.now()) {
      const storedUser = loadStoredUser();
      if (storedUser) {
        return storedUser;
      }
      // If we have tokens but no user, try to fetch user info
      try {
        const userInfo = await fetchUserInfo(storedTokens.accessToken);
        const user: User = {
          user: userInfo,
          idToken: storedTokens.idToken,
          serverAuthCode: null,
        };
        saveUser(user);
        return user;
      } catch {
        clearTokens();
        return null;
      }
    }
    return null;
  },

  signOut: async (): Promise<null> => {
    await waitForGIS();
    
    const google = (window as any).google;
    
    if (accessToken) {
      google.accounts.oauth2.revoke(accessToken, () => {
        // Token revoked successfully
      });
    }
    
    clearTokens();
    accessToken = null;
    tokenExpiresAt = 0;
    tokenClient = null;
    
    return null;
  },

  revokeAccess: async (): Promise<null> => {
    return GoogleSignin.signOut();
  },

  hasPreviousSignIn: (): boolean => {
    const storedTokens = loadStoredTokens();
    if (!storedTokens || storedTokens.expiresAt <= Date.now()) {
      return false;
    }
    // Also check if we have the required scopes
    const requiredScopes = [
      'https://www.googleapis.com/auth/userinfo.profile', 
      'https://www.googleapis.com/auth/userinfo.email',
      ...configuredScopes
    ];
    return hasRequiredScopes(storedTokens.scopes || [], requiredScopes);
  },

  getCurrentUser: (): User | null => {
    if (!accessToken || tokenExpiresAt < Date.now()) {
      return null;
    }
    return loadStoredUser();
  },

  getTokens: async (): Promise<{ accessToken: string; idToken: string | null }> => {
    // Get all required scopes
    const allScopes = [
      'https://www.googleapis.com/auth/userinfo.profile', 
      'https://www.googleapis.com/auth/userinfo.email',
      ...configuredScopes
    ];
    
    // Check if current token is still valid AND has all required scopes
    if (accessToken && tokenExpiresAt > Date.now() && hasRequiredScopes(grantedScopes, allScopes)) {
      return {
        accessToken,
        idToken: null,
      };
    }
    
    // Token expired or missing scopes, need to re-authenticate
    await waitForGIS();

    return new Promise((resolve, reject) => {
      const google = (window as any).google;
      
      // Create token client with all required scopes
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: allScopes.join(' '),
        callback: async (response: TokenResponse & { scope?: string }) => {
          if (response.access_token) {
            accessToken = response.access_token;
            tokenExpiresAt = Date.now() + (response.expires_in * 1000);
            
            // Parse granted scopes from response
            const scopesGranted = response.scope ? response.scope.split(' ') : allScopes;
            grantedScopes = scopesGranted;
            
            saveTokens({
              accessToken: response.access_token,
              idToken: null,
              expiresAt: tokenExpiresAt,
              scopes: scopesGranted,
            });
            
            resolve({
              accessToken: response.access_token,
              idToken: null,
            });
          } else {
            reject(new Error('Failed to get access token'));
          }
        },
        error_callback: (error: any) => {
          reject(new Error(`Google Sign-In error: ${error.type}`));
        },
      });

      // Request with consent to ensure we get all scopes
      tokenClient.requestAccessToken({ prompt: 'consent' });
    });
  },

  clearCachedAccessToken: async (): Promise<null> => {
    accessToken = null;
    const storedTokens = loadStoredTokens();
    if (storedTokens) {
      saveTokens({
        ...storedTokens,
        accessToken: '',
      });
    }
    return null;
  },

  isSignedIn: (): boolean => {
    return accessToken !== null && tokenExpiresAt > Date.now();
  },
};

// Also export as default for compatibility
export default GoogleSignin;

// Export User type for TypeScript compatibility
export type { User as GoogleSignInUser };
