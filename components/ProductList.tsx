
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  createProduct,
  deleteProduct,
  getProducts,
  updateProduct,
} from '../services/dummyJsonApi';

import type { Product, ProductInput } from '../types/product';

type FilterStatus = 'todos' | 'activos' | 'inactivos';

function normalizeProduct(value: unknown): Product | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const item = value as Record<string, unknown>;

  // Si el backend devuelve el producto dentro de una propiedad,
  // intentamos obtener el objeto real.
  const nested =
    item.data && typeof item.data === 'object'
      ? (item.data as Record<string, unknown>)
      : item;

  const id = nested.id;

  // No podemos editar ni eliminar correctamente un producto sin ID.
  if (id === undefined || id === null || String(id).trim() === '') {
    return null;
  }

  const rawName =
    nested.name ??
    nested.nombre ??
    nested.title ??
    '';

  const rawPrice = nested.price ?? nested.precio ?? 0;
  const rawStock = nested.stock ?? 0;

  return {
    id: String(id),
    owner_id: String(nested.owner_id ?? ''),
    name: String(rawName),
    description:
      nested.description == null && nested.descripcion == null
        ? null
        : String(nested.description ?? nested.descripcion),
    price: String(rawPrice),
    stock: Number.isFinite(Number(rawStock))
      ? Number(rawStock)
      : 0,
    active:
      typeof nested.active === 'boolean'
        ? nested.active
        : typeof nested.activo === 'boolean'
          ? nested.activo
          : true,
    created_at: String(nested.created_at ?? ''),
    updated_at: String(nested.updated_at ?? ''),
  };
}

