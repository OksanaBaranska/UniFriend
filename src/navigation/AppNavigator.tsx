import React, { useEffect, useState } from "react";
import { Alert, View } from "react-native";
import Svg, { Rect, Path, Circle } from "react-native-svg";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { onAuthStateChanged, User } from "firebase/auth";
import { arrayUnion, collection, doc, getDocs, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import { auth, db } from "../firebase/config";
import { RootStackParamList, MainTabParamList } from "../types";

import LoginScreen from "../screens/LoginScreen";
import SignUpScreen from "../screens/SignUpScreen";
import CreateProfileScreen from "../screens/CreateProfileScreen";
import FiltersScreen from "../screens/FiltersScreen";
import SwipeScreen from "../screens/SwipeScreen";
import MatchesScreen from "../screens/MatchesScreen";
import ProfileScreen from "../screens/ProfileScreen";
import ChatScreen from "../screens/ChatScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function TabIcon({ children }: { active: boolean; color: string; children: React.ReactNode }) {
  return (
    <View style={{ alignItems: "center" }}>
      {children}
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Swipe"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: "#0F0F0F",
        tabBarInactiveTintColor: "#8A8A82",
        tabBarStyle: {
          backgroundColor: "#EDEBE6",
          borderTopColor: "#ECEAE2",
          borderTopWidth: 1,
          paddingTop: 1,
          paddingBottom: 28,
          height: 78,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
          marginTop: 2,
        },
        tabBarIcon: ({ focused, color }) => {
          const stroke = color;
          if (route.name === "Swipe") {
            return (
              <TabIcon active={focused} color={color}>
                <Svg width={20} height={20} viewBox="0 0 18 18" fill="none">
                  <Rect x="3" y="3" width="12" height="12" rx="3" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  <Path d="M3 9h12" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </TabIcon>
            );
          }
          if (route.name === "Matches") {
            return (
              <TabIcon active={focused} color={color}>
                <Svg width={20} height={20} viewBox="0 0 18 18" fill="none">
                  <Path d="M9 15s-5.5-3.5-5.5-8A3.5 3.5 0 0 1 9 4a3.5 3.5 0 0 1 5.5 3c0 4.5-5.5 8-5.5 8z" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </TabIcon>
            );
          }
          if (route.name === "Profile") {
            return (
              <TabIcon active={focused} color={color}>
                <Svg width={20} height={20} viewBox="0 0 18 18" fill="none">
                  <Circle cx="9" cy="7" r="3" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  <Path d="M3 16c1-3 3.5-5 6-5s5 2 6 5" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </TabIcon>
            );
          }
          return null;
        },
      })}
    >
      <Tab.Screen name="Swipe" component={SwipeScreen} />
      <Tab.Screen name="Matches" component={MatchesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

async function checkNewMatches(uid: string) {
  const snap = await getDocs(
    query(collection(db, "matches"), where("users", "array-contains", uid))
  );
  // Only show banner for matches the user hasn't opened yet
  const unseen = snap.docs.filter((d) => {
    const seenBy: string[] = d.data().seenBy ?? [];
    return !seenBy.includes(uid);
  });
  if (unseen.length > 0) {
    Alert.alert(
      "New matches!",
      `You have ${unseen.length} new ${unseen.length === 1 ? "match" : "matches"} waiting for you.`,
      [{
        text: "See matches",
        style: "default",
        onPress: () => {
          // Mark all as seen so the banner doesn't repeat on next app open
          Promise.all(unseen.map((d) => updateDoc(d.ref, { seenBy: arrayUnion(uid) })));
        },
      }]
    );
  }
}

export default function AppNavigator() {
  const [user, setUser] = useState<User | null>(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [hasFilters, setHasFilters] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;
    let unsubFilters: (() => void) | null = null;
    let isFirstLoad = true;

    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (unsubProfile) { unsubProfile(); unsubProfile = null; }
      if (unsubFilters) { unsubFilters(); unsubFilters = null; }

      if (firebaseUser) {
        unsubProfile = onSnapshot(doc(db, "users", firebaseUser.uid), (snap) => {
          const exists = snap.exists();
          setHasProfile(exists);
          setLoading(false);
          if (exists && isFirstLoad) {
            isFirstLoad = false;
            checkNewMatches(firebaseUser.uid);
          }
        });

        unsubFilters = onSnapshot(doc(db, "filters", firebaseUser.uid), (snap) => {
          setHasFilters(snap.exists());
        });
      } else {
        setHasProfile(false);
        setHasFilters(false);
        setLoading(false);
        isFirstLoad = true;
      }
      setUser(firebaseUser);
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
      if (unsubFilters) unsubFilters();
    };
  }, []);

  if (loading) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
          </>
        ) : !hasProfile ? (
          <Stack.Screen name="CreateProfile" component={CreateProfileScreen} />
        ) : !hasFilters ? (
          <Stack.Screen name="SetFilters" component={FiltersScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="EditFilters" component={FiltersScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
