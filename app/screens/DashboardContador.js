import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const C = {
  azul: '#1B3A6B',
  verde: '#00A651',
  blanco: '#FFFFFF',
  gris: '#F5F5F5',
  texto: '#333333',
};

const MenuItem = ({ icon, label }) => (
  <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
    <View style={styles.menuIcon}>
      <Ionicons name={icon} size={24} color={C.azul} />
    </View>
    <Text style={styles.menuLabel}>{label}</Text>
    <Ionicons name="chevron-forward" size={18} color="#CCC" />
  </TouchableOpacity>
);

export default function DashboardContador({ onLogout }) {
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSub}>Panel del Contador</Text>
          <Text style={styles.headerTitle}>ContaFlow AI</Text>
        </View>
        <TouchableOpacity onPress={onLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color={C.blanco} />
        </TouchableOpacity>
      </View>

      <View style={styles.banner}>
        <Ionicons name="construct-outline" size={16} color={C.verde} />
        <Text style={styles.bannerText}>Panel web disponible en tu navegador</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <MenuItem icon="people-outline" label="Mis Empresas" />
        <MenuItem icon="document-text-outline" label="CFDIs" />
        <MenuItem icon="analytics-outline" label="Conciliación" />
        <MenuItem icon="download-outline" label="Exportar" />
        <MenuItem icon="settings-outline" label="Configuración" />
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
  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    padding: 8,
  },
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
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 10 },
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
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#EEF2FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: C.texto },
});
