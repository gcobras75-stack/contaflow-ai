import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db } from './db'
import { profiles } from './schema'

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email:    { label: 'Correo', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const email    = String(credentials.email).toLowerCase().trim()
        const password = String(credentials.password)

        // Buscar usuario en la base de datos
        const result = await db
          .select()
          .from(profiles)
          .where(eq(profiles.email, email))
          .limit(1)

        const user = result[0]
        if (!user) return null

        // Verificar contraseña con bcrypt
        const isValid = await bcrypt.compare(password, user.password_hash)
        if (!isValid) return null

        return {
          id:       user.id,
          email:    user.email,
          name:     user.name,
          role:     user.role,
          vendorId: user.vendor_id ?? undefined,
        }
      },
    }),
  ],

  session: { strategy: 'jwt' },

  callbacks: {
    // Guardar datos extra en el JWT al hacer login
    async jwt({ token, user }) {
      if (user) {
        token.id       = user.id
        token.role     = user.role
        token.vendorId = user.vendorId
      }
      return token
    },

    // Exponer datos del JWT en la session para los componentes
    async session({ session, token }) {
      if (token) {
        session.user.id       = token.id       as string
        session.user.role     = token.role     as string
        session.user.vendorId = token.vendorId as string | undefined
      }
      return session
    },
  },

  pages: {
    signIn: '/login',
    error:  '/login',
  },
})
