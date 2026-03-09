import 'react-native-url-polyfill/auto';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, ActivityIndicator, View, TouchableOpacity, StyleSheet } from 'react-native';

import { useAuth, AuthProvider } from './hooks/useAuth';
import LoginScreen from './screens/auth/login';
import RegisterScreen from './screens/auth/register';
import MapScreen from './screens/tabs/map';
import ActivitiesScreen from './screens/tabs/activities';
import ProfileScreen from './screens/tabs/profile';
import CreateActivity from './screens/CreateActivity';
import UserProfile from './screens/UserProfile';
import OnboardingScreen from './screens/Onboarding';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ name, focused }) {
  const icons = { Kart: '🗺️', Aktiviteter: '🏃', Profil: '👤' };
  return <Text style={{ fontSize: focused ? 22 : 18 }}>{icons[name]}</Text>;
}

const TAB_ICONS = { Aktiviteter: '🏃', Profil: '👤' };

function CustomTabBar({ state, navigation: tabNav, parentNav }) {
  return (
    <View style={styles.tabBarContainer}>
      <TouchableOpacity
        style={styles.fab}
        onPress={() => parentNav.navigate('CreateActivity')}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          return (
            <TouchableOpacity
              key={route.key}
              style={styles.tabItem}
              onPress={() => tabNav.navigate(route.name)}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: focused ? 22 : 18 }}>{TAB_ICONS[route.name]}</Text>
              <Text style={[styles.tabLabel, { color: focused ? '#1a73e8' : '#aaa' }]}>
                {route.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function MainTabs({ navigation }) {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} parentNav={navigation} />}
      screenOptions={{ headerShown: true }}
    >
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

function OnboardingStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
    </Stack.Navigator>
  );
}

function MainStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="CreateActivity"
        component={CreateActivity}
        options={{
          title: 'Ny aktivitet',
          presentation: 'modal',
          headerStyle: { backgroundColor: '#fff' },
          headerTintColor: '#1a73e8',
        }}
      />
      <Stack.Screen
        name="UserProfile"
        component={UserProfile}
        options={{
          title: 'Profil',
          headerStyle: { backgroundColor: '#fff' },
          headerTintColor: '#1a73e8',
        }}
      />
      <Stack.Screen
        name="Onboarding"
        component={OnboardingScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
    </Stack.Navigator>
  );
}

function RootNavigator() {
  const { session, loading, profileComplete } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#1a73e8" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!session ? (
        <AuthStack />
      ) : !profileComplete ? (
        <OnboardingStack />
      ) : (
        <MainStack />
      )}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  tabBarContainer: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  fab: {
    position: 'absolute',
    top: -46,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#1a73e8',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1a73e8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 10,
  },
  fabText: {
    color: '#fff',
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '300',
  },
  tabBar: {
    flexDirection: 'row',
    width: '100%',
    paddingBottom: 32,
    paddingTop: 20,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
});
