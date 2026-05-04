import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../lib/supabase';

const C = {
  azul: '#1B3A6B',
  verde: '#00A651',
  blanco: '#FFFFFF',
  gris: '#F5F5F5',
  texto: '#333333',
  rojo: '#EF4444',
  morado: '#7C3AED',
};

const WEB_BASE = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://contaflow.mx';

export default function SubirCSF({ onBack }) {
  const [etapa, setEtapa]       = useState('inicio'); // inicio | procesando | exito | error
  const [archivo, setArchivo]   = useState(null);
  const [resultado, setResultado] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const seleccionarPDF = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      setArchivo(asset);
      await procesarCSF(asset);
    } catch {
      Alert.alert('Error', 'No se pudo abrir el selector de archivos.');
    }
  };

  const procesarCSF = async (asset) => {
    setEtapa('procesando');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setEtapa('error'); setErrorMsg('Sesión expirada.'); return; }

      const { data: usr } = await supabase
        .from('usuarios').select('empresa_id').eq('id', user.id).single();

      if (!usr?.empresa_id) {
        setEtapa('error');
        setErrorMsg('Tu cuenta no tiene una empresa vinculada.');
        return;
      }

      // Leer el PDF como base64
      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${WEB_BASE}/api/analizar-csf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({
          empresa_id: usr.empresa_id,
          pdf_base64: base64,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        setEtapa('error');
        setErrorMsg(json.error ?? 'Error al procesar la constancia.');
      } else {
        setResultado(json.datos);
        setEtapa('exito');
      }
    } catch {
      setEtapa('error');
      setErrorMsg('Error de conexión. Verifica tu internet.');
    }
  };

  const reiniciar = () => {
    setEtapa('inicio');
    setArchivo(null);
    setResultado(null);
    setErrorMsg('');
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={C.blanco} />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Constancia Fiscal</Text>
      </View>

      {etapa === 'inicio' && (
        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.iconCircle}>
            <Ionicons name="document-text-outline" size={40} color={C.azul} />
          </View>
          <Text style={styles.titulo}>Constancia de Situación Fiscal</Text>
          <Text style={styles.subtitulo}>
            Sube el PDF de tu Constancia de Situación Fiscal del SAT.
            ContaFlow extraerá automáticamente tu giro y régimen fiscal.
          </Text>
          <View style={styles.infoBox}>
            <Ionicons name="sparkles-outline" size={16} color={C.morado} />
            <Text style={styles.infoTxt}>
              Claude AI leerá tu constancia y actualizará los datos fiscales de tu empresa automáticamente.
            </Text>
          </View>
          <TouchableOpacity style={styles.btnPrimary} onPress={seleccionarPDF}>
            <Ionicons name="folder-open-outline" size={22} color={C.blanco} />
            <Text style={styles.btnTxt}>Seleccionar PDF</Text>
          </TouchableOpacity>
          <Text style={styles.hint}>
            Descarga tu Constancia desde el portal del SAT:{'\n'}
            sat.gob.mx → Mi portal → Servicios → Constancia de situación fiscal
          </Text>
        </ScrollView>
      )}

      {etapa === 'procesando' && (
        <View style={styles.centrado}>
          <View style={styles.aiCircle}>
            <Ionicons name="sparkles" size={36} color={C.morado} />
          </View>
          <Text style={styles.titulo}>Analizando constancia...</Text>
          <ActivityIndicator size="small" color={C.morado} style={{ marginTop: 8 }} />
          <Text style={styles.subtitulo}>Claude está extrayendo tu información fiscal</Text>
        </View>
      )}

      {etapa === 'exito' && resultado && (
        <ScrollView contentContainerStyle={styles.body}>
          <View style={[styles.iconCircle, { backgroundColor: '#F0FDF4' }]}>
            <Ionicons name="checkmark-circle" size={40} color={C.verde} />
          </View>
          <Text style={[styles.titulo, { color: C.verde }]}>¡Datos actualizados!</Text>
          <View style={styles.datosCard}>
            <Text style={styles.datosTitle}>Datos extraídos de tu CSF</Text>
            {[
              { label: 'Nombre / Razón Social', val: resultado.nombre },
              { label: 'RFC', val: resultado.rfc },
              { label: 'Régimen Fiscal', val: resultado.regimen },
              { label: 'Actividad Principal', val: resultado.actividad_principal },
              { label: 'Código SCIAN', val: resultado.codigo_actividad },
              { label: 'Estado', val: resultado.estado },
            ].filter(d => d.val).map((d, i) => (
              <View key={i} style={styles.datoRow}>
                <Text style={styles.datoLabel}>{d.label}</Text>
                <Text style={styles.datoVal}>{d.val}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={styles.btnPrimary} onPress={onBack}>
            <Text style={styles.btnTxt}>Volver al inicio</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {etapa === 'error' && (
        <View style={styles.centrado}>
          <Ionicons name="alert-circle" size={64} color={C.rojo} />
          <Text style={[styles.titulo, { color: C.rojo }]}>Error al procesar</Text>
          <Text style={styles.subtitulo}>{errorMsg}</Text>
          <TouchableOpacity style={styles.btnPrimary} onPress={reiniciar}>
            <Text style={styles.btnTxt}>Intentar de nuevo</Text>
          </TouchableOpacity>
        </View>
      )}
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
  headerTitle: { color: C.blanco, fontSize: 18, fontWeight: '700' },
  body: { padding: 24, alignItems: 'center', gap: 16, flexGrow: 1 },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 },
  iconCircle: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: '#EEF2FA', alignItems: 'center', justifyContent: 'center',
  },
  aiCircle: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center',
  },
  titulo: { fontSize: 22, fontWeight: '700', color: C.texto, textAlign: 'center' },
  subtitulo: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 21 },
  infoBox: {
    flexDirection: 'row', backgroundColor: '#FAF5FF',
    borderRadius: 12, padding: 12, gap: 8, width: '100%',
    borderWidth: 1, borderColor: '#EDE9FE',
  },
  infoTxt: { color: '#4B5563', fontSize: 12, flex: 1, lineHeight: 18 },
  btnPrimary: {
    width: '100%', backgroundColor: C.verde, borderRadius: 14,
    paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  btnTxt: { color: C.blanco, fontWeight: '700', fontSize: 15 },
  hint: {
    fontSize: 11, color: '#9CA3AF', textAlign: 'center', lineHeight: 17,
    backgroundColor: C.blanco, borderRadius: 10, padding: 12, width: '100%',
  },
  datosCard: {
    backgroundColor: C.blanco, borderRadius: 14, padding: 16, width: '100%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3, gap: 10,
  },
  datosTitle: { fontSize: 13, fontWeight: '700', color: '#6B7280', marginBottom: 4 },
  datoRow: { gap: 2 },
  datoLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase' },
  datoVal: { fontSize: 13, color: C.texto, fontWeight: '500' },
});
