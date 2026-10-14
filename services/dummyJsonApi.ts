
import {
  getAccessToken,
  refreshAccessToken,
} from './authApi';

import type {
  Product,
  ProductsResponse,
  ProductInput,
} from '../types/product';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

function getBaseUrl(): string {
  if (!BASE_URL) {
    throw new Error(
      'Falta configurar EXPO_PUBLIC_API_URL en .env'
    );
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

async function sendRequest<T>(
  path: string,
  options: RequestInit,
  token: string | null
): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else {
    delete headers.Authorization;
  }

  return fetch(`${getBaseUrl()}${path}`, {
    ...options,
    headers,
  });
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAccessToken();

  // Primer intento con el token guardado.
  let response = await sendRequest(path, options, token);

  // Si el token venció, intentamos renovarlo una sola vez.
  if (response.status === 401 && token) {
    try {
      const newToken = await refreshAccessToken();

      response = await sendRequest(path, options, newToken);
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : 'No se pudo renovar la sesión. Iniciá sesión nuevamente.'
      );
    }
  }

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

// LISTAR PRODUCTOS
export async function getProducts(
  page = 1,
  limit = 12
): Promise<Product[]> {
  const result = await request<ProductsResponse>(
    `/api/v1/products?page=${page}&limit=${limit}`
  );

  return result.data;
}

// CREAR PRODUCTO
export async function createProduct(
  product: ProductInput
): Promise<Product> {
  return request<Product>('/api/v1/products', {
    method: 'POST',
    body: JSON.stringify(product),
  });
}

// EDITAR PRODUCTO
export async function updateProduct(
  id: string,
  product: Partial<ProductInput>
): Promise<Product> {
  return request<Product>(`/api/v1/products/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(product),
  });
}

// ELIMINAR PRODUCTO
export async function deleteProduct(
  id: string
): Promise<void> {
  await request<void>(`/api/v1/products/${id}`, {
    method: 'DELETE',
  });
}
