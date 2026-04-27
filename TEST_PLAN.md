# TaskFlow — Kapsamlı Test Planı
_Tarih: 27 Nisan 2026_

> Her testte beklenen sonucu kontrol et. ❌ çıkarsa not al, sonra birlikte düzeltiriz.

---

## TEST ORTAMI HAZIRLIĞI

- **A hesabı:** Asıl kullanıcı (owner)
- **B hesabı:** Paylaşım testleri için farklı email ile kayıtlı kullanıcı
- **Tarayıcı 1:** A hesabı açık
- **Tarayıcı 2 / gizli pencere:** B hesabı açık
- Başlamadan önce: yeni bir board oluştur, 2 sütun, her sütunda 2-3 kart

---

## BÖLÜM 1 — KİMLİK DOĞRULAMA (AUTH)

### 1.1 Kayıt
| # | Adım | Beklenen |
|---|------|----------|
| 1 | Geçerli email + şifre (6+ karakter) + ad soyad ile kayıt | Başarı toast, `/login`'e yönlendirme |
| 2 | Aynı email ile tekrar kayıt | Hata mesajı |
| 3 | 5 karakterli şifre | Form submit edilmemeli |
| 4 | Ad soyad boş bırak, kayıt ol | Kayıt olur mu, profil oluşuyor mu? |
| 5 | Geçersiz email formatı (abc@) | Form submit edilmemeli |

### 1.2 Giriş
| # | Adım | Beklenen |
|---|------|----------|
| 1 | Geçerli hesap ile giriş | `/dashboard`'a yönlendirme |
| 2 | Yanlış şifre | Hata toast, sayfada kal |
| 3 | Giriş yapmadan `/dashboard`'a git | `/login`'e yönlendirme |
| 4 | Giriş yapmadan `/board/herhangi-id`'ye git | `/login`'e yönlendirme |

### 1.3 Çıkış
| # | Adım | Beklenen |
|---|------|----------|
| 1 | Çıkış yap | `/login`'e yönlendirme |
| 2 | Çıkış sonrası geri tuşuna bas | `/login`'de kal |

---

## BÖLÜM 2 — DASHBOARD

### 2.1 Board Listeleme
| # | Adım | Beklenen |
|---|------|----------|
| 1 | Dashboard aç | Kendi board'ların görünüyor |
| 2 | B hesabına board paylaşıldıktan sonra B'nin dashboard'unu yenile | Paylaşılan board listede çıkıyor |
| 3 | B hesabında paylaşılan board'da çöp kutusu var mı? | **Yok olmalı** |

### 2.2 Board Oluşturma
| # | Adım | Beklenen |
|---|------|----------|
| 1 | "Yeni Pano" → isim gir → Oluştur | Board anında listede (optimistic) |
| 2 | Sadece boşluk ile oluştur | Submit edilmemeli |

### 2.3 Board Silme
| # | Adım | Beklenen |
|---|------|----------|
| 1 | Çöp kutusuna tıkla | "Sil / İptal" inline görünmeli, popup çıkmamalı |
| 2 | "Sil" tıkla | Board listeden kalkıyor |
| 3 | "İptal" tıkla | Hiçbir şey olmaz |
| 4 | Board'u sil, ardından URL'ine git | `/dashboard`'a yönlendirme (404 değil) |

---

## BÖLÜM 3 — BOARD GÖRÜNÜMÜ

### 3.1 Sütun İşlemleri
| # | Adım | Beklenen |
|---|------|----------|
| 1 | Sütun ekle | Sütun anında görünüyor |
| 2 | Sütun çöp kutusuna tıkla | "Sil / İptal" inline görünmeli |
| 3 | İçinde kart varken sütun sil | Sütun + tüm kartlar siliniyor |
| 4 | Silmeyi iptal et | Hiçbir şey olmaz |

### 3.2 Kart İşlemleri
| # | Adım | Beklenen |
|---|------|----------|
| 1 | Kart ekle | Kart sütuna ekleniyor |
| 2 | Karta tıkla | Detail dialog açılıyor |
| 3 | Başlık değiştir (500ms bekle) | Otomatik kaydediliyor |
| 4 | Açıklama yaz | Otomatik kaydediliyor |
| 5 | Öncelik değiştir | Anında kaydediliyor |
| 6 | "Kartı sil" → onayla | Dialog kapanıyor, kart kalkıyor |
| 7 | Sayfayı yenile | Tüm değişiklikler kalıcı |

