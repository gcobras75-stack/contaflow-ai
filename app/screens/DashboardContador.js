import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, SafeAreaView, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

const C = {
  azul: '#1B3A6B',
  verde: '#00A651',
  blanco: '#FFFFFF',
  gris: '#F5F5F5',
  texto: '#333333',
  amarillo: '#F59E0B',
};

const MenuItem = ({ icon, label, badge, onPress }) => (
  <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={onPress}>
    <View style={styles.menuIcon}>
      <Ionicons name={icon} size={24} color={C.azul} />
    </View>
    <Text style={styles.menuLabel}>{label}</Text>
    {badge ? (
      <View style={styles.badge}>
        <Text style={styles.badgeTxt}>{badge}</Text>
      </View>
    ) : null}
    <Ionicons name="chevron-forward" size={18} color="#CCC" />
  </TouchableOpacity>
);

export default function DashboardContador({ onLogout, onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nombre, setNombre] = useState('');
  const [stats, setStats] = useState({
    empresas: 0,
    cfdisPendientes: 0,
    estadosPendientes: 0,
  });

  const cargarDatos = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: usr } = await supabase
        .from('usuarios')
        .select('nombre, despacho_id')
        .eq('id', user.id)
        .single();

      if (usr?.nombre) setNombre(usr.nombre);
      if (!usr?.despacho_id) { setLoading(false); setRefreshing(false); return; }

      const [empRes, cfdiRes, estadoRes] = await Promise.all([
        supabase
          .from('empresas_clientes')
          .select('*', { count: 'exact', head: true })
          .eq('despacho_id', usr.despacho_id)
          .eq('activa', true),
        supabase
          .from('cfdis')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pendiente'),
        supabase
          .from('estados_cuenta')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pendiente'),
      ]);

      setStats({
        empresas: empRes.count ?? 0,
        cfdisPendientes: cfdiRes.count ?? 0,
        estadosPendientes: estadoRes.count ?? 0,
      });
    } catch (e) {
      console.error('Error cargando dashboard contador:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  const onRefresh = () => { setRefreshing(true); cargarDatos(); };

  const webSolo = (label) =>
    Alert.alert(
      'Disponible en panel web',
      `"${label}" está optimizado para el panel web de ContaFlow AI. Ábrelo en tu navegador.`,
      [{ text: 'Entendido' }],
    );

  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>ContaFlow AI</Text>
        </View>
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color={C.azul} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSub}>Panel del Contador</Text>
          <Text style={styles.headerTitle}>{nombre || 'ContaFlow AI'}</Text>
        </View>
        <TouchableOpacity onPress={onLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color={C.blanco} />
        </TouchableOpacity>
      </View>

      <View style={styles.banner}>
        <Ionicons name="construct-outline" size={16} color={C.verde} />
        <Text style={styles.bannerText}>Panel web disponible en tu navegador</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.azul} />}
      >
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{stats.empresas}</Text>
            <Text style={styles.statLbl}>Empresas</Text>
          </View>
          <View style={[styles.statBox, stats.cfdisPendientes > 0 && styles.statBoxAlert]}>
            <Text style={[styles.statNum, stats.cfdisPendientes > 0 && { color: C.amarillo }]}>
              {stats.cfdisPendientes}
            </Text>
            <Text style={styles.statLbl}>CFDIs pend.</Text>
          </View>
          <View style={[styles.statBox, stats.estadosPendientes > 0 && styles.statBoxAlert]}>
            <Text style={[styles.statNum, stats.estadosPendientes > 0 && { color: C.amarillo }]}>
              {stats.estadosPendientes}
            </Text>
            <Text style={styles.statLbl}>Estados pend.</Text>
          </View>
        </View>

        <MenuItem
          icon="people-outline"
          label="Mis Empresas"
          badge={stats.empresas > 0 ? String(stats.empresas) : null}
          onPress={() => webSolo('Mis Empresas')}
        />
        <MenuItem
          icon="document-text-outline"
          label="CFDIs"
          badge={stats.cfdisPendientes > 0 ? String(stats.cfdisPendientes) : null}
          onPress={() => onNavigate?.('Historial')}
        />
        <MenuItem
          icon="bulb-outline"
          label="Estrategia Fiscal"
          onPress={() => onNavigate?.('EstrategiaFiscal')}
        />
        <MenuItem
          icon="chatbubble-ellipses-outline"
          label="Chat con CPC Ricardo"
          onPress={() => onNavigate?.('ChatContador')}
        />
        <MenuItem
          icon="analytics-outline"
          label="Conciliación"
          onPress={() => webSolo('Conciliación')}
        />
        <MenuItem
          icon="download-outline"
          label="Exportar"
          onPress={() => webSolo('Exportar')}
        />
        <MenuItem
          icon="person-outline"
          label="Mi Perfil"
          onPress={() => onNavigate?.('Perfil')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.gris },
  header: {
    backgroundColor: C.azul,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  headerTitle: { color: C.blanco, fontSize: 20, fontWeight: '700' },
  logoutBtn: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: 8 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F8F0',
    padding: 12,
    paddingHorizontal: 16,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#D0EFE0',
  },
  bannerText: { color: '#1A7A44', fontSize: 13, fontWeight: '500' },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 10 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  statBox: {
    flex: 1, backgroundColor: C.blanco, borderRadius: 12, padding: 14,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  statBoxAlert: { borderWidth: 1, borderColor: '#FDE68A' },
  statNum: { fontSize: 24, fontWeight: '700', color: C.azul },
  statLbl: { fontSize: 11, color: '#6B7280', marginTop: 2, textAlign: 'center' },
  menuItem: {
    backgroundColor: C.blanco,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  menuIcon: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: '#EEF2FA',
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: C.texto },
  badge: {
    backgroundColor: C.amarillo, borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 2, marginRight: 6,
  },
  badgeTxt: { color: C.blanco, fontSize: 11, fontWeight: '700' },
});
