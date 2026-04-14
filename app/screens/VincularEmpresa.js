import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
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

const WEB_BASE = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://contaflow.mx';

export default function VincularEmpresa({ onVinculado, onLogout }) {
  const [codigo, setCodigo]       = useState('');
  const [validando, setValidando] = useState(false);
  const [error, setError]         = useState('');
  const [exito, setExito]         = useState(null);

  const formatearCodigo = (text) => {
    // Auto-formato XXXX-XXXX mientras el usuario escribe
    const limpio = text.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 8);
    if (limpio.length > 4) {
      return limpio.slice(0, 4) + '-' + limpio.slice(4);
    }
    return limpio;
  };

  const validar = async () => {
    const codigoLimpio = codigo.replace('-', '').trim();
    if (codigoLimpio.length < 8) {
      setError('El código debe tener el formato XXXX-XXXX.');
      return;
    }
    setValidando(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${WEB_BASE}/api/validar-invitacion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ codigo }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setError(json.error ?? 'Código inválido.');
      } else {
        setExito(json);
        // Recargar sesión para que el rol y empresa_id se actualicen
        setTimeout(() => {
          onVinculado?.();
        }, 2500);
      }
    } catch {
      setError('Error de conexión. Verifica tu internet.');
    } finally {
      setValidando(false);
    }
  };

  if (exito) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.centrado}>
          <View style={styles.exitoCircle}>
            <Ionicons name="checkmark-circle" size={64} color={C.verde} />
          </View>
          <Text style={styles.exitoTitulo}>¡Cuenta vinculada!</Text>
          <Text style={styles.exitoEmpresa}>{exito.empresa}</Text>
          <Text style={styles.exitoRfc}>{exito.rfc}</Text>
          <ActivityIndicator size="small" color={C.azul} style={{ marginTop: 20 }} />
          <Text style={styles.exitoSub}>Cargando tu panel...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <View style={styles.logoDot} />
          <Text style={styles.logoText}>ContaFlow <Text style={styles.logoAI}>AI</Text></Text>
        </View>
        <TouchableOpacity onPress={onLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={18} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.body}>
          <View style={styles.iconCircle}>
            <Ionicons name="link-outline" size={40} color={C.azul} />
          </View>

          <Text style={styles.titulo}>Vincula tu empresa</Text>
          <Text style={styles.subtitulo}>
            Tu contador generó un código de invitación.{'\n'}
            Ingrésalo aquí para vincular tu cuenta.
          </Text>

          <View style={styles.inputBox}>
            <TextInput
              style={styles.codigoInput}
              value={codigo}
              onChangeText={t => {
                setCodigo(formatearCodigo(t));
                setError('');
              }}
              placeholder="XXXX-XXXX"
              placeholderTextColor="#C4C4C4"
              autoCapitalize="characters"
              maxLength={9}
              keyboardType="default"
              autoCorrect={false}
            />
          </View>

          {error !== '' && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color={C.rojo} />
              <Text style={styles.errorTxt}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.btn, (validando || codigo.replace('-','').length < 8) && styles.btnDisabled]}
            onPress={validar}
            disabled={validando || codigo.replace('-','').length < 8}
            activeOpacity={0.8}
          >
            {validando ? (
              <ActivityIndicator size="small" color={C.blanco} />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color={C.blanco} />
                <Text style={styles.btnTxt}>Vincular empresa</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={16} color="#6B7280" />
            <Text style={styles.infoTxt}>
              Si aún no tienes un código, contacta a tu despacho contable para que lo genere desde el panel web de ContaFlow AI.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.gris },
  header: {
    backgroundColor: C.azul, paddingHorizontal: 20,
    paddingTop: 16, paddingBottom: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.verde },
  logoText: { color: C.blanco, fontSize: 18, fontWeight: '700' },
  logoAI: { color: '#7DD3C0' },
  logoutBtn: { padding: 8 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 16 },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 12 },
  iconCircle: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: '#EEF2FA', alignItems: 'center', justifyContent: 'center',
  },
  exitoCircle: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center',
  },
  titulo: { fontSize: 24, fontWeight: '700', color: C.texto, textAlign: 'center' },
  subtitulo: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22 },
  inputBox: { width: '100%', alignItems: 'center' },
  codigoInput: {
    fontSize: 32, fontWeight: '700', letterSpacing: 6,
    color: C.azul, textAlign: 'center',
    borderBottomWidth: 3, borderBottomColor: C.azul,
    paddingBottom: 8, paddingHorizontal: 12, width: '80%',
  },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFF1F2', borderRadius: 10, padding: 10, width: '100%',
  },
  errorTxt: { color: C.rojo, fontSize: 13, flex: 1, lineHeight: 18 },
  btn: {
    width: '100%', backgroundColor: C.verde, borderRadius: 14,
    paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  btnDisabled: { opacity: 0.45 },
  btnTxt: { color: C.blanco, fontWeight: '700', fontSize: 16 },
  infoBox: {
    flexDirection: 'row', backgroundColor: C.blanco,
    borderRadius: 12, padding: 14, gap: 8, width: '100%',
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  infoTxt: { color: '#6B7280', fontSize: 12, flex: 1, lineHeight: 18 },
  exitoTitulo: { fontSize: 24, fontWeight: '700', color: C.verde },
  exitoEmpresa: { fontSize: 18, fontWeight: '700', color: C.texto, textAlign: 'center' },
  exitoRfc: { fontSize: 13, color: '#6B7280', fontFamily: 'monospace' },
  exitoSub: { fontSize: 13, color: '#9CA3AF', marginTop: 4 },
});
