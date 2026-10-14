import {
  SafeAreaView,
  StyleSheet,
  Text,
} from 'react-native';

import ProductList from '../components/ProductList';

export default function ProductsScreen() {
  return (
    <SafeAreaView style={styles.container}>

      <Text style={styles.heading}>
        Productos
      </Text>

      <ProductList />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },

  heading: {
    fontSize: 24,
    fontWeight: '800',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    color: '#16332E',
  },
});