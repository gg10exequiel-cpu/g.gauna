
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

const TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

type AuthResponse = {
  access_token?: string;
  refresh_token?: string;
  accessToken?: string;
  refreshToken?: string;
  token_type?: string;
  data?: AuthResponse;
};

export type AuthUser = {
  id: string;
  email: string;
  role: string;
};

function getBaseUrl(): string {
  if (!BASE_URL) {
    throw new Error('Falta configurar EXPO_PUBLIC_API_URL en .env');
  }

  return BASE_URL.replace(/\/$/, '');
}

async function readError(response: Response): Promise<string> {
  const data = await response.json().catch(() => null);

  return (
    data?.error?.message ??
    data?.msg ??
    data?.detail ??
    data?.message ??
    `Error HTTP ${response.status}`
  );
}

function extractTokens(response: AuthResponse) {
  const data = response.data ?? response;

  return {
    accessToken: data.access_token ?? data.accessToken,
    refreshToken: data.refresh_token ?? data.refreshToken,
  };
}

export async function register(
  email: string,
  password: string
): Promise<void> {
  const response = await fetch(
    `${getBaseUrl()}/api/v1/auth/signup`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    }
  );

  if (!response.ok) {
    throw new Error(await readError(response));
  }
}

export async function login(
  email: string,
  password: string
): Promise<void> {
  const response = await fetch(
    `${getBaseUrl()}/api/v1/auth/login`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    }
  );

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  const result: AuthResponse = await response.json();
  const tokens = extractTokens(result);

  if (!tokens.accessToken) {
    throw new Error('El servidor no devolvió un token de acceso.');
  }

  await AsyncStorage.setItem(TOKEN_KEY, tokens.accessToken);

  if (tokens.refreshToken) {
    await AsyncStorage.setItem(
      REFRESH_TOKEN_KEY,
      tokens.refreshToken
    );
  } else {
    await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

export async function getAccessToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function refreshAccessToken(): Promise<string> {
  const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);

  if (!refreshToken) {
    throw new Error(
      'No hay un refresh token guardado. Iniciá sesión nuevamente.'
    );
  }

  const response = await fetch(
    `${getBaseUrl()}/api/v1/auth/refresh`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refresh_token: refreshToken,
      }),
    }
  );

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      await AsyncStorage.multiRemove([
        TOKEN_KEY,
        REFRESH_TOKEN_KEY,
      ]);
    }

    throw new Error(await readError(response));
  }

  const result: AuthResponse = await response.json();
  const tokens = extractTokens(result);

  if (!tokens.accessToken) {
    throw new Error(
      'La respuesta de renovación no contiene un access token.'
    );
  }

  await AsyncStorage.setItem(TOKEN_KEY, tokens.accessToken);

  if (tokens.refreshToken) {
    await AsyncStorage.setItem(
      REFRESH_TOKEN_KEY,
      tokens.refreshToken
    );
  }

  return tokens.accessToken;
}

export async function getCurrentUser(): Promise<AuthUser> {
  const token = await getAccessToken();

  if (!token) {
    throw new Error('No hay una sesión iniciada.');
  }

  const response = await fetch(
    `${getBaseUrl()}/api/v1/auth/me`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  const result = await response.json();
  return (result.user ?? result.data?.user ?? result.data ?? result) as AuthUser;
}

export async function logout(): Promise<void> {
  const token = await getAccessToken();

  try {
    if (token) {
      const response = await fetch(
        `${getBaseUrl()}/api/v1/auth/logout`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok && response.status !== 401) {
        throw new Error(await readError(response));
      }
    }
  } finally {
    await AsyncStorage.multiRemove([
      TOKEN_KEY,
      REFRESH_TOKEN_KEY,
    ]);
  }
}
