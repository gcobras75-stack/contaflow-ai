'use client';

/**
 * /admin/red-comercial — CRUD de miembros de la red comercial.
 *
 * Admin staff puede:
 *   - Listar coordinadores y vendedores (jerarquía: vendedor bajo coordinador)
 *   - Crear nuevo miembro: rol, nombre, email, teléfono, RFC opcional
 *   - Vincular miembro existente a un user_id (usuarios.id) para que pueda
 *     ver su dashboard /dashboard/red-comercial con sus comisiones
 *   - Activar/desactivar
 *   - El código de referido se genera automáticamente (8 chars alfanuméricos)
 *
 * Nota: no incluye delete real — preferimos soft-delete (activo=false) para
 * no perder histórico de comisiones. Si una fila se elimina, las comisiones
 * asociadas mantienen beneficiario_nombre y beneficiario_rfc como snapshot.
 */
import { createClient } from '@supabase/supabase-js';
import { useEffect, useMemo, useState } from 'react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

type Miembro = {
  id:              string;
  user_id:         string | null;
  rol:             'coordinador' | 'vendedor';
  codigo_referido: string;
  coordinador_id:  string | null;
  nombre:          string;
  email:           string;
  telefono:        string | null;
  tiene_rfc:       boolean;
  rfc:             string | null;
  regimen_fiscal:  string | null;
  razon_social:    string | null;
  activo:          boolean;
  created_at:      string;
};

const CARS_CODIGO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O/I/1 para evitar confusión

function generarCodigo(): string {
  let out = '';
  for (let i = 0; i < 8; i++) {
    out += CARS_CODIGO[Math.floor(Math.random() * CARS_CODIGO.length)];
  }
  return out;
}

type FormData = {
  rol:            'coordinador' | 'vendedor';
  nombre:         string;
  email:          string;
  telefono:       string;
  coordinador_id: string;
  tiene_rfc:      boolean;
  rfc:            string;
  regimen_fiscal: string;
  razon_social:   string;
};

const formInicial: FormData = {
  rol:            'vendedor',
  nombre:         '',
  email:          '',
  telefono:       '',
  coordinador_id: '',
  tiene_rfc:      false,
  rfc:            '',
  regimen_fiscal: '',
  razon_social:   '',
};

