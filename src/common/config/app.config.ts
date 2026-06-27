import * as process from 'node:process';
import { MissingEnvError } from './missing-env-error.config';

export const appConfig = {
  postgres_url: validateEnv('POSTGRES_URL'),

  postgres_user: validateEnv('POSTGRES_USER'),
  postgres_password: ***ENTFERNT***
  postgres_db: validateEnv('POSTGRES_DB'),
  postgres_port: validateEnv('POSTGRES_PORT'),

  backend_port: validateEnv('BACKEND_PORT'),

  keycloak_url: validateEnv('KEYCLOAK_URL'),
  keycloak_realm: validateEnv('KEYCLOAK_REALM'),
  keycloak_client_id: validateEnv('KEYCLOAK_CLIENT_ID'),
  keycloak_client_secret: ***ENTFERNT***
  keycloak_callback_url: validateEnv('KEYCLOAK_CALLBACK_URL'),
  session_secret: ***ENTFERNT***

  after_login_redirect_url: validateEnv('AFTER_LOGIN_REDIRECT_URL'),

  redis_url: validateEnv('REDIS_URL'),

  dice_service_url: validateEnv('DICE_SERVICE_URL'),

  quiz_service_url: validateEnv('QUIZ_SERVICE_URL'),

  node_env: validateEnv('NODE_ENV'),
};

function validateEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new MissingEnvError(`Missing required env variable: ${key}`);
  }
  return value;
}
