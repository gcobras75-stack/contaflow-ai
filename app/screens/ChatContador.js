import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  ScrollView, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
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

const SUGERENCIAS = [
  '¿Cuándo debo presentar mi declaración mensual de IVA?',
  '¿Qué gastos puedo deducir en mi empresa?',
  '¿Cómo funciona el RESICO para personas morales?',
  '¿Qué pasa si cancelo una factura después de 3 días?',
];

const SALUDO_INICIAL = {
  role: 'assistant',
  content: 'Hola, soy el CPC Ricardo Morales. Estoy aquí para asesorarte en materia fiscal y contable. ¿En qué te puedo ayudar hoy?',
};

export default function ChatContador({ onBack }) {
  const [messages, setMessages] = useState([SALUDO_INICIAL]);
  const [input, setInput] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [cargandoHistorial, setCargandoHistorial] = useState(true);
  const scrollRef = useRef(null);

  const scrollAbajo = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  // Cargar historial persistente al montar
  useEffect(() => {
    async function cargarHistorial() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        const res = await fetch(`${WEB_BASE}/api/chat-contador`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const json = await res.json();
        if (Array.isArray(json.mensajes) && json.mensajes.length > 0) {
          setMessages([SALUDO_INICIAL, ...json.mensajes]);
          scrollAbajo();
        }
      } catch {
        // silencioso — si no hay red, se queda con el saludo inicial
      } finally {
        setCargandoHistorial(false);
      }
    }
    cargarHistorial();
  }, [scrollAbajo]);

  const enviar = async (texto) => {
    const msg = (texto ?? input).trim();
    if (!msg || enviando) return;
    setInput('');

    // Optimistic: muestra el mensaje del usuario inmediatamente
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setEnviando(true);
    scrollAbajo();

    try {
      const { data: { session } } = await supabase.auth.getSession();

      // Nuevo flujo: el servidor tiene el historial, solo mandamos el mensaje nuevo.
      const res = await fetch(`${WEB_BASE}/api/chat-contador`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ content: msg }),
      });

      const json = await res.json();

      if (res.status === 429) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `⏸️ Has alcanzado el límite de 20 mensajes por hora. Inténtalo más tarde.`,
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
        content: 'Error de conexión. Por favor verifica tu internet e intenta de nuevo.',
      }]);
    } finally {
      setEnviando(false);
      scrollAbajo();
    }
  };

  const limpiarChat = () => {
    Alert.alert(
      '¿Limpiar historial?',
      'Se borrarán todos los mensajes previos con el CPC Ricardo. Esta acción es permanente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpiar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              const res = await fetch(`${WEB_BASE}/api/chat-contador`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
              });
              const json = await res.json();
              if (res.ok) {
                setMessages([SALUDO_INICIAL]);
              } else {
                Alert.alert('Error', json.error ?? 'No se pudo limpiar');
              }
            } catch {
              Alert.alert('Error', 'Sin conexión');
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={C.blanco} />
          </TouchableOpacity>
        )}
        <View style={styles.cpcInfo}>
          <View style={styles.cpcAvatar}>
            <Text style={styles.cpcAvatarTxt}>CPC</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>CPC Ricardo Morales</Text>
            <Text style={styles.headerSub}>Asesor fiscal · ContaFlow AI</Text>
          </View>
        </View>
        <TouchableOpacity onPress={limpiarChat} style={styles.clearBtn}>
          <Ionicons name="refresh-outline" size={18} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.messagesScroll}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={scrollAbajo}
        >
          {/* Sugerencias al inicio si solo hay 1 mensaje */}
          {messages.length === 1 && (
            <View style={styles.sugerenciasBox}>
              <Text style={styles.sugerenciasTitulo}>Preguntas frecuentes</Text>
              {SUGERENCIAS.map((s, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.sugerenciaBtn}
                  onPress={() => enviar(s)}
                >
                  <Text style={styles.sugerenciaTxt}>{s}</Text>
                  <Ionicons name="send-outline" size={14} color={C.azul} />
                </TouchableOpacity>
              ))}
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
              {m.role === 'assistant' && (
                <View style={styles.bubbleAvatarSmall}>
                  <Text style={styles.bubbleAvatarTxt}>CPC</Text>
                </View>
              )}
              <View style={[
                styles.bubbleContent,
                m.role === 'user' ? styles.bubbleContentUser : styles.bubbleContentAssistant,
              ]}>
                <Text style={[
                  styles.bubbleText,
                  m.role === 'user' && { color: C.blanco },
                ]}>{m.content}</Text>
              </View>
            </View>
          ))}

          {enviando && (
            <View style={[styles.bubble, styles.bubbleAssistant]}>
              <View style={styles.bubbleAvatarSmall}>
                <Text style={styles.bubbleAvatarTxt}>CPC</Text>
              </View>
              <View style={styles.typingDots}>
                <ActivityIndicator size="small" color={C.azul} />
                <Text style={styles.typingTxt}>Escribiendo...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Escribe tu pregunta fiscal..."
            placeholderTextColor="#9CA3AF"
            multiline
            maxLength={1000}
            onSubmitEditing={() => enviar()}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || enviando) && styles.sendBtnDisabled]}
            onPress={() => enviar()}
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
    backgroundColor: C.azul, paddingHorizontal: 16,
    paddingTop: 14, paddingBottom: 16,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  backBtn: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: 6 },
  cpcInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  cpcAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  cpcAvatarTxt: { color: C.blanco, fontWeight: '700', fontSize: 11 },
  headerTitle: { color: C.blanco, fontSize: 15, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.65)', fontSize: 11, marginTop: 1 },
  clearBtn: { padding: 8 },
  messagesScroll: { flex: 1 },
  messagesContent: { padding: 12, gap: 10, paddingBottom: 8 },
  sugerenciasBox: {
    backgroundColor: C.blanco, borderRadius: 12, padding: 14, gap: 8, marginBottom: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, elevation: 2,
  },
  sugerenciasTitulo: { fontSize: 12, fontWeight: '600', color: '#9CA3AF', marginBottom: 2 },
  sugerenciaBtn: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, paddingHorizontal: 10,
    backgroundColor: '#EEF2FA', borderRadius: 8, gap: 8,
  },
  sugerenciaTxt: { fontSize: 13, color: C.azul, flex: 1, lineHeight: 18 },
  bubble: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, maxWidth: '90%' },
  bubbleUser: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  bubbleAssistant: { alignSelf: 'flex-start' },
  bubbleAvatarSmall: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: C.azul,
    alignItems: 'center', justifyContent: 'center', marginBottom: 2,
  },
  bubbleAvatarTxt: { color: C.blanco, fontSize: 8, fontWeight: '700' },
  bubbleContent: { borderRadius: 16, padding: 12, maxWidth: '100%' },
  bubbleContentUser: { backgroundColor: C.azul, borderBottomRightRadius: 4 },
  bubbleContentAssistant: {
    backgroundColor: C.blanco, borderBottomLeftRadius: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, elevation: 2,
  },
  bubbleText: { fontSize: 14, color: C.texto, lineHeight: 20 },
  typingDots: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.blanco, borderRadius: 16, padding: 12,
  },
  typingTxt: { fontSize: 13, color: '#9CA3AF' },
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
