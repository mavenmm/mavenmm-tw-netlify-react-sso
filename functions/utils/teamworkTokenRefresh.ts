import axios from 'axios';
import { logger } from './logger';

/**
 * Teamwork Token Refresh Utility
 *
 * Handles refreshing expired Teamwork OAuth access tokens using the refresh token.
 * Teamwork access tokens expire after ~1 hour, so this is needed for long-lived sessions.
 */

export interface TeamworkTokenRefreshResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  error?: string;
}

/**
 * Refresh a Teamwork access token using the refresh token
 *
 * @param teamworkRefreshToken - The Teamwork OAuth refresh token
 * @returns New access token and optionally new refresh token
 */
export async function refreshTeamworkToken(
  teamworkRefreshToken: string
): Promise<TeamworkTokenRefreshResult> {
  const clientId = process.env.VITE_CLIENT_ID;
  const clientSecret = process.env.VITE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    logger.error('Missing Teamwork OAuth credentials for token refresh');
    return {
      success: false,
      error: 'Server configuration error: missing OAuth credentials',
    };
  }

  try {
    logger.debug('Attempting to refresh Teamwork access token');

    const response = await axios.post(
      'https://www.teamwork.com/launchpad/v1/token.json',
      {
        grant_type: 'refresh_token',
        refresh_token: teamworkRefreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = response.data;

    if (!data?.access_token) {
      logger.warn('Teamwork token refresh response missing access_token');
      return {
        success: false,
        error: 'Invalid response from Teamwork: missing access_token',
      };
    }

    logger.info('Teamwork access token refreshed successfully');

    return {
      success: true,
      accessToken: data.access_token,
      // Teamwork may return a new refresh token (token rotation)
      refreshToken: data.refresh_token,
    };
  } catch (error: any) {
    const status = error.response?.status;
    const errorMessage = error.response?.data?.error || error.message;

    logger.error('Failed to refresh Teamwork token', {
      status,
      error: errorMessage,
    });

    // Handle specific error cases
    if (status === 401 || status === 400) {
      return {
        success: false,
        error: 'Teamwork refresh token is invalid or expired. User must re-login.',
      };
    }

    return {
      success: false,
      error: `Failed to refresh Teamwork token: ${errorMessage}`,
    };
  }
}
