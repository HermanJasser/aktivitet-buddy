import 'react-native-url-polyfill/auto';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, ActivityIndicator, View, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { useAuth, AuthProvider } from './hooks/useAuth';
import LoginScreen from './screens/auth/login';
import RegisterScreen from './screens/auth/register';
import MapScreen from './screens/tabs/map';
import ActivitiesScreen from './screens/tabs/activities';
import ProfileScreen from './screens/tabs/profile';
import CreateActivity from './screens/CreateActivity';
import ActivityDetail from './screens/ActivityDetail';
import UserProfile from './screens/UserProfile';
import OnboardingScreen from './screens/Onboarding';
import ChatList from './screens/ChatList';
import ChatRoom from './screens/ChatRoom';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ name, focused }) {
  const icons = { Kart: '🗺️', Aktiviteter: '🏃', Profil: '👤' };
  return <Text style={{ fontSize: focused ? 22 : 18 }}>{icons[name]}</Text>;
}

const TAB_ICONS = { Krets: '🏃', Profil: '👤' };

function CustomTabBar({ state, navigation: tabNav, parentNav }) {
  return (
    <View style={styles.tabBarContainer}>
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
              <Text style={[styles.tabLabel, { color: focused ? '#7C5CBF' : '#aaa' }]}>
                {route.name}
              </Text>
            </TouchableOpacity>
          );
        }).reduce((acc, item, i) => {
          if (i === 1) {
            acc.push(
              <TouchableOpacity
                key="fab"
                style={styles.fab}
                onPress={() => parentNav.navigate('CreateActivity')}
                activeOpacity={0.85}
              >
                <Text style={styles.fabText}>+</Text>
              </TouchableOpacity>
            );
          }
          acc.push(item);
          return acc;
        }, [])}
      </View>
    </View>
  );
}

function MainTabs({ navigation }) {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} parentNav={navigation} />}
      screenOptions={{
        headerShown: true,
        headerRight: () => (
          <TouchableOpacity
            style={{ marginRight: 16 }}
            onPress={() => navigation.navigate('ChatList')}
          >
            <MaterialIcons name="chat-bubble-outline" size={24} color="#7C5CBF" />
          </TouchableOpacity>
        ),
      }}
    >
      <Tab.Screen name="Krets" component={ActivitiesScreen} />
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
          presentation: 'modal',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="ActivityDetail"
        component={ActivityDetail}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="UserProfile"
        component={UserProfile}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Onboarding"
        component={OnboardingScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="ChatList"
        component={ChatList}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ChatRoom"
        component={ChatRoom}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

function RootNavigator() {
  const { session, loading, needsOnboarding, setNeedsOnboarding } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#7C5CBF" />
      </View>
    );
  }

  return (
    <NavigationContainer key={!session ? 'auth' : needsOnboarding ? 'onboarding' : 'main'}>
      {!session ? (
        <AuthStack />
      ) : needsOnboarding ? (
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
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 32,
    paddingTop: 12,
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#7C5CBF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C5CBF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
    marginHorizontal: 16,
  },
  fabText: {
    color: '#fff',
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '300',
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
