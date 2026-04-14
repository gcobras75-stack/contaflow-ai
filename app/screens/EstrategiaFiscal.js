import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  ScrollView, ActivityIndicator, TextInput, Alert,
  KeyboardAvoidingView, Platform,
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

const WEB_BASE = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://contaflow.mx';

const SUGERENCIAS = [
  '¿Qué estrategia fiscal me recomiendas para este cliente?',
  '¿Está aprovechando todas las deducciones de su régimen?',
  '¿Qué obligaciones tiene pendientes este mes?',
  '¿Dónde hay oportunidad de ahorro fiscal legal?',
];

/**
 * EstrategiaFiscal — chat con CPC Ricardo filtrado por empresa cliente.
 *
 * Usa el endpoint /api/chat-contador con empresa_id, que automáticamente
 * inyecta en el system prompt: RFC, régimen, CFDIs últimos 30 días y
 * totales ingresos/egresos/IVA. El historial se persiste en chat_messages
 * por (user_id, empresa_id), así cada cliente tiene su conversación
 * independiente.
 */
export default function EstrategiaFiscal({ onBack }) {
  // Fase 1: lista de empresas
  const [empresas, setEmpresas] = useState([]);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);

  // Fase 2: empresa seleccionada → chat
  const [empresaSel, setEmpresaSel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [input, setInput] = useState('');
  const [enviando, setEnviando] = useState(false);
  const scrollRef = useRef(null);

  // Carga de empresas del despacho
  const cargarEmpresas = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: usr } = await supabase
        .from('usuarios').select('despacho_id').eq('id', user.id).single();
      if (!usr?.despacho_id) return;
      const { data } = await supabase
        .from('empresas_clientes')
        .select('id, nombre, rfc, giro, regimen_fiscal')
        .eq('despacho_id', usr.despacho_id)
        .eq('activa', true)
        .order('nombre');
      setEmpresas(data ?? []);
    } finally {
      setLoadingEmpresas(false);
    }
  }, []);

  useEffect(() => { cargarEmpresas(); }, [cargarEmpresas]);

  // Carga del historial cuando se selecciona una empresa
  const seleccionarEmpresa = async (empresa) => {
    setEmpresaSel(empresa);
    setMessages([]);
    setCargandoHistorial(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${WEB_BASE}/api/chat-contador?empresa_id=${empresa.id}`,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
        },
      );
      const json = await res.json();
      if (Array.isArray(json.mensajes)) {
        setMessages(json.mensajes);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
      }
    } catch {
      // silencioso — el chat arranca vacío si falla la carga
    } finally {
      setCargandoHistorial(false);
    }
  };

  const volver = () => {
    setEmpresaSel(null);
    setMessages([]);
    setInput('');
  };

  const enviarMensaje = async (texto) => {
    const msg = (texto ?? input).trim();
    if (!msg || !empresaSel || enviando) return;
    setInput('');

    // Optimistic UI
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setEnviando(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${WEB_BASE}/api/chat-contador`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({
          content: msg,
          empresa_id: empresaSel.id,
        }),
      });
      const json = await res.json();

      if (res.status === 429) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '⏸️ Has alcanzado el límite de 20 mensajes por hora. Inténtalo más tarde.',
        }]);
      } else if (!res.ok || json.error) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Lo siento, ocurrió un error: ${json.error ?? 'respuesta inválida'}`,
        }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: json.reply }]);
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Error de conexión. Verifica tu internet.',
      }]);
    } finally {
      setEnviando(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const limpiarHistorial = () => {
    if (!empresaSel) return;
    Alert.alert(
      '¿Limpiar historial?',
      `Se borrará toda la conversación con el CPC Ricardo sobre ${empresaSel.nombre}. Esta acción es permanente.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpiar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              const res = await fetch(
                `${WEB_BASE}/api/chat-contador?empresa_id=${empresaSel.id}`,
                {
                  method: 'DELETE',
                  headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
                },
              );
              if (res.ok) {
                setMessages([]);
              } else {
                Alert.alert('Error', 'No se pudo limpiar');
              }
            } catch {
              Alert.alert('Error', 'Sin conexión');
            }
          },
        },
      ],
    );
  };

  // ═══════════════════════════════════════════════════════════
  // Fase 1: lista de empresas
  // ═══════════════════════════════════════════════════════════
  if (!empresaSel) {
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
              Selecciona un cliente para abrir un chat con el CPC Ricardo Morales.
              Cada cliente tiene su propio historial, y Ricardo conoce automáticamente
              su RFC, régimen fiscal y CFDIs del último mes.
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
                onPress={() => seleccionarEmpresa(emp)}
                activeOpacity={0.75}
              >
                <View style={styles.empresaCardIcon}>
                  <Ionicons name="business-outline" size={22} color={C.azul} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.empresaCardNombre}>{emp.nombre}</Text>
                  <Text style={styles.empresaCardRfc}>{emp.rfc} · {emp.giro ?? 'Sin giro'}</Text>
                  {emp.regimen_fiscal && (
                    <Text style={styles.empresaCardRegimen}>{emp.regimen_fiscal}</Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={18} color="#CCC" />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // Fase 2: chat con CPC Ricardo filtrado por empresa
  // ═══════════════════════════════════════════════════════════
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={volver} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.blanco} />
        </TouchableOpacity>
        <View style={styles.cpcInfo}>
          <View style={styles.cpcAvatar}>
            <Text style={styles.cpcAvatarTxt}>CPC</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cpcNombre}>CPC Ricardo Morales</Text>
            <Text style={styles.cpcCliente} numberOfLines={1}>
              {empresaSel.nombre} · {empresaSel.rfc}
            </Text>
          </View>
        </View>
        {messages.length > 0 && (
          <TouchableOpacity onPress={limpiarHistorial} style={styles.clearBtn}>
            <Ionicons name="trash-outline" size={18} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {cargandoHistorial && (
            <View style={styles.cargandoBox}>
              <ActivityIndicator size="small" color={C.azul} />
              <Text style={styles.cargandoTxt}>Cargando historial...</Text>
            </View>
          )}

          {!cargandoHistorial && messages.length === 0 && (
            <View style={styles.bienvenida}>
              <Text style={styles.bienvenidaTitulo}>
                Asesoría fiscal para {empresaSel.nombre}
              </Text>
              <Text style={styles.bienvenidaSub}>
                Ricardo conoce el RFC, régimen y movimientos recientes de este cliente.
                Pregúntale lo que necesites.
              </Text>
              <View style={{ gap: 8, marginTop: 16 }}>
                {SUGERENCIAS.map((s, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.sugerencia}
                    onPress={() => enviarMensaje(s)}
                  >
                    <Text style={styles.sugerenciaTxt}>{s}</Text>
                    <Ionicons name="arrow-forward" size={14} color={C.azul} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {messages.map((m, i) => (
            <View
              key={i}
              style={[
                styles.bubble,
                m.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant,
              ]}
            >
              <Text
                style={[
                  styles.bubbleText,
                  m.role === 'user' && { color: C.blanco },
                ]}
              >
                {m.content}
              </Text>
            </View>
          ))}

          {enviando && (
            <View style={[styles.bubble, styles.bubbleAssistant]}>
              <ActivityIndicator size="small" color={C.azul} />
              <Text style={styles.typingTxt}>Ricardo está escribiendo...</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Pregunta sobre este cliente..."
            placeholderTextColor="#9CA3AF"
            multiline
            maxLength={1500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || enviando) && styles.sendBtnDisabled]}
            onPress={() => enviarMensaje()}
            disabled={!input.trim() || enviando}
          >
            <Ionicons name="send" size={18} color={C.blanco} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.gris },
  header: {
    backgroundColor: C.azul,
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  backBtn: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: 6 },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  headerTitle: { color: C.blanco, fontSize: 18, fontWeight: '700' },

  // Lista de empresas
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
  empresaCardRfc:    { fontSize: 12, color: '#6B7280', marginTop: 2 },
  empresaCardRegimen:{ fontSize: 11, color: C.morado, marginTop: 2, fontWeight: '500' },

  // Chat header
  cpcInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  cpcAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  cpcAvatarTxt: { color: C.blanco, fontWeight: '700', fontSize: 11 },
  cpcNombre: { color: C.blanco, fontSize: 14, fontWeight: '700' },
  cpcCliente: { color: 'rgba(255,255,255,0.65)', fontSize: 11, marginTop: 1 },
  clearBtn: { padding: 8 },

  // Chat body
  messages: { flex: 1 },
  messagesContent: { padding: 14, gap: 10 },
  cargandoBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 20, gap: 8,
  },
  cargandoTxt: { fontSize: 13, color: '#9CA3AF' },

  bienvenida: {
    backgroundColor: C.blanco, borderRadius: 14, padding: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  bienvenidaTitulo: { fontSize: 15, fontWeight: '700', color: C.texto },
  bienvenidaSub: { fontSize: 12, color: '#6B7280', marginTop: 6, lineHeight: 18 },
  sugerencia: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#EEF2FA', borderRadius: 10, padding: 10, gap: 8,
  },
  sugerenciaTxt: { flex: 1, fontSize: 13, color: C.azul, lineHeight: 18 },

  bubble: { borderRadius: 16, padding: 12, maxWidth: '90%' },
  bubbleUser: {
    backgroundColor: C.azul, alignSelf: 'flex-end', borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: C.blanco, alignSelf: 'flex-start', borderBottomLeftRadius: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
    flexDirection: 'row', gap: 8, alignItems: 'center',
  },
  bubbleText: { fontSize: 14, color: C.texto, lineHeight: 20 },
  typingTxt: { fontSize: 13, color: '#9CA3AF' },

  // Input
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    padding: 10, backgroundColor: C.blanco,
    borderTopWidth: 1, borderTopColor: '#E5E7EB',
  },
  input: {
    flex: 1, backgroundColor: C.gris, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: C.texto, maxHeight: 100,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: C.verde,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
});
