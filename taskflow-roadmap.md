# TaskFlow — Adım Adım Yol Haritası

> Sosyal Kanban Proje Yönetim Tahtası geliştirme rehberi.
> Her faz sırayla tamamlanır. Bir fazı bitirmeden sonrakine geçilmez.
> Her fazın sonunda **çalışan bir şey** olmalı.

---

## Yol Haritasının Felsefesi

Bu projede iki büyük tuzak vardır:

1. **Estetikten başlamak** → DnD ve fractional indexing bu projenin kalbidir. Onları sona bırakırsan UI'yı yeniden yazarsın.
2. **Riski sona bırakmak** → Position çakışması, RLS, optimistic rollback gibi kritik kısımlar erken doğrulanmalıdır.

Bu yüzden sıralama: **iskelet → riskli kalp → kas → cila** mantığında ilerler.

---

# FAZ 0 — Sıfırdan Kurulum

**Süre:** ~3-4 saat
**Amaç:** Boş ama production-ready bir iskelet. Hiçbir feature yok ama her şey doğru kurulmuş.

## 0.1 — Proje Klasörünü Oluştur

Terminal aç ve istediğin bir konuma git (örnek: `~/Desktop` veya `~/projects`). Aşağıdaki komutu çalıştır:

```bash
npx create-next-app@latest taskflow
```

Sorulara şu yanıtları ver:

