import { db } from './db';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || '';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';

export interface GoogleUser {
    name: string;
    email: string;
    picture: string;
}

export class GoogleDriveService {
    private tokenClient: any;
    // private gapiInited = false;
    private gisInited = false;
    private accessToken: string | null = null;

    constructor() {
        this.loadScripts();
    }

    private loadScripts() {
        // Scripts are loaded in index.html, we just need to wait for them
        const checkGapi = setInterval(() => {
            if (typeof window.gapi !== 'undefined') {
                this.gapiLoaded();
                clearInterval(checkGapi);
            }
        }, 100);

        const checkGis = setInterval(() => {
            if (typeof window.google !== 'undefined') {
                this.gisLoaded();
                clearInterval(checkGis);
            }
        }, 100);
    }

    private async gapiLoaded() {
        window.gapi.load('client', async () => {
            await window.gapi.client.init({
                apiKey: API_KEY,
                discoveryDocs: [DISCOVERY_DOC],
            });
            // this.gapiInited = true;
        });
    }

    private gisLoaded() {
        this.tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: (resp: any) => {
                if (resp.error !== undefined) {
                    throw (resp);
                }
                this.accessToken = resp.access_token;
            },
        });
        this.gisInited = true;
    }

    public async signIn(): Promise<string> {
        return new Promise((resolve, reject) => {
            if (!this.gisInited) {
                reject('Google Identity Services not initialized');
                return;
            }

            this.tokenClient.callback = (resp: any) => {
                if (resp.error !== undefined) {
                    reject(resp);
                }
                this.accessToken = resp.access_token;
                resolve(resp.access_token);
            };

            if (window.gapi.client.getToken() === null) {
                this.tokenClient.requestAccessToken({ prompt: 'consent' });
            } else {
                this.tokenClient.requestAccessToken({ prompt: '' });
            }
        });
    }

    public signOut() {
        const token = window.gapi.client.getToken();
        if (token !== null) {
            window.google.accounts.oauth2.revoke(token.access_token);
            window.gapi.client.setToken(null);
            this.accessToken = null;
        }
    }

    public async getUserProfile(): Promise<GoogleUser> {
        // This requires the 'profile' scope or 'https://www.googleapis.com/auth/userinfo.profile'
        // For now, we might just use the drive info or request profile scope if needed.
        // But to keep scopes minimal (drive.file), we might not get full profile.
        // Let's assume we add 'https://www.googleapis.com/auth/userinfo.profile' to scopes if we want this.
        // For now, let's just return a placeholder or fetch from a simple endpoint if scope allows.

        // Actually, let's use the People API or OIDC if we want profile. 
        // To keep it simple and stick to drive.file, we might just rely on the user knowing they are logged in.
        // But usually, we want to show the name.
        // Let's add 'openid profile email' to scopes for better UX.

        // Updating scopes locally for this method:
        // Note: The token request above uses the SCOPES constant. We should update that constant if we want profile.

        try {
            const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: {
                    Authorization: `Bearer ${this.accessToken}`
                }
            });
            return await response.json();
        } catch (e) {
            console.error("Error fetching profile", e);
            return { name: 'User', email: '', picture: '' };
        }
    }

    public async uploadBackup() {
        if (!this.accessToken) throw new Error("Not authenticated");

        const data = await db.exportDatabase();
        const fileContent = JSON.stringify(data);
        const file = new Blob([fileContent], { type: 'application/json' });
        const metadata = {
            name: 'lekha_backup.json',
            mimeType: 'application/json',
            // parents: ['appDataFolder'] // Optional: use appDataFolder to hide from user, but drive.file scope allows root too if created by app
        };

        // Check if file exists to update it
        const existingFileId = await this.findBackupFileId();

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', file);

        let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
        let method = 'POST';

        if (existingFileId) {
            url = `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`;
            method = 'PATCH';
        }

        const response = await fetch(url, {
            method: method,
            headers: {
                Authorization: `Bearer ${this.accessToken}`
            },
            body: form
        });

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
        }

        return await response.json();
    }

    public async downloadBackup() {
        if (!this.accessToken) throw new Error("Not authenticated");

        const fileId = await this.findBackupFileId();
        if (!fileId) throw new Error("Backup file not found");

        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
            headers: {
                Authorization: `Bearer ${this.accessToken}`
            }
        });

        if (!response.ok) {
            throw new Error(`Download failed: ${response.statusText}`);
        }

        const data = await response.json();
        await db.importDatabase(data);
        return data;
    }

    private async findBackupFileId(): Promise<string | null> {
        const q = "name = 'lekha_backup.json' and trashed = false";
        const response = await window.gapi.client.drive.files.list({
            q: q,
            fields: 'files(id, name)',
            spaces: 'drive'
        });

        const files = response.result.files;
        if (files && files.length > 0) {
            return files[0].id;
        }
        return null;
    }
}

export const googleDriveService = new GoogleDriveService();
