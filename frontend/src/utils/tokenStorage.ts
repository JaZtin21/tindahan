/**
 * Secure Token Storage
 *
 * Access token: Stored in memory (via React state)
 * Refresh token: Stored in httpOnly secure same-site cookie (set by backend)
 *
 * This approach ensures security best practices with httpOnly cookies
 * that cannot be accessed by JavaScript.
 */

// Token Storage API
export const TokenStorage = {
  /**
   * Store access token in memory (via callback)
   * This returns a setter function that should be used by the auth context
   */
  createAccessTokenStorage: () => {
    let accessToken = '';

    return {
      set: (token: string) => {
        accessToken = token;
      },
      get: () => accessToken,
      clear: () => {
        accessToken = '';
      },
    };
  },
};

export default TokenStorage;
