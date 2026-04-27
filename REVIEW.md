# TaskFlow — Kod İnceleme Raporu & Sunum Hazırlığı
_Tarih: 27 Nisan 2026 | Son teslim: 28 Nisan 2026 23:59_

---

## GENEL DEĞERLENDİRME

| Kriter | Durum | Açıklama |
|--------|-------|----------|
| Sürükle-bırak | ✅ İyi | DragOverlay, opacity efekti, TouchSensor, rollback |
| Sıralama kalıcılığı | ✅ İyi | Fractional indexing + rebalance RPC |
| Veri modeli | ✅ İyi | Board → Column → Card, RLS, FK ilişkileri |
| Kütüphane seçimi | ✅ Bilinçli | dnd-kit — TouchSensor, aktif geliştirme, hafif |
| Mobil kullanım | ⚠️ Kısmi | TouchSensor var ama scroll lock yok |
| Kod kalitesi | ⚠️ Orta | 2 console.log, 1 unused import, as never castler |

---

## 🔴 TESLİMDEN ÖNCE MUTLAKA DÜZELTİLMESİ GEREKENLER

### 1. ShareModal'daki console.log'lar (2 dakika)
**Dosya:** `src/components/board/ShareModal.tsx`
```ts
// BU İKİ SATIRI SİL:
console.log('fetchMembers START, boardId:', boardId)
console.log('fetchMembers END:', data, error)
```

### 2. CardDetailDialog'daki kullanılmayan import (1 dakika)
**Dosya:** `src/components/board/CardDetailDialog.tsx`
```ts
// BU SATIRI SİL:
import { Badge } from '@/components/ui/badge'
```

### 3. Rebalance RPC hata yönetimi (5 dakika)
**Dosya:** `src/components/board/BoardClient.tsx` — rebalance bloğu
```ts
// MEVCUT (hata yokmuş gibi devam ediyor):
await supabase.rpc('rebalance_column', { col_id: targetCol.id })
await fetchBoardData(boardId)

// OLMASI GEREKEN:
const { error: rebalanceError } = await supabase.rpc('rebalance_column', { col_id: targetCol.id })
if (rebalanceError) {
  toast.error('Sıralama güncellenemedi')
  fetchBoardData(boardId)
  return
}
await fetchBoardData(boardId)
```

---

## 🟡 GÜÇLENDİRİLEBİLECEK YERLER

### TypeScript güvenliği (ShareModal)
`as never` ve `as unknown as Member[]` castleri, Supabase'in generate ettiği type'ların RPC fonksiyonunu tanımamasından kaynaklanıyor. Supabase CLI ile type'lar yenilenebilir ama kısa vadede kabul edilebilir tradeoff.

### profileStore null assertion
`get().profile!.id` → null guard eklenebilir ama pratikte profil her zaman yüklü olduğu için pratikte sorun çıkarmıyor.

---

## ✅ GÜÇLÜ YANLAR — SUNUMDA VURGULA

### Fractional Indexing
- Kartlar her sürüklemede sadece **bir satır güncelleniyor** (tüm kartları yeniden numaralandırmak yerine)
- Pozisyonlar birbirine çok yaklaşınca `rebalance_column` RPC çağrılıyor — Supabase'de çalışan server-side rebalance
- Sayfa yenilemede sıralama tamamen korunuyor

### Optimistic Updates + Rollback
- Her create/update/delete işlemi önce UI'ı güncelliyor, başarısız olunca `structuredClone` snapshot'a rollback yapıyor
- Drag için özel `dragSnapshot` + `beginDrag()` pattern'i: drag **başlamadan önce** snapshot alınıyor, çünkü `onDragOver` sürekli state'i mutate ediyor — başka türlü rollback mümkün değil

### Paylaşım Sistemi + RLS
- `board_members` tablosu + RLS policy'leri: owner ekleyip silebilir, member sadece kendi üyeliğini görebilir
- Karmaşık RLS döngü problemi (`boards` → `board_members` → `boards`) tespit edilip `SECURITY DEFINER` fonksiyonla çözüldü
- Visitor mode: `isOwner` prop'u tüm component ağacından aşağı iner, paylaşılan kullanıcılar read-only erişim alır

### dnd-kit Seçimi
- **react-beautiful-dnd** artık bakımda değil (Atlassian durdurdu)
- **dnd-kit**: TouchSensor ile mobil destek, PointerSensor ile masaüstü — her ikisi aynı anda aktif
- **@hello-pangea/dnd**: react-beautiful-dnd fork'u, hâlâ aktif ama daha az esnek
- **Native drag API**: mobil desteklemiyor

---

## SUNUMDA SORULACAK SORULARA HAZIRLIK

### "Sürükle-bırak kütüphanesi neden dnd-kit?"
> react-beautiful-dnd bakımda değil. dnd-kit aktif olarak geliştiriliyor, TouchSensor ile mobil desteği var ve hafif (~15KB). PointerSensor + TouchSensor birlikte kullanarak hem masaüstü hem mobil drag'i aynı anda destekliyoruz.

### "Sıralama verisi nasıl saklıyorsunuz?"
> Fractional indexing. Her kartın `position` alanı float. Sürükleyince sadece iki kartın arasındaki orta nokta hesaplanıyor. Değerler çok yaklaştığında Supabase'de `rebalance_column` RPC çalışıyor ve tüm sütunu eşit aralıklara böldürüyor. Sayfa yenilemesinde `order=position.asc` ile doğrudan sıralı geliyor.

### "Mobilde nasıl çalışıyor?"
> TouchSensor ile 250ms uzun basma aktivasyonu. Horizontal scroll ve drag birbirini ezmemesi için 5px tolerance eklendi. Sütunlar responsive: mobilde `w-64`, tablette `w-72`.

### "Sütun sıralaması değiştirilebilir mi?"
> Şu an kart sıralaması uygulandı, sütun sıralaması backlog'da. Aynı fractional indexing altyapısıyla eklenebilir — sütunlara da `position` kolonu var.

### "Board paylaşımı nasıl çalışıyor?"
> Email ile kullanıcı aranıyor, `board_members` tablosuna ekleniyor. Üyeler board'u görebilir (sütunlar + kartlar + yorumlar), ama düzenleyemez — `isOwner` flag'i tüm UI kararlarını yönetiyor.

### "Aktivite geçmişi?"
> Şu an yorum sistemi var (kim ne yazdı, ne zaman). Kart hareketleri geçmişi eklenebilir — her `moveCard` çağrısında ayrı bir `card_history` tablosuna kayıt atılabilir.

### "Çok kart olduğunda performans?"
> Fractional indexing sayesinde drag sonrası tek satır update. Supabase'in PostgREST'i ile filtrelenmiş sorgular. Gerçek ölçekte virtual scroll eklenebilir ama tipik Kanban kullanımında sorun çıkmıyor.

---

## MİMARİ KARARLAR — SAVUNMA NOTLARI

| Karar | Neden | Tradeoff |
|-------|-------|----------|
| Zustand | Minimal boilerplate, server/client uyumlu | Redux'tan daha az ekosistem |
| Optimistic updates | Anlık UI feedback | Rollback karmaşıklığı |
| Supabase RLS | Güvenlik DB seviyesinde | Policy debug zor |
| Next.js server components | Auth kontrolü sunucu tarafında | İstemci/sunucu ayrımına dikkat |
| Fractional indexing | Tek satır update, ölçeklenebilir | Float precision sınırı |
| board_members tablosu | Esnek paylaşım, RLS kolay | JOIN karmaşıklığı |