export default function AdminRedComercialPage() {
  const [loading, setLoading] = useState(true);
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [formVisible, setFormVisible] = useState(false);
  const [form, setForm] = useState<FormData>(formInicial);
  const [guardando, setGuardando] = useState(false);
  const [toast, setToast] = useState<{ tipo: 'ok' | 'err'; msg: string } | null>(null);

  const mostrarToast = (tipo: 'ok' | 'err', msg: string) => {
    setToast({ tipo, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const cargar = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('red_comercial')
      .select('*')
      .order('rol', { ascending: true })
      .order('nombre', { ascending: true });

    if (error) mostrarToast('err', error.message);
    else setMiembros((data ?? []) as Miembro[]);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const coordinadores = useMemo(
    () => miembros.filter(m => m.rol === 'coordinador' && m.activo),
    [miembros],
  );

  const crear = async () => {
    if (!form.nombre.trim() || !form.email.trim()) {
      mostrarToast('err', 'Nombre y email son requeridos');
      return;
    }
    if (form.rol === 'vendedor' && !form.coordinador_id) {
      mostrarToast('err', 'Vendedor debe tener coordinador');
      return;
    }
    if (form.tiene_rfc && !form.rfc.trim()) {
      mostrarToast('err', 'Si marcas "tiene RFC", el campo RFC es obligatorio');
      return;
    }

    setGuardando(true);

    // Generar código único (retry si hay colisión)
    let codigo = generarCodigo();
    for (let i = 0; i < 5; i++) {
      const { data: existe } = await supabase
        .from('red_comercial')
        .select('id')
        .ilike('codigo_referido', codigo)
        .maybeSingle();
      if (!existe) break;
      codigo = generarCodigo();
    }

    const payload = {
      rol:             form.rol,
      codigo_referido: codigo,
      coordinador_id:  form.rol === 'vendedor' ? form.coordinador_id : null,
      nombre:          form.nombre.trim(),
      email:           form.email.trim().toLowerCase(),
      telefono:        form.telefono.trim() || null,
      tiene_rfc:       form.tiene_rfc,
      rfc:             form.tiene_rfc ? form.rfc.trim().toUpperCase() : null,
      regimen_fiscal:  form.tiene_rfc ? (form.regimen_fiscal.trim() || null) : null,
      razon_social:    form.tiene_rfc ? (form.razon_social.trim() || null) : null,
      activo:          true,
    };

    const { error } = await supabase.from('red_comercial').insert(payload);

    if (error) {
      mostrarToast('err', error.message);
    } else {
      mostrarToast('ok', `${form.rol === 'coordinador' ? 'Coordinador' : 'Vendedor'} creado con código ${codigo}`);
      setForm(formInicial);
      setFormVisible(false);
      await cargar();
    }
    setGuardando(false);
  };

  const toggleActivo = async (m: Miembro) => {
    const { error } = await supabase
      .from('red_comercial')
      .update({ activo: !m.activo })
      .eq('id', m.id);

    if (error) mostrarToast('err', error.message);
    else {
      mostrarToast('ok', m.activo ? 'Desactivado' : 'Activado');
      await cargar();
    }
  };

  const copiarCodigo = (codigo: string) => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(codigo);
      mostrarToast('ok', `Código ${codigo} copiado`);
    }
  };

  const copiarLink = (codigo: string) => {
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://contaflow.mx';
    const link = `${base}/ref/${codigo}`;
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(link);
      mostrarToast('ok', `Link copiado: ${link}`);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${toast.tipo === 'ok' ? 'bg-green-600 text-white' : 'bg-red-500 text-white'}`}>
          {toast.msg}
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Red comercial</h1>
          <p className="text-sm text-gray-500 mt-1">Coordinadores y vendedores de ContaFlow AI</p>
        </div>
        <div className="flex gap-2">
          <a href="/admin/comisiones" className="text-sm font-semibold text-[#1B3A6B] hover:text-[#152d55] px-4 py-2 border border-gray-200 rounded-lg">
            Comisiones
          </a>
          <button
            onClick={() => setFormVisible(!formVisible)}
            className="text-sm font-semibold text-white bg-[#00A651] hover:bg-[#008F45] px-4 py-2 rounded-lg"
          >
            {formVisible ? 'Cancelar' : '+ Nuevo miembro'}
          </button>
        </div>
      </div>

      {/* Formulario de alta */}
      {formVisible && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Nuevo miembro de la red</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Rol *</label>
              <select
                value={form.rol}
                onChange={e => setForm(f => ({ ...f, rol: e.target.value as 'coordinador' | 'vendedor' }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="vendedor">Vendedor</option>
                <option value="coordinador">Coordinador Regional</option>
              </select>
            </div>

            {form.rol === 'vendedor' && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Coordinador *</label>
                <select
                  value={form.coordinador_id}
                  onChange={e => setForm(f => ({ ...f, coordinador_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">— Selecciona —</option>
                  {coordinadores.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
                {coordinadores.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">Crea primero un coordinador</p>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Nombre completo *"
              value={form.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="email"
              placeholder="Email *"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="tel"
              placeholder="Teléfono (opcional)"
              value={form.telefono}
              onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="tiene_rfc"
                checked={form.tiene_rfc}
                onChange={e => setForm(f => ({ ...f, tiene_rfc: e.target.checked }))}
                className="w-4 h-4"
              />
              <label htmlFor="tiene_rfc" className="text-sm text-gray-700">
                Tiene RFC (emite CFDI a Automatia)
              </label>
            </div>
          </div>

          {form.tiene_rfc && (
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
              <input
                type="text"
                placeholder="RFC (12 o 13 chars) *"
                value={form.rfc}
                onChange={e => setForm(f => ({ ...f, rfc: e.target.value.toUpperCase() }))}
                maxLength={13}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono uppercase"
              />
              <input
                type="text"
                placeholder="Régimen fiscal"
                value={form.regimen_fiscal}
                onChange={e => setForm(f => ({ ...f, regimen_fiscal: e.target.value }))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
              <input
                type="text"
                placeholder="Razón social (opcional)"
                value={form.razon_social}
                onChange={e => setForm(f => ({ ...f, razon_social: e.target.value }))}
                className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          )}

          {!form.tiene_rfc && (
            <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              Sin RFC: Automatia aplicará retención ISR 10% y emitirá CFDI global mensual.
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => { setFormVisible(false); setForm(formInicial); }}
              className="text-sm text-gray-500 px-4 py-2"
            >
              Cancelar
            </button>
            <button
              onClick={crear}
              disabled={guardando}
              className="text-sm font-semibold text-white bg-[#1B3A6B] hover:bg-[#152d55] disabled:opacity-50 px-4 py-2 rounded-lg"
            >
              {guardando ? 'Creando...' : 'Crear miembro'}
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="py-16 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-4 border-gray-200 animate-spin" style={{ borderTopColor: '#1B3A6B' }} />
          </div>
        ) : miembros.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-4xl mb-3">🤝</div>
            <p className="text-sm text-gray-500 mb-2">Sin miembros en la red</p>
            <p className="text-xs text-gray-400">Empieza creando un coordinador, luego agrega sus vendedores.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {miembros.map(m => {
              const coord = miembros.find(x => x.id === m.coordinador_id);
              return (
                <div key={m.id} className={`px-5 py-4 flex items-center gap-4 ${!m.activo ? 'opacity-50' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-800">{m.nombre}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        m.rol === 'coordinador' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {m.rol === 'coordinador' ? 'Coordinador' : 'Vendedor'}
                      </span>
                      {m.tiene_rfc ? (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          Con RFC: {m.rfc}
                        </span>
                      ) : (
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                          Sin RFC (retención ISR)
                        </span>
                      )}
                      {!m.activo && (
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">Inactivo</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {m.email}{m.telefono && ` · ${m.telefono}`}
                      {coord && ` · bajo ${coord.nombre}`}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copiarCodigo(m.codigo_referido)}
                      className="text-xs font-mono font-bold text-[#1B3A6B] bg-[#EEF2FA] hover:bg-[#DDE5F3] px-3 py-2 rounded-lg"
                      title="Copiar código"
                    >
                      {m.codigo_referido}
                    </button>
                    <button
                      onClick={() => copiarLink(m.codigo_referido)}
                      className="text-xs text-gray-500 hover:text-[#1B3A6B] border border-gray-200 hover:border-[#1B3A6B] px-3 py-2 rounded-lg"
                      title="Copiar link /ref/"
                    >
                      🔗 Link
                    </button>
                    <button
                      onClick={() => toggleActivo(m)}
                      className="text-xs text-gray-500 hover:text-red-600 border border-gray-200 hover:border-red-300 px-3 py-2 rounded-lg"
                    >
                      {m.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
