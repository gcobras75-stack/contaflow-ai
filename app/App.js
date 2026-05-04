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
import EstrategiaFiscal from './screens/EstrategiaFiscal';
import ChatContador from './screens/ChatContador';
import VincularEmpresa from './screens/VincularEmpresa';
import SyncSAT from './screens/SyncSAT';
import SubirCSF from './screens/SubirCSF';
import SubirDocumento from './screens/SubirDocumento';
import ChatCliente from './screens/ChatCliente';
import GraficasEmpresa from './screens/GraficasEmpresa';
import MisEmpresas from './screens/MisEmpresas';

export default function App() {
  const [session, setSession] = useState(null);
  const [rol, setRol] = useState(null);
  const [empresaId, setEmpresaId] = useState(null);
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
      .select('rol, empresa_id')
      .eq('id', userId)
      .single();
    if (data) {
      setRol(data.rol);
      setEmpresaId(data.empresa_id ?? null);
    }
    setLoading(false);
  };

  const handleLogin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await loadRol(user.id);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setRol(null);
    setEmpresaId(null);
    setCurrentScreen(null);
  };

  const handleVinculado = async () => {
    // Recargar datos del usuario tras vincularse
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await loadRol(user.id);
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

  // ── Empresa sin vincular → flujo de invitación ─────────────
  if (rol === 'empresa' && !empresaId) {
    return (
      <>
        <StatusBar style="light" />
        <VincularEmpresa onVinculado={handleVinculado} onLogout={handleLogout} />
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
    if (currentScreen === 'SyncSAT')
      return <><StatusBar style="light" /><SyncSAT onBack={goBack} /></>;
    if (currentScreen === 'SubirCSF')
      return <><StatusBar style="light" /><SubirCSF onBack={goBack} /></>;
    if (currentScreen === 'SubirDocumento')
      return <><StatusBar style="light" /><SubirDocumento onBack={goBack} /></>;
    if (currentScreen === 'ChatCliente')
      return <><StatusBar style="light" /><ChatCliente onBack={goBack} /></>;
    if (currentScreen === 'GraficasEmpresa')
      return <><StatusBar style="light" /><GraficasEmpresa onBack={goBack} /></>;
    if (currentScreen === 'SubirDocumentoNota')
      return <><StatusBar style="light" /><SubirDocumento tipoPreseleccionado="nota" onBack={goBack} /></>;

    return (
      <>
        <StatusBar style="light" />
        <DashboardEmpresa onLogout={handleLogout} onNavigate={navigate} />
      </>
    );
  }

  // ── Sesión contador ────────────────────────────────────────
  if (rol === 'contador') {
    if (currentScreen === 'Historial')
      return <><StatusBar style="light" /><Historial onBack={goBack} /></>;
    if (currentScreen === 'Perfil')
      return <><StatusBar style="light" /><Perfil onBack={goBack} /></>;
    if (currentScreen === 'Reportes')
      return <><StatusBar style="light" /><Reportes onBack={goBack} /></>;
    if (currentScreen === 'EstrategiaFiscal')
      return <><StatusBar style="light" /><EstrategiaFiscal onBack={goBack} /></>;
    if (currentScreen === 'ChatContador')
      return <><StatusBar style="light" /><ChatContador onBack={goBack} /></>;
    if (currentScreen === 'MisEmpresas')
      return <><StatusBar style="light" /><MisEmpresas onBack={goBack} /></>;

    return (
      <>
        <StatusBar style="light" />
        <DashboardContador onLogout={handleLogout} onNavigate={navigate} />
      </>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
  },
});
