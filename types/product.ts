export type Product = {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  price: string;
  stock: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type ProductsResponse = {
  data: Product[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
};

export type ProductInput = {
  name: string;
  description?: string;
  price: number;
  stock?: number;
  active?: boolean;
};