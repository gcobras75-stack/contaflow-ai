import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { supabase } from './lib/supabase';
import LoginScreen from './screens/LoginScreen';
import DashboardEmpresa from './screens/DashboardEmpresa';
import DashboardContador from './screens/DashboardContador';
import SubirCFDI from './screens/SubirCFDI';
import SubirEstadoCuenta from './screens/SubirEstadoCuenta';
import Historial from './screens/Historial';
import Reportes from './screens/Reportes';
import Perfil from './screens/Perfil';

export default function App() {
  const [session, setSession] = useState(null);
  const [rol, setRol] = useState(null);
  const [currentScreen, setCurrentScreen] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session) {
        await loadRol(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (!session) {
          setRol(null);
          setCurrentScreen(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const loadRol = async (userId) => {
    const { data } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', userId)
      .single();
    if (data) setRol(data.rol);
    setLoading(false);
  };

  const handleLogin = (userRol) => {
    setRol(userRol);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setRol(null);
    setCurrentScreen(null);
  };

  const navigate = (screen) => setCurrentScreen(screen);
  const goBack = () => setCurrentScreen(null);

  // ── Pantalla de carga ──────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.loading}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color="#1B3A6B" />
      </View>
    );
  }

  // ── Sin sesión: Login ──────────────────────────────────────
  if (!session) {
    return (
      <>
        <StatusBar style="dark" />
        <LoginScreen onLogin={handleLogin} />
      </>
    );
  }

  // ── Sesión empresa ─────────────────────────────────────────
  if (rol === 'empresa') {
    if (currentScreen === 'SubirCFDI')
      return <><StatusBar style="light" /><SubirCFDI onBack={goBack} /></>;
    if (currentScreen === 'SubirEstadoCuenta')
      return <><StatusBar style="light" /><SubirEstadoCuenta onBack={goBack} /></>;
    if (currentScreen === 'Historial')
      return <><StatusBar style="light" /><Historial onBack={goBack} /></>;
    if (currentScreen === 'Reportes')
      return <><StatusBar style="light" /><Reportes onBack={goBack} /></>;
    if (currentScreen === 'Perfil')
      return <><StatusBar style="light" /><Perfil onBack={goBack} /></>;

    return (
      <>
        <StatusBar style="light" />
        <DashboardEmpresa onLogout={handleLogout} onNavigate={navigate} />
      </>
    );
  }

  // ── Sesión contador ────────────────────────────────────────
  return (
    <>
      <StatusBar style="light" />
      <DashboardContador onLogout={handleLogout} />
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
  },
});