```
✔ Would you like to use TypeScript? … Yes
✔ Would you like to use ESLint? … Yes
✔ Would you like to use Tailwind CSS? … Yes
✔ Would you like your code inside a `src/` directory? … No
✔ Would you like to use App Router? … Yes
✔ Would you like to use Turbopack? … Yes
✔ Would you like to customize the import alias (`@/*`)? … No
```

Sonra:

```bash
cd taskflow
npm run dev
```

`http://localhost:3000` açılıyor mu kontrol et. Açılıyorsa devam.

## 0.2 — Klasör Yapısını Oluştur

Proje kökünde aşağıdaki klasörleri oluştur (henüz boş olabilirler):

```
taskflow/
├── app/                    # (zaten var)
│   ├── (auth)/            # YENİ: login/signup için route group
│   ├── board/             # YENİ
│   │   └── [id]/         # YENİ: dinamik board sayfası
│   └── dashboard/         # YENİ
├── components/             # YENİ
│   ├── ui/                # shadcn buraya kuracak
│   ├── board/             # YENİ: column, card, dnd component'leri
│   └── shared/            # YENİ: navbar, layout vb.
├── lib/                    # YENİ
│   ├── supabase/          # YENİ
│   └── utils/             # YENİ
├── stores/                 # YENİ: Zustand store'ları
├── types/                  # YENİ: TypeScript tipleri
└── public/                 # (zaten var)
```

Tek komutla oluşturmak için:

```bash
mkdir -p app/\(auth\) app/board/\[id\] app/dashboard
mkdir -p components/ui components/board components/shared
mkdir -p lib/supabase lib/utils
mkdir -p stores types
```

## 0.3 — Gerekli Paketleri Kur

```bash
# Supabase
npm install @supabase/supabase-js @supabase/ssr

# State management
npm install zustand

# Drag and drop
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# Toast bildirimleri (Faz 6'da kullanacağız ama şimdiden kuralım)
npm install sonner

# Tarih formatlaması (Faz 10 için)
npm install date-fns

# Utility (shadcn ile birlikte gelecek ama yine de güvence)
npm install clsx tailwind-merge class-variance-authority lucide-react
```

## 0.4 — shadcn/ui Kur

```bash
npx shadcn@latest init
```

Sorulara:

```
✔ Which color would you like to use as base color? … Slate
```

Sonra ihtiyacımız olan ilk birkaç bileşeni ekle (gerisini fazlarda ekleyeceğiz):

```bash
npx shadcn@latest add button input card
```

## 0.5 — Supabase Projesi Aç

1. [supabase.com](https://supabase.com) → giriş yap → **New Project**.
2. İsim: `taskflow`, bölge sana en yakın olanı seç (örn. `eu-central-1`).
3. Database password belirle ve **bir yere kaydet**.
4. Proje oluşturulduktan sonra sol menüden **Settings → API**.
5. Şu iki değeri kopyala:
   - `Project URL`
   - `Project API Keys → anon public`

## 0.6 — Environment Variable'ları Ayarla

Proje kökünde `.env.local` dosyası oluştur:

```bash
touch .env.local
```

İçine yaz:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxx...
```

`.gitignore`'a `.env.local`'ın eklenmiş olduğunu kontrol et (Next.js varsayılan olarak ekliyor ama emin ol).

## 0.7 — Supabase Client Dosyalarını Oluştur

`lib/supabase/client.ts` (browser/Client Component'lerde kullanılır):

```ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

`lib/supabase/server.ts` (Server Component/Route Handler/Server Action):

```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component'te set edilemez, sorun değil
          }
        },
      },
    }
  )
}
```

`lib/supabase/middleware.ts` (oturum yenileme için):

```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Auth gerektiren rotalar
  const protectedPaths = ['/dashboard', '/board']
  const isProtected = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  )

  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return response
}
```

## 0.8 — Middleware Dosyası

Proje **kök dizinine** (yani `app/` ile aynı seviyeye) `middleware.ts`:

```ts
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

## 0.9 — Toast Provider'ı Ekle

`app/layout.tsx` dosyasını aç, `Toaster`'ı ekle:

```tsx
import { Toaster } from 'sonner'
// ... diğer importlar

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  )
}
```

## 0.10 — Git Repo Başlat

```bash
git init
git add .
git commit -m "faz 0: proje iskeleti hazır"
```

GitHub'da `taskflow` adlı bir repo aç ve bağla:

```bash
git remote add origin https://github.com/KULLANICI_ADIN/taskflow.git
git branch -M main
git push -u origin main
```

## 0.11 — Test Kriteri ✅

- [ ] `npm run dev` hatasız çalışıyor.
- [ ] `http://localhost:3000` açılıyor.
- [ ] `lib/supabase/client.ts` ve `lib/supabase/server.ts` oluşturuldu.
- [ ] `.env.local` dolu ve `.gitignore`'da.
- [ ] shadcn `Button`, `Input`, `Card` bileşenleri `components/ui/` altında.
- [ ] Git repo başlatıldı ve ilk commit atıldı.

**Bu maddelerin hepsi ✅ olmadan Faz 1'e geçme.**

---

# FAZ 1 — Auth ve Korumalı Rotalar

**Süre:** ~1 gün
**Amaç:** Kullanıcı kayıt olabilsin, giriş yapabilsin, çıkış yapabilsin. Korumalı sayfalar guard'lı olsun.

## 1.1 — Supabase'de Email/Password Aktif Et

1. Supabase Dashboard → **Authentication → Providers**.
2. Email provider'ın açık olduğunu doğrula.
3. **Authentication → URL Configuration**: `Site URL` olarak `http://localhost:3000` ekle.
4. (Opsiyonel ama önerilen) Email Confirmations'ı geliştirme aşamasında kapatabilirsin.

## 1.2 — Login ve Signup Sayfalarını Yaz

`app/(auth)/login/page.tsx` ve `app/(auth)/signup/page.tsx` oluştur. Form yapısı (basit):

- Email input
- Password input
- Submit button
- Diğer sayfaya link

Form submit'te `supabase.auth.signInWithPassword()` veya `signUp()` çağır. Hata durumunda `toast.error()`.

## 1.3 — Dashboard Stub'ı

`app/dashboard/page.tsx` — şimdilik sadece:

```tsx
<div>
  <h1>Hoşgeldin {user.email}</h1>
  <button onClick={signOut}>Çıkış</button>
</div>
```

## 1.4 — Test Kriteri ✅

- [ ] `/signup`'tan kayıt ol → email doğrula (eğer açık bıraktıysan) → giriş yap.
- [ ] `/dashboard` görünüyor.
- [ ] Çıkış yap → `/dashboard`'a gitmeye çalış → `/login`'e atılıyor.

---

# FAZ 2 — Veritabanı Şeması ve RLS

**Süre:** ~yarım gün
**Amaç:** Tablolar kurulu, RLS politikaları aktif, foreign key cascade'ler doğru.

## 2.1 — Tabloları Oluştur

Supabase Dashboard → **SQL Editor** → New Query. Sırayla çalıştır:

```sql
-- boards
create table boards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  is_public boolean default false not null,
  created_at timestamptz default now() not null
);

-- columns
create table columns (
  id uuid primary key default gen_random_uuid(),
  board_id uuid references boards(id) on delete cascade not null,
  title text not null,
  position float not null,
  created_at timestamptz default now() not null
);

-- cards
create table cards (
  id uuid primary key default gen_random_uuid(),
  column_id uuid references columns(id) on delete cascade not null,
  title text not null,
  description text,
  priority text default 'Medium' check (priority in ('Low', 'Medium', 'High')),
  position float not null,
  created_at timestamptz default now() not null
);

-- comments
create table comments (
  id uuid primary key default gen_random_uuid(),
  card_id uuid references cards(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now() not null
);

-- index'ler (DnD performansı için)
create index idx_columns_board on columns(board_id, position);
create index idx_cards_column on cards(column_id, position);
create index idx_comments_card on comments(card_id, created_at);
```

## 2.2 — RLS'yi Aç

```sql
alter table boards enable row level security;
alter table columns enable row level security;
alter table cards enable row level security;
alter table comments enable row level security;
```

## 2.3 — RLS Politikaları

```sql
-- BOARDS
create policy "boards_select" on boards for select
  using (auth.uid() = user_id or is_public = true);

create policy "boards_insert" on boards for insert
  with check (auth.uid() = user_id);

create policy "boards_update" on boards for update
  using (auth.uid() = user_id);

create policy "boards_delete" on boards for delete
  using (auth.uid() = user_id);

-- COLUMNS
create policy "columns_select" on columns for select
  using (
    exists (
      select 1 from boards
      where boards.id = columns.board_id
      and (boards.user_id = auth.uid() or boards.is_public = true)
    )
  );

create policy "columns_modify" on columns for all
  using (
    exists (
      select 1 from boards
      where boards.id = columns.board_id
      and boards.user_id = auth.uid()
    )
  );

-- CARDS
create policy "cards_select" on cards for select
  using (
    exists (
      select 1 from columns
      join boards on boards.id = columns.board_id
      where columns.id = cards.column_id
      and (boards.user_id = auth.uid() or boards.is_public = true)
    )
  );

create policy "cards_modify" on cards for all
  using (
    exists (
      select 1 from columns
      join boards on boards.id = columns.board_id
      where columns.id = cards.column_id
      and boards.user_id = auth.uid()
    )
  );

-- COMMENTS
create policy "comments_select" on comments for select
  using (
    exists (
      select 1 from cards
      join columns on columns.id = cards.column_id
      join boards on boards.id = columns.board_id
      where cards.id = comments.card_id
      and (boards.user_id = auth.uid() or boards.is_public = true)
    )
  );

create policy "comments_insert" on comments for insert
  with check (auth.uid() = user_id);

create policy "comments_delete" on comments for delete
  using (auth.uid() = user_id);
```

## 2.4 — TypeScript Tiplerini Üret

Supabase CLI kur (bir kerelik):

```bash
npm install -D supabase
```

Sonra:

```bash
npx supabase gen types typescript --project-id PROJECT_ID > types/database.ts
```

`PROJECT_ID`'yi Supabase URL'inden al (`https://PROJECT_ID.supabase.co`).

## 2.5 — Test Kriteri ✅

- [ ] 4 tablo da oluştu.
- [ ] RLS her tabloda aktif (Dashboard'da yeşil shield ikonu).
- [ ] Login olmuş kullanıcı kendi `boards` kaydını ekleyebiliyor (SQL Editor'da test).
- [ ] Başka kullanıcının `is_public=false` board'unu göremiyor.
- [ ] `types/database.ts` üretildi.

---

# FAZ 3 — Zustand Store ve Dashboard CRUD

**Süre:** ~1 gün
**Amaç:** Kullanıcı pano oluşturup silebilsin. Optimistic update pattern'i öğrenilsin.

## 3.1 — Boards Store'u Yaz

`stores/boardsStore.ts` — şu action'larla:

- `boards: Board[]`
- `loading: boolean`
- `fetchBoards()`
- `createBoard(title)` — optimistic
- `deleteBoard(id)` — optimistic

**Optimistic pattern:**

```ts
// Pseudo-code
async createBoard(title) {
  const tempId = crypto.randomUUID()
  const snapshot = get().boards
  set({ boards: [...snapshot, { id: tempId, title, ... }] })

  const { data, error } = await supabase.from('boards').insert(...).select().single()
  if (error) {
    set({ boards: snapshot })
    toast.error('Pano oluşturulamadı')
    return
  }
  // Geçici ID'yi gerçek ID ile değiştir
  set({ boards: get().boards.map(b => b.id === tempId ? data : b) })
}
```

## 3.2 — Dashboard UI

`app/dashboard/page.tsx`:

- Üstte "Yeni Pano" butonu → tıklayınca Dialog aç → başlık iste → oluştur.
- Grid layout'ta kullanıcının panoları (`Card` bileşeni).
- Her pano kartında: başlık, oluşturulma tarihi, sil butonu.
- Pano kartına tıklayınca `/board/[id]`'ye git.

## 3.3 — Test Kriteri ✅

- [ ] Pano oluşturuluyor, listede görünüyor.
- [ ] Sayfa yenilenince kalıcı.
- [ ] Network'ü Offline yapınca `toast.error` çıkıyor ve liste eski haline dönüyor.
- [ ] Silme aynı şekilde çalışıyor.

---

# FAZ 4 — Board View (Statik, DnD'siz)

**Süre:** ~1 gün
**Amaç:** Board sayfası column ve card'ları doğru veriyle gösteriyor. DnD henüz yok.

## 4.1 — Board Store

`stores/boardStore.ts` — tek board'un detaylarını tutar:

- `board: Board | null`
- `columns: Column[]` (her column içinde `cards: Card[]`)
- `fetchBoardData(boardId)` — tek sorguyla join'li çek
- `addColumn(title)`, `addCard(columnId, title)`

## 4.2 — Veri Çekme

```ts
const { data, error } = await supabase
  .from('boards')
  .select('*, columns(*, cards(*))')
  .eq('id', boardId)
  .single()
```

`columns`'u `position`'a göre sırala, her `column.cards`'ı yine `position`'a göre sırala.

## 4.3 — UI Yapısı

`app/board/[id]/page.tsx` — server component, board verisi server-side çekilir, client store'a hydrate edilir.

`components/board/Board.tsx` — yatay scroll'lu column container.
`components/board/Column.tsx` — başlık + dikey card listesi + "Card ekle" butonu.
`components/board/Card.tsx` — başlık + priority badge.

Tasarım kaba olsun — Tailwind utility'leri yeterli (`flex`, `gap-4`, `bg-slate-100` vs.).

## 4.4 — Yeni Eleman Position'u

Şimdilik basit:

```ts
const newPosition = (maxExistingPosition ?? 0) + 1000
```

## 4.5 — Test Kriteri ✅

- [ ] 3 column, her birinde 5 card ekledim.
- [ ] Sayfa yenilenince sıra korunuyor.
- [ ] Başka kullanıcı oturumunda bu board'a erişmeye çalıştım, RLS engelliyor.

---

# FAZ 5 — DnD'nin İlk Hali (Naive Position)

**Süre:** ~1.5 gün
**Amaç:** Sürükle-bırak çalışıyor. Position hesabı henüz basit (ortalama).

## 5.1 — DnD Sarmalayıcılar

- `<DndContext>` Board component'ini sarmalar.
- Her column `<SortableContext>` olur.
- Her card `useSortable` hook'u kullanır.
- Column'lar arası taşıma için `onDragOver` event'i de dinlenmeli.

## 5.2 — Naive Position Hesabı

Kart düştüğünde:

```ts
const newPosition = (prevCard.position + nextCard.position) / 2
// Eğer en başa: nextCard.position - 1000
// Eğer en sona: prevCard.position + 1000
// Boş column'a: 1000
```

## 5.3 — Store Action'ı

`moveCard(cardId, targetColumnId, newPosition)`:

1. State'i optimistic güncelle.
2. Supabase UPDATE gönder.
3. Henüz rollback yok (Faz 6'da eklenecek).

## 5.4 — Test Kriteri ✅

- [ ] Aynı column içinde card sıralaması değişiyor.
- [ ] Card başka column'a taşınıyor.
- [ ] Sayfa yenilenince yeni sıra korunuyor.
- [ ] 20 farklı taşıma denedim, hata yok.

---

# FAZ 6 — Optimistic UI ve Rollback Hattı

**Süre:** ~yarım gün
**Amaç:** Hata durumlarında state güvenli şekilde geri alınıyor.

## 6.1 — Snapshot + Rollback

`moveCard` action'ında:

```ts
const snapshot = structuredClone(get().columns)
// ... optimistic update ...
const { error } = await supabase.from('cards').update(...).eq('id', cardId)
if (error) {
  set({ columns: snapshot })
  toast.error('Kart taşınamadı, geri alındı')
}
```

Aynı pattern'i `addColumn`, `addCard`, `deleteCard` action'larına da uygula.

## 6.2 — Test Kriteri ✅

- [ ] Chrome DevTools → Network → Offline.
- [ ] Card taşıdım, anında yer değiştirdi.
- [ ] Sonra eski yerine döndü, toast çıktı.
- [ ] Network'ü açıp tekrar denedim, kalıcı oldu.

---

# FAZ 7 — Fractional Indexing ve Rebalancing RPC

**Süre:** ~1 gün
**Amaç:** Position algoritması production-ready. Çakışma riski yok.

## 7.1 — Fractional Index Helper

`lib/utils/fractional-index.ts`:

```ts
export const REBALANCE_THRESHOLD = 0.000001

export function getPositionBetween(
  prev: number | null,
  next: number | null
): number {
  if (prev === null && next === null) return 1000
  if (prev === null) return next! - 1000
  if (next === null) return prev + 1000
  return (prev + next) / 2
}

export function needsRebalance(prev: number, next: number): boolean {
  return Math.abs(next - prev) < REBALANCE_THRESHOLD
}
```

## 7.2 — Rebalance RPC

Supabase SQL Editor'da:

```sql
create or replace function rebalance_column(col_id uuid)
returns void as $$
  update cards
  set position = sub.new_pos
  from (
    select id, (row_number() over (order by position) * 1000)::float as new_pos
    from cards where column_id = col_id
  ) sub
  where cards.id = sub.id;
$$ language sql security definer;
```

Aynısını column'lar için de yaz (`rebalance_board`).

## 7.3 — Tetikleme Mantığı

`moveCard` içinde:

```ts
if (needsRebalance(prev, next)) {
  await supabase.rpc('rebalance_column', { col_id: targetColumnId })
  await fetchBoardData(boardId) // store'u yenile
}
```

## 7.4 — Test Kriteri ✅

- [ ] İki kart arasına 25 kez kart soktum.
- [ ] Console'da rebalance tetiklendi log'u gördüm.
- [ ] Rebalance sonrası DnD hâlâ sorunsuz çalışıyor.

---

# FAZ 8 — Card Detail Modal

**Süre:** ~1 gün
**Amaç:** Karta tıklanınca detay modal'ı açılıyor, düzenleme yapılabiliyor.

## 8.1 — shadcn Bileşenleri

```bash
npx shadcn@latest add dialog textarea select badge
```

## 8.2 — Modal İçeriği

`components/board/CardDetailDialog.tsx`:

- Başlık (Input)
- Açıklama (Textarea)
- Priority (Select: Low/Medium/High)
- Yorumlar bölümü (Faz 10'da dolacak, şimdilik placeholder)

## 8.3 — Click vs Drag Ayrımı

`useSortable`'ın `activationConstraint: { distance: 8 }` ayarı tıklama ve sürüklemeyi ayırır. Tıklama → modal açılır.

## 8.4 — Save Stratejisi

Her field için debounce'lu save (örn. 500ms):

```ts
const debouncedSave = useDebouncedCallback((field, value) => {
  updateCard(cardId, { [field]: value })
}, 500)
```

## 8.5 — Test Kriteri ✅

- [ ] Karta tıklayınca modal açılıyor.
- [ ] Sürüklerken modal açılmıyor.
- [ ] Açıklama değiştirip kapatınca kalıcı oluyor.
- [ ] Priority değişince badge rengi anında güncelleniyor.

---

# FAZ 9 — Sosyal Katman: Public Toggle ve Visitor Mode

**Süre:** ~1 gün
**Amaç:** Board'lar paylaşılabilir, ziyaretçiler izleyebiliyor ama düzenleyemiyor.

## 9.1 — Public Toggle

Board sayfasında ayarlar menüsüne `Switch` ekle, `is_public` flag'ini güncelle.

## 9.2 — Owner Detection

`app/board/[id]/page.tsx` (Server Component):

```ts
const { data: board } = await supabase.from('boards').select('*').eq('id', id).single()
const { data: { user } } = await supabase.auth.getUser()
const isOwner = board.user_id === user?.id
```

`isOwner` prop'unu component tree'ye geçir.

## 9.3 — Visitor Kısıtlamaları

- `<DndContext>` veya `useSensors` boş dön → DnD pasif.
- "Card/Column ekle" butonları render edilmesin.
- Modal'da Input/Textarea `readOnly`, Select `disabled`.

## 9.4 — Test Kriteri ✅

- [ ] Board'u public yaptım.
- [ ] Gizli sekmede başka kullanıcıyla açtım.
- [ ] Card sürükleyemiyorum.
- [ ] Modal'da düzenleme yapamıyorum.
- [ ] Network tab'da UPDATE denemeleri 403 dönüyor (RLS engelliyor).

---

# FAZ 10 — Yorum Sistemi

**Süre:** ~1 gün
**Amaç:** Ziyaretçiler dahil tüm kullanıcılar kart yorumu bırakabiliyor.

## 10.1 — Comments Store

`stores/commentsStore.ts` — `commentsByCard: Record<string, Comment[]>`. Lazy yükleme: card detail modal açıldığında çek.

## 10.2 — UI

Modal içinde:

- Yorum listesi (ters kronolojik, `formatDistanceToNow` ile "5 dk önce").
- Yorum yazma formu (textarea + gönder).
- Kendi yorumunda silme butonu.

## 10.3 — Optimistic Insert

Aynı pattern: temp ID ile ekle, response gelince gerçek ID ile değiştir.

## 10.4 — Test Kriteri ✅

- [ ] Kendi board'umda yorum ekledim, listede göründü.
- [ ] Public board'da ziyaretçi olarak yorum ekledim, çalıştı.
- [ ] Başkasının yorumunu silmeye çalıştım, RLS engelledi, toast çıktı.

---

# FAZ 11 — Mobil UX İncelikleri

**Süre:** ~yarım gün

## 11.1 — Touch Sensor

```ts
const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  useSensor(TouchSensor, {
    activationConstraint: { delay: 250, tolerance: 5 },
  })
)
```

## 11.2 — Responsive Layout

- Board container: `overflow-x-auto snap-x snap-mandatory`.
- Column: `snap-start min-w-[80vw] sm:min-w-[300px]`.
- Modal: mobilde tam genişlik, desktop'ta `max-w-lg`.

## 11.3 — Test Kriteri ✅

- [ ] Gerçek mobil cihazda test ettim.
- [ ] Uzun basma → sürükleme başlıyor.
- [ ] Kısa kaydırma → scroll oluyor (sürükleme tetiklenmiyor).
- [ ] Modal mobilde okunabilir.

---

# FAZ 12 — Cila ve Deployment

**Süre:** ~1 gün

## 12.1 — Loading States

Her async veri çekmesi için skeleton:

```tsx
{loading ? <BoardSkeleton /> : <Board ... />}
```

## 12.2 — Empty States

- Dashboard: "Henüz panonuz yok" + büyük "Pano oluştur" butonu.
- Boş column: "Bu sütunda henüz kart yok".

## 12.3 — Error Boundaries

`app/error.tsx`, `app/not-found.tsx` ekle.

## 12.4 — Vercel Deployment

1. Vercel'e GitHub repo bağla.
2. Environment Variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Supabase'de **Authentication → URL Configuration** → Site URL'i Vercel domain'i ekle.
4. Deploy → production URL'i test et.

## 12.5 — Final Test Kriteri ✅

- [ ] Production URL'inden tüm akış çalışıyor.
- [ ] Başka kullanıcıyla public board paylaştım.
- [ ] RLS production'da çalışıyor.
- [ ] Mobilde sorun yok.

---

# Genel Tavsiyeler

**Her fazın sonunda commit at:**

```bash
git add .
git commit -m "faz X: ..."
git push
```

**Riskli kısım Faz 5–7 arasıdır.** DnG bug'ları sinsidir. Her küçük değişiklikten sonra "kart taşı, sayfayı yenile, doğru yerde mi?" testini refleks haline getir.

**TypeScript tiplerini her şema değişikliğinde yenile:**

```bash
npx supabase gen types typescript --project-id PROJECT_ID > types/database.ts
```

**Realtime ileride eklenebilir:** Yorum yazılınca canlı güncelleme istersen Faz 10'dan sonra Supabase Realtime subscription eklemek minimum efordur.

---

## Toplam Tahmini Süre

| Faz | Süre |
|-----|------|
| Faz 0 | ~3-4 saat |
| Faz 1 | 1 gün |
| Faz 2 | yarım gün |
| Faz 3 | 1 gün |
| Faz 4 | 1 gün |
| Faz 5 | 1.5 gün |
| Faz 6 | yarım gün |
| Faz 7 | 1 gün |
| Faz 8 | 1 gün |
| Faz 9 | 1 gün |
| Faz 10 | 1 gün |
| Faz 11 | yarım gün |
| Faz 12 | 1 gün |
| **Toplam** | **~11-12 gün** (full-time) |

İyi kodlamalar! 🚀
