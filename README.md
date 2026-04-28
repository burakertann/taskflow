# TaskFlow

Ekipler için Kanban pano uygulaması. Sürükle & bırak, pano paylaşımı, yorum sistemi.

**[🚀 Vercel ile deploy edilmiş hali](https://taskflow-pi-ashen.vercel.app/)**

---

## Demo Hesapları

| Rol | Email | Şifre |
|-----|-------|-------|
| Pano Sahibi | `demo@taskflow.app` | `123456` |
| Misafir Üye | `viewer@taskflow.app` | `123456` |

> "Proje Yönetimi" panosu `viewer` hesabıyla paylaşılmıştır. Misafir erişimini görmek için viewer ile giriş yapın.

---

## Özellikler

- **Kanban Panoları** — Board → Sütun → Kart hiyerarşisi, birden fazla pano desteği
- **Sürükle & Bırak** — Sütunlar arası ve sütun içi kart taşıma, masaüstü ve mobil
- **Kalıcı Sıralama** — Fractional indexing: her sürükleme tek satır DB güncellemesi
- **Kart Detayı** — Başlık, açıklama, öncelik (Low / Medium / High) düzenleme
- **Yorum Sistemi** — Kart bazlı yorumlar, yazar adı ve zaman damgası
- **Pano Paylaşımı** — Email ile üye ekleme, üye kaldırma, read-only misafir erişimi
- **Optimistik UI** — Her işlem anında yansır, hata durumunda otomatik rollback
- **Profil Yönetimi** — Ad soyad ve bio düzenleme
- **Skeleton Loader** — Veri yüklenirken iskelet arayüz gösterimi

---

## Teknoloji Seçimleri

### React / Next.js 16
Next.js'in server component mimarisi kimlik doğrulamayı sunucu tarafında çözdü — hassas yönlendirme kararları (auth guard, isOwner hesabı) hiçbir zaman istemciye ulaşmıyor. App Router ile `layout.tsx` seviyesinde oturum kontrolü, `page.tsx` seviyesinde yetki kontrolü yapıldı. Mobil uyumluluk React'in bileşen modeli sayesinde responsive Tailwind sınıflarıyla kolayca yönetildi.

### Supabase (BaaS)
Küçük bir yazılım ekibi için hem maliyet hem de geliştirme hızı kritikti. Supabase; kimlik doğrulama, veritabanı ve storage'ı tek platformda sunuyor. Ayrı bir backend servisi yazmak yerine Supabase Row Level Security ile güvenlik tamamen veritabanı katmanına taşındı — uygulama kodu yalnızca UI mantığına odaklandı.

PostgreSQL'in ilişkisel modeli, `Board → Column → Card` hiyerarşisi ve çoklu foreign key ilişkileri için birebir uygundu.Bu da BaaS seçiminde Firebase'e karşılık öncelik kazandırdı.

### dnd-kit
Sürükle & bırak kütüphanesi seçiminde üç alternatif değerlendirildi:

| Kütüphane | Durum | Sorun |
|-----------|-------|-------|
| `react-beautiful-dnd` | ❌ Bakımda değil | Atlassian 2022'de geliştirmeyi durdurdu |
| `@hello-pangea/dnd` | ⚠️ Aktif (fork) | Daha az esnek, TouchSensor desteği kısıtlı |
| Native Drag API | ⚠️ Yerleşik | Mobil desteği yok |
| **`dnd-kit`** | ✅ **Seçildi** | Aktif geliştirme, ~15KB, TouchSensor + PointerSensor |

`PointerSensor` (masaüstü) ve `TouchSensor` (250ms uzun basma, 5px tolerans) aynı anda aktif — tek kod tabanıyla hem masaüstü hem mobil drag desteği sağlandı.

### Zustand
Global state yönetimi için Zustand seçildi. Redux'a kıyasla minimal boilerplate, Next.js server/client ayrımıyla uyumlu yapı ve doğrudan TypeScript desteği öne çıktı.

Zustand'ın en kritik kullanımı optimistik güncelleme + rollback pattern'i:

```ts
const snapshot = structuredClone(get().columns)  // derin kopya
set({ columns: updatedColumns })                  // anında UI güncelle
const { error } = await supabase.from('cards').update(...)
if (error) set({ columns: snapshot })             // hata → geri al
```

Drag & drop için özel `beginDrag()` + `dragSnapshot` pattern'i geliştirildi: `onDragOver` sürekli state'i mutate ettiğinden snapshot'ı drag *bitmeden* almak doğru rollback noktasını kaybettirir. Çözüm: drag *başlamadan önce* (`onDragStart`) snapshot alındı.

### Fractional Indexing
Kart sıralaması için LexoRank ile karşılaştırıldı:

- **LexoRank**: String tabanlı, çakışma algoritması karmaşık kodlaması zor ve ek paket gerektiriyordu küçük ekip için over-engineering olabilirdi.
- **Fractional Indexing**: Float tabanlı, iki kart arasına yeni pozisyon = `(a + b) / 2`, implementasyonu sade ve basitti sadece rebalance senaryosu yazılması gerekti.Supabase float64 türünde veriyi tuttuğu için yaklaşık olarak 53 aynı konuma drag işleminden sonra rebalance gerekeceti. Keza bu bile küçük ekipler için kabul edilebilir bir senaryo.

Pozisyonlar çok yaklaştığında (`< 1e-9` fark) Supabase'de çalışan `rebalance_column` RPC tüm sütunu eşit aralıklara yeniden böler. Sayfa yenilemesinde `order=position.asc` ile kartlar doğrudan sıralı gelir.

---

## Karşılaşılan Teknik Sorunlar

### 1. RLS Sonsuz Döngüsü
Pano paylaşım sistemi kurulurken kritik bir döngüyle karşılaşıldı:

- `boards` SELECT policy → `board_members` tablosunu sorguluyor
- `board_members` SELECT policy → `boards` tablosunu sorguluyor
- Sonuç: PostgreSQL stack overflow, 500 hatası

**Çözüm:** Cross-table sorgu gerektiren işlemler için `SECURITY DEFINER` PostgreSQL fonksiyonları yazıldı. `get_board_members` ve `remove_board_member` fonksiyonları RLS'yi bypass ederek çalışıyor, yetki kontrolü fonksiyon içinde `auth.uid()` ile manuel yapılıyor.

### 2. Silme İşlemi Sessizce Başarısız Oluyordu
Board üyesi kaldırma işlemi toast gösterip başarılı görünüyordu, ancak sayfa yenilenince üye geri geliyordu.

**Kök Neden:** PostgREST, DELETE öncesinde SELECT yapıyor. `board_members` SELECT policy yalnızca `user_id = auth.uid()` satırlarını gösterdiğinden pano sahibi başkasının üyelik kaydını *göremiyordu* dolayısıyla silemiyordu. RLS hata döndürmüyor, 0 satır etkiliyor.

**Çözüm:** `remove_board_member` SECURITY DEFINER fonksiyonu ile yetki kontrolü fonksiyon içinde yapılıyor.

### 3. TypeScript Tip Güvensizliği
Supabase'in otomatik oluşturulan `database.ts` dosyası özel RPC fonksiyonlarını tanımıyordu. `as never` ve `as unknown` castleri geçici çözüm olarak kullanılmıştı.

**Çözüm:** `database.ts` dosyasının `Functions` bölümüne `get_board_members` ve `remove_board_member` için tip tanımları eklendi. Tüm castler kaldırıldı, `npx tsc --noEmit` temiz geçti.

### 4. Optimistik Güncelleme Rollback Noktası
`onDragOver` sürekli tetiklenip store'u mutate ettiğinden `onDragEnd`'de alınan snapshot drag'den önceki değil drag *sırasındaki* state'i yakalıyordu.

**Çözüm:** `beginDrag()` fonksiyonu `onDragStart`'ta çağrılır ve o anki state'i `dragSnapshot`'a kopyalar. Hata durumunda bu snapshot'a geri dönülür.

---

## Geliştirme Süreci

Bu proje **AI destekli geliştirme** yöntemiyle inşa edildi. Geliştirme boyunca kodlama süreçlerinde Claude Sonnet 4.6 Planlama ve karar verme kısımlarında ise Opus 4.7 ile birlikte çalışıldı mimari kararlar tartışıldı, teknik sorunlar analiz edildi, kod gözden geçirildi.

Süreç boyunca tutulan belgeler:

- **`taskflow-roadmap.md`** — ile sürecin baştan sona detaylı bir yol haritası çıkarıldı ve genel akış bakımından bu roadmap'e sadık kalınmaya çalışıldı.
- **`TEST_PLAN.md`** — 8 bölüm, 60+ test senaryosu: auth, drag & drop, paylaşım, RLS güvenliği, edge case'ler
- **`Çeşitli .md dosyaları`** — Özellikle gün sonu raporları istendi ve bir sonraki gün o raporlar okunarak neler yapıldığı hatırlandı.

AI destekli geliştirme özellikle RLS döngüsü gibi karmaşık veritabanı sorunlarında debugging sürecini hızlandırdı. Her mimari karar ve kod incelemesi geliştirici tarafından onaylandı.

---

## Yerel Kurulum

**Gereksinimler:** Node.js 18+, Supabase hesabı

```bash
git clone https://github.com/kullanici/taskflow.git
cd taskflow
npm install
```

`.env.local` dosyası oluştur:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

```bash
npm run dev
```

Uygulama `http://localhost:3000` adresinde çalışır.

> Supabase tarafında gerekli tabloların, RLS policy'lerinin ve fonksiyonların tanımlanmış olması gerekir. Tüm SQL [`supabase/schema.sql`](supabase/schema.sql) dosyasında — Supabase SQL Editor'da çalıştırmanız yeterli.
