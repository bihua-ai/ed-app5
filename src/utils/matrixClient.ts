import { createClient, MatrixClient } from 'matrix-js-sdk';
import { MATRIX_CONFIG } from '../config/api';

export class MatrixClientUtil {
  private static client: MatrixClient | null = null;
  private static syncPromise: Promise<void> | null = null;
  private static accessToken: string | null = null;

  static getDefaultRoomId() {
    return MATRIX_CONFIG.defaultRoomId;
  }

  static async initialize() {
    if (!this.client) {
      if (!this.accessToken) {
        // Create temporary client for login
        const tempClient = createClient({
          baseUrl: MATRIX_CONFIG.homeserverUrl
        });

        try {
          const loginResponse = await tempClient.login('m.login.password', {
            user: MATRIX_CONFIG.userId,
            password: MATRIX_CONFIG.password,
            device_id: 'BIHUA_WEB_CLIENT',
          });

          this.accessToken = loginResponse.access_token;
        } catch (error) {
          console.error('Login failed:', error);
          throw new Error('Failed to authenticate with Matrix server');
        } finally {
          tempClient.stopClient();
        }
      }

      // Create actual client with access token
      this.client = createClient({
        baseUrl: MATRIX_CONFIG.homeserverUrl,
        accessToken: this.accessToken,
        userId: MATRIX_CONFIG.userId,
        deviceId: 'BIHUA_WEB_CLIENT',
        timelineSupport: true,
      });

      // Start client if not already started
      if (!this.client.clientRunning) {
        this.syncPromise = new Promise((resolve) => {
          if (!this.client) return;

          const handleSync = (state: string) => {
            if (state === 'PREPARED') {
              this.client?.removeListener('sync', handleSync);
              resolve();
            }
          };

          this.client.on('sync', handleSync);
          this.client.startClient({ initialSyncLimit: 10 });
        });

        try {
          await this.syncPromise;
        } catch (error) {
          console.error('Sync failed:', error);
          throw new Error('Failed to sync with Matrix server');
        }
      }
    }

    return this.client;
  }

  static async getProfileInfo(userId: string) {
    try {
      const client = await this.initialize();
      return await client.getProfileInfo(userId);
    } catch (error) {
      console.error('Failed to get profile info:', error);
      throw error;
    }
  }

  static async sendMessage(message: string) {
    try {
      const client = await this.initialize();
      
      // Ensure we're synced before sending
      if (this.syncPromise) {
        await this.syncPromise;
      }

      await client.sendTextMessage(this.getDefaultRoomId(), message);
    } catch (error) {
      console.error('Failed to send Matrix message:', error);
      throw new Error('Failed to send message to Matrix room');
    }
  }

  static cleanup() {
    if (this.client) {
      this.client.stopClient();
      this.client.removeAllListeners();
      this.client = null;
    }
    this.syncPromise = null;
  }

  static getAccessToken() {
    return this.accessToken;
  }
}