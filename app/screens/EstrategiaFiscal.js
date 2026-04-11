import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

const C = {
  azul: '#1B3A6B',
  verde: '#00A651',
  blanco: '#FFFFFF',
  gris: '#F5F5F5',
  texto: '#333333',
  morado: '#7C3AED',
};

const WEB_BASE = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://contaflow-ai.vercel.app';

export default function EstrategiaFiscal({ onBack }) {
  const [empresas, setEmpresas] = useState([]);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [empresaSel, setEmpresaSel] = useState(null);
  const [estrategia, setEstrategia] = useState('');
  const [generando, setGenerando] = useState(false);

  const cargarEmpresas = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: usr } = await supabase
        .from('usuarios').select('despacho_id').eq('id', user.id).single();
      if (!usr?.despacho_id) return;
      const { data } = await supabase
        .from('empresas_clientes')
        .select('id, nombre, rfc, giro')
        .eq('despacho_id', usr.despacho_id)
        .eq('activa', true)
        .order('nombre');
      setEmpresas(data ?? []);
    } finally {
      setLoadingEmpresas(false);
    }
  }, []);

  useEffect(() => { cargarEmpresas(); }, [cargarEmpresas]);

  const generarEstrategia = async (empresa) => {
    setEmpresaSel(empresa);
    setEstrategia('');
    setGenerando(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${WEB_BASE}/api/estrategia-fiscal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ empresa_id: empresa.id }),
      });
      const json = await res.json();
      if (json.error) {
        Alert.alert('Error', json.error);
        setEmpresaSel(null);
      } else {
        setEstrategia(json.estrategia ?? '');
      }
    } catch {
      Alert.alert('Error de red', 'No se pudo conectar con el servidor.');
      setEmpresaSel(null);
    } finally {
      setGenerando(false);
    }
  };

  const volver = () => {
    setEmpresaSel(null);
    setEstrategia('');
  };

  // Vista de estrategia generada
  if (empresaSel && (generando || estrategia)) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity onPress={volver} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={C.blanco} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerSub}>Estrategia Fiscal</Text>
            <Text style={styles.headerTitle} numberOfLines={1}>{empresaSel.nombre}</Text>
          </View>
        </View>

        {generando ? (
          <View style={styles.centrado}>
            <View style={styles.aiCircle}>
              <Ionicons name="sparkles" size={36} color={C.morado} />
            </View>
            <Text style={styles.loadingTitle}>Analizando situación fiscal...</Text>
            <ActivityIndicator size="small" color={C.morado} style={{ marginTop: 8 }} />
            <Text style={styles.loadingSubtitle}>CPC Ricardo Morales está revisando los datos de {empresaSel.nombre}</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.estrategiaBody}>
            <View style={styles.cpcCard}>
              <View style={styles.cpcAvatar}>
                <Text style={styles.cpcAvatarTxt}>CPC</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cpcNombre}>CPC Ricardo Morales</Text>
                <Text style={styles.cpcCargo}>Estrategia fiscal personalizada</Text>
              </View>
            </View>
            <View style={styles.empresaChip}>
              <Ionicons name="business-outline" size={14} color={C.azul} />
              <Text style={styles.empresaChipTxt}>{empresaSel.rfc} · {empresaSel.giro ?? 'Sin giro'}</Text>
            </View>
            <Text style={styles.estrategiaText}>{estrategia}</Text>
            <TouchableOpacity style={styles.btnRegener} onPress={() => generarEstrategia(empresaSel)}>
              <Ionicons name="refresh-outline" size={18} color={C.morado} />
              <Text style={styles.btnRegenerTxt}>Regenerar análisis</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </SafeAreaView>
    );
  }

  // Lista de empresas
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={C.blanco} />
          </TouchableOpacity>
        )}
        <View>
          <Text style={styles.headerSub}>Panel Contador</Text>
          <Text style={styles.headerTitle}>Estrategia Fiscal</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.infoBox}>
          <Ionicons name="sparkles-outline" size={16} color={C.morado} />
          <Text style={styles.infoTxt}>
            Selecciona una empresa para generar un análisis fiscal personalizado basado en sus CFDIs de los últimos 3 meses.
          </Text>
        </View>

        {loadingEmpresas ? (
          <ActivityIndicator size="large" color={C.azul} style={{ marginTop: 40 }} />
        ) : empresas.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="business-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyTxt}>Sin empresas cliente activas</Text>
          </View>
        ) : (
          empresas.map(emp => (
            <TouchableOpacity
              key={emp.id}
              style={styles.empresaCard}
              onPress={() => generarEstrategia(emp)}
              activeOpacity={0.75}
            >
              <View style={styles.empresaCardIcon}>
                <Ionicons name="business-outline" size={22} color={C.azul} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.empresaCardNombre}>{emp.nombre}</Text>
                <Text style={styles.empresaCardRfc}>{emp.rfc} · {emp.giro ?? 'Sin giro'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#CCC" />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.gris },
  header: {
    backgroundColor: C.azul, paddingHorizontal: 20,
    paddingTop: 16, paddingBottom: 20,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  backBtn: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: 6 },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  headerTitle: { color: C.blanco, fontSize: 18, fontWeight: '700' },
  body: { padding: 16, gap: 10 },
  infoBox: {
    flexDirection: 'row', backgroundColor: '#FAF5FF',
    borderRadius: 10, padding: 12, gap: 8,
    borderWidth: 1, borderColor: '#EDE9FE',
  },
  infoTxt: { color: '#4B5563', fontSize: 12, flex: 1, lineHeight: 18 },
  emptyBox: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyTxt: { color: '#9CA3AF', fontSize: 14 },
  empresaCard: {
    backgroundColor: C.blanco, borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  empresaCardIcon: {
    width: 42, height: 42, borderRadius: 10, backgroundColor: '#EEF2FA',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  empresaCardNombre: { fontSize: 15, fontWeight: '600', color: C.texto },
  empresaCardRfc: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  aiCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center',
  },
  loadingTitle: { fontSize: 17, fontWeight: '700', color: C.texto, textAlign: 'center' },
  loadingSubtitle: { fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
  estrategiaBody: { padding: 16, gap: 14 },
  cpcCard: {
    backgroundColor: C.azul, borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  cpcAvatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  cpcAvatarTxt: { color: C.blanco, fontWeight: '700', fontSize: 12 },
  cpcNombre: { color: C.blanco, fontWeight: '700', fontSize: 15 },
  cpcCargo: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  empresaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#EEF2FA', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  empresaChipTxt: { fontSize: 12, color: C.azul, fontWeight: '500' },
  estrategiaText: {
    fontSize: 14, color: C.texto, lineHeight: 22,
    backgroundColor: C.blanco, borderRadius: 12, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  btnRegener: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 10,
    backgroundColor: '#FAF5FF', borderWidth: 1, borderColor: '#EDE9FE',
  },
  btnRegenerTxt: { color: C.morado, fontWeight: '600', fontSize: 13 },
});
