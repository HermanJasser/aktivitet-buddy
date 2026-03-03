import 'react-native-url-polyfill/auto';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, ActivityIndicator, View, StyleSheet } from 'react-native';

import { useAuth } from './hooks/useAuth';
import LoginScreen from './screens/auth/login';
import RegisterScreen from './screens/auth/register';
import MapScreen from './screens/tabs/map';
import ActivitiesScreen from './screens/tabs/activities';
import ProfileScreen from './screens/tabs/profile';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ name, focused }) {
  const icons = { Kart: '🗺️', Aktiviteter: '🏃', Profil: '👤' };
  return <Text style={{ fontSize: focused ? 22 : 18 }}>{icons[name]}</Text>;
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
        tabBarActiveTintColor: '#1a73e8',
        tabBarInactiveTintColor: '#aaa',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Kart" component={MapScreen} />
      <Tab.Screen name="Aktiviteter" component={ActivitiesScreen} />
      <Tab.Screen name="Profil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#1a73e8" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {session ? <MainTabs /> : <AuthStack />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
});