### 3.3 Sürükle & Bırak
| # | Adım | Beklenen |
|---|------|----------|
| 1 | Kartı aynı sütunda sürükle | Sıra değişiyor, DB'ye kaydediliyor |
| 2 | Kartı farklı sütuna taşı | Kart o sütuna geçiyor |
| 3 | Sayfayı yenile | Pozisyonlar korunuyor |
| 4 | Kartı sütun dışına bırak | Board yeniden yükleniyor, kart eski yerde |
| 5 | Hızlı 5-6 sürükleme | Doğru sıralanıyor, crash yok |

---

## BÖLÜM 4 — YORUMLAR

| # | Adım | Beklenen |
|---|------|----------|
| 1 | Yorum yaz → Gönder | Anında görünüyor, isim doğru |
| 2 | Kendi yorumunda "Sil" var mı? | Evet |
| 3 | Kendi yorumunu sil | Yorum kalkıyor |
| 4 | B hesabıyla aynı karta yorum at, A'da yenile | B'nin yorumu görünüyor, ismi doğru |
| 5 | A hesabından B'nin yorumunu silmeye çalış | "Sil" butonu **görünmemeli** |
| 6 | Boş yorum gönder | Gönderilmemeli |

---

## BÖLÜM 5 — PAYLAŞIM SİSTEMİ

### 5.1 Paylaşma
| # | Adım | Beklenen |
|---|------|----------|
| 1 | "Paylaş" → var olmayan email | "Kayıtlı kullanıcı bulunamadı" |
| 2 | B'nin emailini gir → Paylaş | Üye listesine ekleniyor |
| 3 | Aynı emaili tekrar ekle | Hata (unique constraint) |
| 4 | B hesabıyla board'u aç | Board + sütunlar + kartlar görünüyor |

### 5.2 Üye (Visitor) Kısıtlamaları
| # | Adım | Beklenen |
|---|------|----------|
| 1 | B hesabında "Paylaş" butonu | **Yok olmalı** |
| 2 | B hesabında sütun ekleme butonu | **Yok olmalı** |
| 3 | B hesabında karta tıkla | Dialog açılıyor ama alanlar read-only |
| 4 | B hesabında kartı sürüklemeye çalış | **Sürüklenemiyor** |
| 5 | B hesabında sütun/kart silme ikonları | **Yok olmalı** |
| 6 | B hesabında yorum yazabilir mi? | **Evet olmalı**, form görünmeli |

### 5.3 Paylaşımı Geri Çekme
| # | Adım | Beklenen |
|---|------|----------|
| 1 | "Paylaş" modalında üye listesinde B var mı? | Evet |
| 2 | B'nin yanındaki X'e tıkla | Listeden kalkıyor |
| 3 | B hesabıyla board URL'ine git | 404 / erişim reddediliyor |
| 4 | B hesabında dashboard yenile | Board artık listede yok |

---

## BÖLÜM 6 — PROFİL

| # | Adım | Beklenen |
|---|------|----------|
| 1 | "Profilim"e git | Ad soyad ve bio görünüyor |
| 2 | Ad soyadı değiştir → Kaydet | Başarı toast |
| 3 | Sayfayı yenile | Yeni isim korunuyor |
| 4 | Dashboard'a dön | Header'da yeni isim görünüyor |
| 5 | Karta yorum at | Yorumda güncel isim var |

---

## BÖLÜM 7 — GÜVENLİK & RLS

| # | Adım | Beklenen |
|---|------|----------|
| 1 | Başka kullanıcının board ID'sini URL'ye yaz | 404 |
| 2 | Üye olmadığın private board URL'ine git | 404 |
| 3 | Giriş yapmadan board URL'ine git | `/login`'e yönlendirme |

---

## BÖLÜM 8 — EDGE CASE'LER

| # | Adım | Beklenen |
|---|------|----------|
| 1 | Silinmiş board URL'ine git | `/dashboard`'a redirect |
| 2 | Çok uzun başlıklı kart oluştur | UI bozulmuyor |
| 3 | Boş başlıklı sütun ekle | Submit edilmemeli |
| 4 | 10+ sütun oluştur | Yatay scroll çalışıyor |
| 5 | Bir sütuna 20+ kart ekle | Dikey scroll çalışıyor |
| 6 | İki ayrı sekmede farklı board'lar aç | Birbirini etkilemiyor |

---

## KRİTİK YOL (Önce bunları test et)

1. **Tam akış:** Signup → Login → Board → Sütun → Kart → Sürükle → Düzenle → Yorum → Sil → Logout
2. **Paylaşım akışı:** A paylaşır → B görür → B yorumlar → A paylaşımı çeker → B erişemez
3. **Silme akışı:** Kart sil → Sütun sil (içinde kart varken) → Board sil → URL ile erişmeye çalış

---

## NOTLAR (Test sırasında doldur)

| Bölüm | Test # | Sonuç | Not |
|-------|--------|-------|-----|
| | | | |
