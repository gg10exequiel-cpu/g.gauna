import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { logout, getCurrentUser } from '../services/authApi';
import { getGreeting } from '@/lib/greeting';
import {
  LogOut,
  Sun,
  Moon,
  Sunset,
  CheckCircle2,
  Sparkles,
  Package,
  ChevronRight,
} from 'lucide-react-native';

export default function HomeScreen() {
  const [userEmail, setUserEmail] = useState('');
  const [loadingUser, setLoadingUser] = useState(true);

  const greeting = getGreeting();
  const hour = new Date().getHours();
  const isMorning = hour >= 5 && hour < 12;
  const isAfternoon = hour >= 12 && hour < 20;
  const Icon = isMorning ? Sun : isAfternoon ? Sunset : Moon;

  useEffect(() => {
    async function loadUser() {
      try {
        setLoadingUser(true);

        const user = await getCurrentUser();

        setUserEmail(user.email);
      } catch (error) {
        console.error('Error al cargar el usuario:', error);
        setUserEmail('');
      } finally {
        setLoadingUser(false);
      }
    }

    loadUser();
  }, []);

  function handleLogout() {
    Alert.alert(
      'Cerrar sesión',
      '¿Querés cerrar tu sesión?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              console.error('Error al cerrar sesión:', error);
            } finally {
              router.replace('/');
            }
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F4F7F6]">
      <View className="flex-1 w-full max-w-[720px] self-center px-6 py-8">

        {/* Encabezado */}
        <View className="flex-row items-center justify-between mb-12">
          <View className="flex-row items-center">
            <View className="w-10 h-10 bg-[#145F52] rounded-xl items-center justify-center">
              <Text className="text-white text-lg font-bold">M</Text>
            </View>

            <Text className="text-[#16332E] text-base font-bold ml-3">
              MACEDO
            </Text>
          </View>

          <TouchableOpacity
            accessibilityLabel="Cerrar sesión"
            onPress={handleLogout}
            className="w-10 h-10 bg-white border border-[#DCE5E2] rounded-xl items-center justify-center"
          >
            <LogOut size={18} color="#60736E" />
          </TouchableOpacity>
        </View>

        {/* Bienvenida y usuario autenticado */}
        <View className="mb-10">
          <View className="w-14 h-14 bg-[#E0EFEB] rounded-2xl items-center justify-center mb-5">
            <Icon size={26} color="#145F52" />
          </View>

          <Text className="text-[#70817D] text-sm">
            {greeting}
          </Text>

          <Text className="text-[#16332E] text-[30px] leading-9 font-bold mt-1">
            ¡Bienvenido!
          </Text>

          {loadingUser ? (
            <View className="flex-row items-center mt-3">
              <ActivityIndicator size="small" color="#145F52" />
              <Text className="text-[#70817D] text-sm ml-2">
                Cargando usuario...
              </Text>
            </View>
          ) : userEmail ? (
            <Text className="text-[#70817D] text-sm mt-2">
              {userEmail}
            </Text>
          ) : (
            <Text className="text-[#70817D] text-sm mt-2">
              No se pudo cargar el correo del usuario.
            </Text>
          )}
        </View>

        {/* Mensaje de bienvenida */}
        <View className="bg-[#145F52] rounded-2xl p-6 mb-5">
          <View className="flex-row items-center mb-4">
            <CheckCircle2 size={21} color="#BCE4DA" />

            <Text className="text-white text-base font-bold ml-3">
              Todo está listo
            </Text>
          </View>

          <Text className="text-[#D6ECE7] text-sm leading-5">
            Iniciaste sesión correctamente. Desde acá podés acceder
            a las funciones de la aplicación.
          </Text>
        </View>

        {/* Acceso a productos */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/products')}
          className="bg-white border border-[#DCE5E2] rounded-2xl p-5 mb-5"
        >
          <View className="flex-row items-center">
            <View className="w-12 h-12 bg-[#E0EFEB] rounded-xl items-center justify-center mr-4">
              <Package size={23} color="#145F52" />
            </View>

            <View className="flex-1">
              <Text className="text-[#16332E] text-base font-bold">
                Productos
              </Text>

              <Text className="text-[#70817D] text-sm leading-5 mt-1">
                Ver, agregar, editar y eliminar productos.
              </Text>
            </View>

            <ChevronRight size={22} color="#145F52" />
          </View>
        </TouchableOpacity>

        {/* Tarjeta informativa */}
        <View className="bg-white border border-[#DCE5E2] rounded-2xl p-5">
          <View className="flex-row items-center">
            <View className="w-10 h-10 bg-[#FFF0EB] rounded-xl items-center justify-center mr-4">
              <Sparkles size={19} color="#D95D41" />
            </View>

            <View className="flex-1">
              <Text className="text-[#16332E] text-sm font-bold">
                Una experiencia más simple
              </Text>

              <Text className="text-[#70817D] text-xs leading-5 mt-1">
                Tu espacio personal ya está activo.
              </Text>
            </View>
          </View>
        </View>

      </View>
    </SafeAreaView>
  );
}