export default function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('0');
  const [description, setDescription] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] =
    useState<FilterStatus>('todos');

  async function loadProducts() {
    try {
      setLoading(true);
      setError('');

      const data = await getProducts(1, 50);

      if (!Array.isArray(data)) {
        throw new Error(
          'El servidor devolvió una respuesta de productos con formato inesperado.'
        );
      }

      const normalized = data
        .map(normalizeProduct)
        .filter((product): product is Product => product !== null);

      setProducts(normalized);

      if (normalized.length !== data.length) {
        setError(
          'Algunos productos recibidos no tienen un ID válido y no se muestran.'
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudieron cargar los productos.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return products.filter((product) => {
      const productName = String(product.name ?? '').toLowerCase();
      const matchesName = productName.includes(searchText);

      const matchesStatus =
        filterStatus === 'todos' ||
        (filterStatus === 'activos' && product.active === true) ||
        (filterStatus === 'inactivos' && product.active === false);

      return matchesName && matchesStatus;
    });
  }, [products, search, filterStatus]);

  function clearForm() {
    setName('');
    setPrice('');
    setStock('0');
    setDescription('');
    setEditingId(null);
  }

  function openNewProductForm() {
    clearForm();
    setError('');
    setShowForm(true);
  }

  async function handleSave() {
    const cleanName = name.trim();
    const cleanPrice = price.trim().replace(',', '.');
    const cleanStock = stock.trim();
    const cleanDescription = description.trim();

    if (cleanName.length < 2 || cleanName.length > 160) {
      Alert.alert(
        'Validación',
        'El nombre debe tener entre 2 y 160 caracteres.'
      );
      return;
    }

    if (!cleanPrice || !/^\d+(\.\d{1,2})?$/.test(cleanPrice)) {
      Alert.alert(
        'Validación',
        'Ingresá un precio válido con hasta dos decimales.'
      );
      return;
    }

    const numericPrice = Number(cleanPrice);
    const numericStock = Number(cleanStock);

    if (
      !Number.isFinite(numericPrice) ||
      numericPrice < 0 ||
      numericPrice > 9999999999
    ) {
      Alert.alert(
        'Validación',
        'El precio debe estar entre 0 y 9.999.999.999.'
      );
      return;
    }

    if (
      cleanStock === '' ||
      !Number.isInteger(numericStock) ||
      numericStock < 0
    ) {
      Alert.alert(
        'Validación',
        'El stock debe ser un número entero mayor o igual a cero.'
      );
      return;
    }

    if (cleanDescription.length > 5000) {
      Alert.alert(
        'Validación',
        'La descripción no puede superar los 5000 caracteres.'
      );
      return;
    }

    const existingProduct = products.find(
      (product) => product.id === editingId
    );

    const productData: ProductInput = {
      name: cleanName,
      price: numericPrice,
      stock: numericStock,
      active: existingProduct?.active ?? true,
    };

    if (cleanDescription) {
      productData.description = cleanDescription;
    }

    try {
      setSaving(true);
      setError('');

      if (editingId !== null) {
        const result = await updateProduct(editingId, productData);
        const updated = normalizeProduct(result);

        if (!updated) {
          await loadProducts();
        } else {
          setProducts((current) =>
            current.map((product) =>
              product.id === editingId ? updated : product
            )
          );
        }

        Alert.alert('Éxito', 'Producto actualizado correctamente.');
      } else {
        const result = await createProduct(productData);
        const created = normalizeProduct(result);

        if (created) {
          setProducts((current) => [
            created,
            ...current.filter((product) => product.id !== created.id),
          ]);
        } else {
          // Si el servidor no devuelve el producto creado en el formato
          // esperado, consultamos nuevamente la lista.
          await loadProducts();
        }

        Alert.alert('Éxito', 'Producto creado correctamente.');
      }

      clearForm();
      setShowForm(false);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo guardar el producto.';

      setError(message);
      Alert.alert('Error', message);
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(product: Product) {
    setEditingId(product.id);
    setName(product.name ?? '');
    setPrice(String(product.price ?? ''));
    setStock(String(product.stock ?? 0));
    setDescription(product.description ?? '');
    setError('');
    setShowForm(true);
  }

  function handleDelete(product: Product) {
    if (deletingId !== null || saving) {
      return;
    }

    Alert.alert(
      'Confirmar eliminación',
      `¿Seguro que querés eliminar "${product.name || 'este producto'}"? Esta acción no se puede deshacer.`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingId(product.id);
              setError('');

              await deleteProduct(product.id);

              setProducts((current) =>
                current.filter((item) => item.id !== product.id)
              );

              if (editingId === product.id) {
                clearForm();
                setShowForm(false);
              }

              Alert.alert(
                'Éxito',
                'Producto eliminado correctamente.'
              );
            } catch (err) {
              const message =
                err instanceof Error
                  ? err.message
                  : 'No se pudo eliminar el producto.';

              setError(message);
              Alert.alert('Error', message);
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#145F52" />
        <Text style={styles.loadingText}>
          Cargando productos...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error !== '' && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      <View style={styles.toolbar}>
        <Text style={styles.listTitle}>Productos</Text>

        <Pressable
          style={styles.addButton}
          onPress={openNewProductForm}
          disabled={saving || deletingId !== null}
        >
          <Text style={styles.buttonText}>+ Agregar</Text>
        </Pressable>
      </View>

      {showForm && (
        <View style={styles.form}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>
              {editingId !== null
                ? 'Editar producto'
                : 'Nuevo producto'}
            </Text>

            <Pressable
              onPress={() => {
                clearForm();
                setShowForm(false);
                setError('');
              }}
              disabled={saving}
            >
              <Text style={styles.closeText}>Cerrar ✕</Text>
            </Pressable>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Nombre del producto"
            placeholderTextColor="#9ca3af"
            value={name}
            onChangeText={setName}
            maxLength={160}
          />

          <View style={styles.compactRow}>
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Precio"
              placeholderTextColor="#9ca3af"
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
            />

            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Stock"
              placeholderTextColor="#9ca3af"
              value={stock}
              onChangeText={setStock}
              keyboardType="number-pad"
            />
          </View>

          <TextInput
            style={[styles.input, styles.descriptionInput]}
            placeholder="Descripción (opcional)"
            placeholderTextColor="#9ca3af"
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={5000}
          />

          <View style={styles.formButtons}>
            <Pressable
              style={[
                styles.saveButton,
                saving && styles.disabledButton,
              ]}
              onPress={handleSave}
              disabled={saving || deletingId !== null}
            >
              <Text style={styles.buttonText}>
                {saving
                  ? 'Guardando...'
                  : editingId !== null
                    ? 'Guardar cambios'
                    : 'Crear producto'}
              </Text>
            </Pressable>

            {editingId !== null && (
              <Pressable
                style={styles.cancelButton}
                onPress={() => {
                  clearForm();
                  setShowForm(false);
                }}
                disabled={saving}
              >
                <Text style={styles.cancelText}>
                  Cancelar edición
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      )}

      <TextInput
        style={styles.searchInput}
        placeholder="Buscar producto por nombre..."
        placeholderTextColor="#9ca3af"
        value={search}
        onChangeText={setSearch}
        autoCapitalize="none"
      />

      <View style={styles.filters}>
        {([
          { label: 'Todos', value: 'todos' },
          { label: 'Activos', value: 'activos' },
          { label: 'Inactivos', value: 'inactivos' },
        ] as const).map((filter) => (
          <Pressable
            key={filter.value}
            style={[
              styles.filterButton,
              filterStatus === filter.value &&
                styles.selectedFilter,
            ]}
            onPress={() => setFilterStatus(filter.value)}
          >
            <Text
              style={[
                styles.filterText,
                filterStatus === filter.value &&
                  styles.selectedFilterText,
              ]}
            >
              {filter.label}
            </Text>
          </Pressable>
        ))}

        <Pressable
          style={styles.refreshButton}
          onPress={loadProducts}
          disabled={saving || deletingId !== null}
        >
          <Text style={styles.refreshText}>↻ Actualizar</Text>
        </Pressable>
      </View>

      <Text style={styles.resultCount}>
        Mostrando {filteredProducts.length} de {products.length}{' '}
        productos
      </Text>

      <FlatList
        style={styles.productList}
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {products.length === 0
              ? 'Todavía no hay productos registrados.'
              : 'No se encontraron productos con esos filtros.'}
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.product}>
            <View style={styles.productInfo}>
              <Text style={styles.productName}>
                {item.name || 'Producto sin nombre'}
              </Text>

              <Text style={styles.productData}>
                Precio: ${item.price}
              </Text>

              <Text style={styles.productData}>
                Stock: {item.stock}
              </Text>

              {item.description ? (
                <Text style={styles.productData}>
                  {item.description}
                </Text>
              ) : null}

              <Text
                style={[
                  styles.productStatus,
                  !item.active && styles.inactiveStatus,
                ]}
              >
                {item.active ? '● Activo' : '● Inactivo'}
              </Text>
            </View>

            <View style={styles.actions}>
              <Pressable
                style={styles.editButton}
                onPress={() => handleEdit(item)}
                disabled={saving || deletingId !== null}
              >
                <Text style={styles.buttonText}>Editar</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.deleteButton,
                  deletingId === item.id &&
                    styles.disabledButton,
                ]}
                onPress={() => handleDelete(item)}
                disabled={saving || deletingId !== null}
              >
                <Text style={styles.buttonText}>
                  {deletingId === item.id
                    ? 'Eliminando...'
                    : 'Eliminar'}
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  listTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#16332E',
  },
  addButton: {
    backgroundColor: '#145F52',
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 8,
  },
  form: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#16332E',
  },
  closeText: {
    color: '#145F52',
    fontWeight: '700',
    padding: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 7,
    paddingHorizontal: 10,
    minHeight: 39,
    marginBottom: 8,
    backgroundColor: '#ffffff',
    color: '#111827',
  },
  compactRow: {
    flexDirection: 'row',
    gap: 8,
  },
  halfInput: {
    flex: 1,
  },
  descriptionInput: {
    minHeight: 55,
    paddingTop: 9,
    textAlignVertical: 'top',
  },
  formButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  saveButton: {
    backgroundColor: '#145F52',
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 7,
  },
  cancelButton: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 7,
  },
  disabledButton: {
    opacity: 0.55,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  cancelText: {
    color: '#374151',
    fontWeight: '700',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    minHeight: 40,
    marginBottom: 8,
    backgroundColor: '#ffffff',
    color: '#111827',
  },
  filters: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
  },
  selectedFilter: {
    backgroundColor: '#145F52',
    borderColor: '#145F52',
  },
  filterText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 12,
  },
  selectedFilterText: {
    color: '#ffffff',
  },
  refreshButton: {
    paddingVertical: 6,
    paddingHorizontal: 5,
  },
  refreshText: {
    color: '#145F52',
    fontWeight: '700',
    fontSize: 12,
  },
  resultCount: {
    color: '#6b7280',
    fontSize: 12,
    marginBottom: 6,
  },
  productList: {
    flex: 1,
  },
  list: {
    gap: 8,
    paddingBottom: 20,
    flexGrow: 1,
  },
  product: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 9,
    padding: 11,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  productInfo: {
    flex: 1,
    paddingRight: 8,
  },
  productName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
    color: '#16332E',
  },
  productData: {
    color: '#4b5563',
    fontSize: 13,
    marginBottom: 2,
  },
  productStatus: {
    color: '#145F52',
    fontWeight: '600',
    fontSize: 12,
    marginTop: 4,
  },
  inactiveStatus: {
    color: '#b91c1c',
  },
  actions: {
    justifyContent: 'center',
    gap: 6,
  },
  editButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
  },
  deleteButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 9,
    paddingVertical: 8,
    borderRadius: 6,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 15,
    color: '#4b5563',
  },
  errorText: {
    color: '#b91c1c',
    marginBottom: 8,
    fontSize: 13,
  },
  emptyText: {
    textAlign: 'center',
    padding: 20,
    color: '#6b7280',
  },
});
