import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../lib/supabase';

const C = {
  azul: '#1B3A6B',
  verde: '#00A651',
  blanco: '#FFFFFF',
  gris: '#F5F5F5',
  texto: '#333333',
  rojo: '#EF4444',
};

// ── Parseo CFDI SAT 3.3/4.0 via regex ────────────────────────────────────────
function parsearCFDI(xml) {
  const get = (pattern) => (xml.match(pattern) || [])[1] ?? null;

  const uuid = get(/UUID="([0-9a-fA-F-]{36})"/i);
  const total = parseFloat(get(/\bTotal="([\d.]+)"/i) ?? '0');
  const subtotal = parseFloat(get(/\bSubTotal="([\d.]+)"/i) ?? '0');
  const iva = parseFloat((total - subtotal).toFixed(2));
  const fecha = get(/\bFecha="(\d{4}-\d{2}-\d{2})/i);
  const tipoRaw = get(/\bTipoDeComprobante="([IENT])"/i) ?? 'I';
  const tipo = { I: 'ingreso', E: 'egreso', N: 'nomina', T: 'traslado' }[tipoRaw] ?? 'ingreso';
  const rfcEmisor = get(/Emisor[^>]*\sRfc="([^"]+)"/i);
  const nombreEmisor = get(/Emisor[^>]*\sNombre="([^"]+)"/i);
  const rfcReceptor = get(/Receptor[^>]*\sRfc="([^"]+)"/i);
  const nombreReceptor = get(/Receptor[^>]*\sNombre="([^"]+)"/i);

  return { uuid, total, subtotal, iva, fecha, tipo, rfcEmisor, nombreEmisor, rfcReceptor, nombreReceptor };
}

