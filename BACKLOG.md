# TaskFlow — Backlog

## Board Paylaşım Modeli Revizyonu

**Sorun:** Şu an bir board "Public" yapılınca tüm kullanıcıların dashboard'unda görünüyor. Olması gereken: public board sadece direkt URL ile erişilebilir olsun, başkasının listesinde çıkmasın.

**Kök neden:** `boardsStore.ts` içindeki `fetchBoards` sorgusu kullanıcı filtresi olmadan çekiyor. RLS "public board'u herkes görebilir" diyor ama dashboard listesi bunu da dahil ediyor.

**Çözüm:**

1. `boardsStore.ts` → `fetchBoards` sorgusuna `.eq('user_id', userId)` filtresi ekle
2. `fetchBoards` fonksiyonuna `userId: string` parametresi ekle
3. `DashboardClient.tsx`'te `fetchBoards(user.id)` olarak çağır

**Sonuç:** Board listesi sadece kendi board'larını gösterir. Public board'a erişmek isteyenler direkt URL'e gitmeli — RLS zaten buna izin veriyor.

**Etkilenen dosyalar:**
- `src/stores/boardsStore.ts`
- `src/app/dashboard/DashboardClient.tsx`
