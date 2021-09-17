import fse from 'fs-extra';
import { requireEnv } from './utils';

export const config = {
  port: requireEnv('PORT'),
  mongodbUrl: 'mongodb://mongodb:27017/board-camera',
  storagePath: '/data/images',
  baseUrl: requireEnv('BASE_URL'),
};

export interface GoogleKeys {
  web: {
    'client_id': string,
    'project_id': string,
    'auth_uri': string,
    'token_uri': string,
    'auth_provider_x509_cert_url': string,
    'client_secret': string,
    'redirect_uris': string[];
  }
}

export function getGoogleKeys(): Promise<GoogleKeys> {
  return fse.readJSON('/run/secrets/google-keys');
}
