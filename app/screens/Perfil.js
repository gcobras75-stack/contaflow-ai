import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  ScrollView, ActivityIndicator, TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

const C = {
  azul: '#1B3A6B',
  verde: '#00A651',
  blanco: '#FFFFFF',
  gris: '#F5F5F5',
  texto: '#333333',
  rojo: '#EF4444',
};

const ROL_CONFIG = {
  contador: { label: 'Contador', icon: 'calculator-outline', color: C.azul },
  empresa:  { label: 'Empresa',  icon: 'business-outline',   color: '#7C3AED' },
};

export default function Perfil({ onBack }) {
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [usuario, setUsuario] = useState(null);
  const [empresa, setEmpresa] = useState(null);
  const [despacho, setDespacho] = useState(null);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [email, setEmail] = useState('');

  const cargarPerfil = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? '');

      const { data: usr } = await supabase
        .from('usuarios')
        .select('nombre, rol, empresa_id, despacho_id')
        .eq('id', user.id)
        .single();

      setUsuario(usr);
      setNuevoNombre(usr?.nombre ?? '');

      if (usr?.empresa_id) {
        const { data: emp } = await supabase
          .from('empresas_clientes')
          .select('nombre, rfc, giro')
          .eq('id', usr.empresa_id)
          .single();
        setEmpresa(emp);
      }

      if (usr?.despacho_id) {
        const { data: des } = await supabase
          .from('despachos')
          .select('nombre, rfc, plan')
          .eq('id', usr.despacho_id)
          .single();
        setDespacho(des);
      }
    } catch (e) {
      console.error('Error cargando perfil:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargarPerfil(); }, [cargarPerfil]);

  const guardarNombre = async () => {
    const nombre = nuevoNombre.trim();
    if (!nombre) { Alert.alert('Error', 'El nombre no puede estar vacío.'); return; }
    setGuardando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('usuarios')
        .update({ nombre })
        .eq('id', user.id);
      if (error) throw error;
      setUsuario(prev => ({ ...prev, nombre }));
      setEditando(false);
      Alert.alert('Listo', 'Nombre actualizado correctamente.');
    } catch (e) {
      Alert.alert('Error', 'No se pudo actualizar el nombre.');
    } finally {
      setGuardando(false);
    }
  };

  const cerrarSesion = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro que deseas salir?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: () => supabase.auth.signOut(),
        },
      ],
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={C.blanco} />
            </TouchableOpacity>
          )}
          <Text style={styles.headerTitle}>Mi Perfil</Text>
        </View>
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color={C.azul} />
        </View>
      </SafeAreaView>
    );
  }

  const rolCfg = ROL_CONFIG[usuario?.rol] ?? ROL_CONFIG.empresa;
  const inicial = (usuario?.nombre ?? email ?? '?')[0].toUpperCase();

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={C.blanco} />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Mi Perfil</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

        {/* Avatar y nombre */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarTxt}>{inicial}</Text>
          </View>
          <View style={[styles.rolBadge, { backgroundColor: rolCfg.color + '18' }]}>
            <Ionicons name={rolCfg.icon} size={13} color={rolCfg.color} />
            <Text style={[styles.rolTxt, { color: rolCfg.color }]}>{rolCfg.label}</Text>
          </View>
        </View>

        {/* Datos personales */}
        <View style={styles.seccion}>
          <View style={styles.seccionHeader}>
            <Text style={styles.seccionTitulo}>Datos personales</Text>
            {!editando && (
              <TouchableOpacity onPress={() => setEditando(true)} style={styles.editBtn}>
                <Ionicons name="pencil-outline" size={14} color={C.azul} />
                <Text style={styles.editBtnTxt}>Editar</Text>
              </TouchableOpacity>
            )}
          </View>

          <InfoRow icon="person-outline" label="Nombre">
            {editando ? (
              <TextInput
                style={styles.input}
                value={nuevoNombre}
                onChangeText={setNuevoNombre}
                autoFocus
                placeholder="Tu nombre"
              />
            ) : (
              <Text style={styles.infoVal}>{usuario?.nombre ?? '—'}</Text>
            )}
          </InfoRow>

          <InfoRow icon="mail-outline" label="Email">
            <Text style={styles.infoVal}>{email}</Text>
          </InfoRow>

          {editando && (
            <View style={styles.editAcciones}>
              <TouchableOpacity
                style={styles.btnCancelar}
                onPress={() => { setEditando(false); setNuevoNombre(usuario?.nombre ?? ''); }}
              >
                <Text style={styles.btnCancelarTxt}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnGuardar}
                onPress={guardarNombre}
                disabled={guardando}
              >
                {guardando
                  ? <ActivityIndicator size="small" color={C.blanco} />
                  : <Text style={styles.btnGuardarTxt}>Guardar</Text>
                }
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Info empresa */}
        {empresa && (
          <View style={styles.seccion}>
            <Text style={styles.seccionTitulo}>Mi empresa</Text>
            <InfoRow icon="business-outline" label="Nombre">
              <Text style={styles.infoVal}>{empresa.nombre}</Text>
            </InfoRow>
            <InfoRow icon="card-outline" label="RFC">
              <Text style={[styles.infoVal, styles.mono]}>{empresa.rfc}</Text>
            </InfoRow>
            {empresa.giro && (
              <InfoRow icon="briefcase-outline" label="Giro">
                <Text style={styles.infoVal}>{empresa.giro}</Text>
              </InfoRow>
            )}
          </View>
        )}

        {/* Info despacho */}
        {despacho && (
          <View style={styles.seccion}>
            <Text style={styles.seccionTitulo}>Mi despacho</Text>
            <InfoRow icon="business-outline" label="Despacho">
              <Text style={styles.infoVal}>{despacho.nombre}</Text>
            </InfoRow>
            <InfoRow icon="card-outline" label="RFC">
              <Text style={[styles.infoVal, styles.mono]}>{despacho.rfc}</Text>
            </InfoRow>
            <InfoRow icon="ribbon-outline" label="Plan">
              <Text style={[styles.infoVal, { textTransform: 'capitalize' }]}>{despacho.plan ?? 'básico'}</Text>
            </InfoRow>
          </View>
        )}

        {/* Versión */}
        <View style={styles.versionBox}>
          <Text style={styles.versionTxt}>ContaFlow AI · v1.0</Text>
          <Text style={styles.versionSub}>Sesión 6 · Stack: Expo + Supabase + Claude AI</Text>
        </View>

        {/* Cerrar sesión */}
        <TouchableOpacity style={styles.btnLogout} onPress={cerrarSesion}>
          <Ionicons name="log-out-outline" size={20} color={C.rojo} />
          <Text style={styles.btnLogoutTxt}>Cerrar sesión</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const InfoRow = ({ icon, label, children }) => (
  <View style={styles.infoRow}>
    <View style={styles.infoIconWrap}>
      <Ionicons name={icon} size={16} color="#9CA3AF" />
    </View>
    <Text style={styles.infoLabel}>{label}</Text>
    <View style={styles.infoValWrap}>{children}</View>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.gris },
  header: {
    backgroundColor: C.azul, paddingHorizontal: 20,
    paddingTop: 16, paddingBottom: 20,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  backBtn: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: 6 },
  headerTitle: { color: C.blanco, fontSize: 18, fontWeight: '700' },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },

  avatarSection: { alignItems: 'center', paddingVertical: 16, gap: 10 },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: C.azul, alignItems: 'center', justifyContent: 'center',
  },
  avatarTxt: { color: C.blanco, fontSize: 28, fontWeight: '700' },
  rolBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5,
  },
  rolTxt: { fontSize: 13, fontWeight: '600' },

  seccion: {
    backgroundColor: C.blanco, borderRadius: 14, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    gap: 2,
  },
  seccionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  seccionTitulo: { fontSize: 13, fontWeight: '700', color: '#6B7280', marginBottom: 8 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EEF2FA', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  editBtnTxt: { fontSize: 12, fontWeight: '600', color: C.azul },

  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  infoIconWrap: { width: 28 },
  infoLabel: { fontSize: 13, color: '#9CA3AF', width: 70 },
  infoValWrap: { flex: 1 },
  infoVal: { fontSize: 13, fontWeight: '500', color: C.texto },
  mono: { fontFamily: 'monospace', fontSize: 12 },

  input: {
    fontSize: 13, fontWeight: '500', color: C.texto,
    borderBottomWidth: 1, borderBottomColor: C.azul,
    paddingVertical: 2, flex: 1,
  },
  editAcciones: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 12 },
  btnCancelar: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#E0E0E8' },
  btnCancelarTxt: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  btnGuardar: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8, backgroundColor: C.azul, minWidth: 80, alignItems: 'center' },
  btnGuardarTxt: { fontSize: 13, color: C.blanco, fontWeight: '700' },

  versionBox: { alignItems: 'center', paddingVertical: 8 },
  versionTxt: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },
  versionSub: { fontSize: 11, color: '#C4C4C4', marginTop: 2 },

  btnLogout: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#FFF1F2', borderRadius: 12, paddingVertical: 14,
    borderWidth: 1, borderColor: '#FECDD3',
  },
  btnLogoutTxt: { fontSize: 15, fontWeight: '700', color: C.rojo },
});