const fmt = (n) =>
  Number(n ?? 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

const Row = ({ label, value, mono, money, bold }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={[styles.rowValue, mono && styles.mono, money && styles.moneyVal, bold && styles.bold]}>
      {value ?? '—'}
    </Text>
  </View>
);

export default function SubirCFDI({ onBack }) {
  const [etapa, setEtapa] = useState('inicio'); // inicio | preview | guardando | exito | error
  const [loading, setLoading] = useState(false);
  const [cfdiData, setCfdiData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const seleccionarXML = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/xml', 'application/xml', '*/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      await procesarArchivo(result.assets[0].uri, result.assets[0].name);
    } catch {
      mostrarError('No se pudo abrir el selector de archivos.');
    }
  };

  const tomarFoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a la cámara para fotografiar el CFDI.');
      return;
    }
    await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.9 });
    Alert.alert('Foto capturada', 'El análisis OCR de imagen estará disponible próximamente. Sube el XML para procesar.');
  };

  const procesarArchivo = async (uri, nombre) => {
    setLoading(true);
    try {
      const contenido = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
      if (!contenido.includes('cfdi') && !contenido.includes('Comprobante')) {
        mostrarError('El archivo no parece ser un CFDI válido del SAT.');
        return;
      }
      const parsed = parsearCFDI(contenido);
      if (!parsed.uuid) {
        mostrarError('No se encontró el UUID del CFDI. Verifica que sea un XML timbrado.');
        return;
      }
      setCfdiData({ ...parsed, nombreArchivo: nombre });
      setEtapa('preview');
    } catch {
      mostrarError('Error al leer el XML. Asegúrate de que sea un archivo válido.');
    } finally {
      setLoading(false);
    }
  };

  const guardarCFDI = async () => {
    setEtapa('guardando');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: usuario } = await supabase
        .from('usuarios').select('empresa_id').eq('id', user.id).single();

      const { error } = await supabase.from('cfdis').insert({
        empresa_id: usuario?.empresa_id ?? null,
        uuid_sat: cfdiData.uuid,
        tipo: cfdiData.tipo,
        subtotal: cfdiData.subtotal,
        iva: cfdiData.iva,
        total: cfdiData.total,
        fecha_emision: cfdiData.fecha,
        status: 'pendiente',
      });

      if (error) {
        mostrarError(error.code === '23505'
          ? 'Este CFDI ya fue registrado (UUID duplicado).'
          : `Error al guardar: ${error.message}`);
        return;
      }
      setEtapa('exito');
    } catch {
      mostrarError('Error de conexión al guardar.');
    }
  };

  const mostrarError = (msg) => { setErrorMsg(msg); setEtapa('error'); setLoading(false); };
  const reiniciar = () => { setEtapa('inicio'); setCfdiData(null); setErrorMsg(''); setLoading(false); };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={C.blanco} />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Subir CFDI</Text>
      </View>

      {/* INICIO */}
      {!loading && etapa === 'inicio' && (
        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.iconCircle}>
            <Ionicons name="document-text-outline" size={40} color={C.azul} />
          </View>
          <Text style={styles.title}>Subir CFDI</Text>
          <Text style={styles.subtitle}>Sube el XML timbrado por el SAT</Text>
          <TouchableOpacity style={styles.btnPrimary} onPress={seleccionarXML}>
            <Ionicons name="folder-open-outline" size={22} color={C.blanco} />
            <Text style={styles.btnPrimaryTxt}>Seleccionar XML</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnSecondary} onPress={tomarFoto}>
            <Ionicons name="camera-outline" size={22} color={C.azul} />
            <Text style={styles.btnSecondaryTxt}>Tomar foto del CFDI</Text>
          </TouchableOpacity>
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={16} color="#6B7280" />
            <Text style={styles.infoTxt}>
              Formato aceptado: .xml{'\n'}
              Se extrae UUID, RFC, montos y fecha automáticamente.
            </Text>
          </View>
        </ScrollView>
      )}

      {/* LOADING */}
      {loading && (
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color={C.azul} />
          <Text style={styles.loadingTxt}>Leyendo XML...</Text>
        </View>
      )}

      {/* PREVIEW */}
      {etapa === 'preview' && cfdiData && (
        <ScrollView contentContainerStyle={styles.body}>
          <View style={[styles.iconCircle, { backgroundColor: '#E8F8F0' }]}>
            <Ionicons name="checkmark-circle" size={40} color={C.verde} />
          </View>
          <Text style={styles.title}>CFDI detectado</Text>
          <Text style={styles.subtitle}>Verifica los datos antes de guardar</Text>
          <View style={styles.card}>
            <Row label="UUID" value={cfdiData.uuid} mono />
            <Row label="Tipo" value={cfdiData.tipo?.toUpperCase()} />
            <Row label="Fecha emisión" value={cfdiData.fecha} />
            <Row label="RFC Emisor" value={cfdiData.rfcEmisor} mono />
            {cfdiData.nombreEmisor && <Row label="Emisor" value={cfdiData.nombreEmisor} />}
            <Row label="RFC Receptor" value={cfdiData.rfcReceptor} mono />
            {cfdiData.nombreReceptor && <Row label="Receptor" value={cfdiData.nombreReceptor} />}
            <View style={styles.divider} />
            <Row label="Subtotal" value={fmt(cfdiData.subtotal)} money />
            <Row label="IVA" value={fmt(cfdiData.iva)} money />
            <Row label="Total" value={fmt(cfdiData.total)} money bold />
          </View>
          <TouchableOpacity style={styles.btnPrimary} onPress={guardarCFDI}>
            <Ionicons name="cloud-upload-outline" size={22} color={C.blanco} />
            <Text style={styles.btnPrimaryTxt}>Guardar CFDI</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnSecondary} onPress={reiniciar}>
            <Text style={styles.btnSecondaryTxt}>Cancelar</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* GUARDANDO */}
      {etapa === 'guardando' && (
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color={C.azul} />
          <Text style={styles.loadingTxt}>Guardando en Supabase...</Text>
        </View>
      )}

      {/* EXITO */}
      {etapa === 'exito' && (
        <View style={styles.centrado}>
          <Ionicons name="checkmark-done-circle" size={80} color={C.verde} />
          <Text style={[styles.title, { color: C.verde }]}>CFDI registrado</Text>
          <Text style={styles.exitoSub}>
            UUID: {cfdiData?.uuid?.slice(0, 8)}...{'\n'}
            Total: {fmt(cfdiData?.total)}{'\n'}
            Status: Pendiente de revisión
          </Text>
          <TouchableOpacity style={styles.btnPrimary} onPress={reiniciar}>
            <Ionicons name="add-circle-outline" size={22} color={C.blanco} />
            <Text style={styles.btnPrimaryTxt}>Subir otro CFDI</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onBack} style={{ marginTop: 8 }}>
            <Text style={styles.link}>Volver al inicio</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ERROR */}
      {etapa === 'error' && (
        <View style={styles.centrado}>
          <Ionicons name="alert-circle" size={64} color={C.rojo} />
          <Text style={[styles.title, { color: C.rojo }]}>Ocurrió un error</Text>
          <Text style={styles.errorMsg}>{errorMsg}</Text>
          <TouchableOpacity style={styles.btnPrimary} onPress={reiniciar}>
            <Text style={styles.btnPrimaryTxt}>Intentar de nuevo</Text>
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
  body: { padding: 20, alignItems: 'center', gap: 14, flexGrow: 1 },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#EEF2FA', alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  title: { fontSize: 22, fontWeight: '700', color: C.texto },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 4 },
  btnPrimary: {
    width: '100%', backgroundColor: C.verde, borderRadius: 12,
    paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  btnPrimaryTxt: { color: C.blanco, fontWeight: '700', fontSize: 15 },
  btnSecondary: {
    width: '100%', backgroundColor: C.blanco, borderRadius: 12,
    paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderColor: '#E0E0E8',
  },
  btnSecondaryTxt: { color: C.azul, fontWeight: '600', fontSize: 15 },
  link: { color: C.azul, fontWeight: '600', fontSize: 14 },
  infoBox: {
    flexDirection: 'row', backgroundColor: '#F0F4FF',
    borderRadius: 10, padding: 12, gap: 8, width: '100%',
  },
  infoTxt: { color: '#4B5563', fontSize: 12, flex: 1, lineHeight: 18 },
  card: {
    backgroundColor: C.blanco, borderRadius: 14, padding: 16, width: '100%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  rowLabel: { fontSize: 13, color: '#6B7280', flex: 1 },
  rowValue: { fontSize: 13, color: C.texto, flex: 2, textAlign: 'right' },
  mono: { fontFamily: 'monospace', fontSize: 10 },
  moneyVal: { color: C.azul, fontWeight: '600' },
  bold: { fontWeight: '700', fontSize: 15 },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 6 },
  loadingTxt: { color: C.azul, fontWeight: '600', marginTop: 12 },
  exitoSub: { color: '#6B7280', textAlign: 'center', lineHeight: 22 },
  errorMsg: { color: '#6B7280', textAlign: 'center', lineHeight: 20 },
});
